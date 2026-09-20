import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { users, authIdentities, sessions, businesses } from "@/db/schema";
import { appOrigin } from "@/app/server-config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { sha256, randomToken, sessionCookie } from "@/app/auth";
import { authDiagnostic, authRedirect, clearOAuthCookies, equalToken, readAuthCookie, setAuthCookie } from "@/app/auth-http";

export const dynamic = "force-dynamic";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), { timeoutDuration: 10000 });

export async function GET(request: Request) {
  const origin = appOrigin();
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();
  const fail = (event: string) => {
    authDiagnostic(event, requestId);
    return clearOAuthCookies(authRedirect(new URL(`/?auth_error=${event}`, origin)), origin);
  };
  const state = url.searchParams.get("state");
  const expectedState = readAuthCookie(request, "ja_oauth_state");
  const nonce = readAuthCookie(request, "ja_oauth_nonce");
  const verifier = readAuthCookie(request, "ja_oauth_verifier");
  if (!state) return fail("missing_state");
  if (!expectedState) return fail("missing_state_cookie");
  if (!equalToken(state, expectedState)) return fail("state_mismatch");
  if (!nonce) return fail("missing_nonce");
  if (!verifier) return fail("missing_pkce_verifier");
  // Validate state even when Google reports cancellation. Never echo its message.
  if (url.searchParams.has("error")) return fail("access_denied");
  const code = url.searchParams.get("code");
  if (!code) return fail("missing_authorization_code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_not_configured");

  let stage = "token_exchange_failed";
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code", code_verifier: verifier,
      }),
    });
    if (!tokenResponse.ok) return fail(stage);
    const tokens: unknown = await tokenResponse.json();
    if (!tokens || typeof tokens !== "object" || !("id_token" in tokens) || typeof tokens.id_token !== "string") {
      return fail("missing_identity_token");
    }
    stage = "id_token_verification_failed";
    const { payload } = await jwtVerify(tokens.id_token, jwks, {
      algorithms: ["RS256"], issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId, requiredClaims: ["iss", "aud", "sub", "exp", "iat", "nonce"],
      clockTolerance: 5,
    });
    if (typeof payload.nonce !== "string" || !equalToken(payload.nonce, nonce)) return fail("nonce_mismatch");
    if (!payload.sub || payload.sub.length > 255 || typeof payload.email !== "string" ||
        !payload.email || payload.email.length > 255) return fail("invalid_identity");
    if (payload.email_verified !== true) return fail("email_not_verified");
    if ((payload.azp !== undefined && payload.azp !== clientId) ||
        (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId)) return fail("invalid_authorized_party");

    const now = new Date().toISOString();
    const email = payload.email;
    const subject = payload.sub;
    const name = (typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email).slice(0, 255);
    const picture = typeof payload.picture === "string" ? payload.picture : null;
    const sessionToken = randomToken(48);
    const tokenHash = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + sessionCookie.maxAge * 1000).toISOString();
    stage = "database_failed";
    // Subject, not email, is the identity key. Do not silently link accounts on
    // email equality. User, identity and session changes commit atomically.
    const business = await getDb().transaction(async tx => {
      const [identity] = await tx.select().from(authIdentities)
        .where(and(eq(authIdentities.provider, "google"), eq(authIdentities.providerSubject, subject))).limit(1);
      const id = identity?.userId ?? crypto.randomUUID();
      if (identity) {
        const [existingUser] = await tx.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
        if (!existingUser) throw new Error("Orphaned identity");
        await tx.update(users).set({ email, name, pictureUrl: picture, updatedAt: now }).where(eq(users.id, id));
      } else {
        await tx.insert(users).values({ id, email, name, pictureUrl: picture, createdAt: now, updatedAt: now });
        await tx.insert(authIdentities).values({ id: crypto.randomUUID(), userId: id, provider: "google", providerSubject: subject, createdAt: now });
      }
      const [ownedBusiness] = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, id)).limit(1);
      stage = "session_creation_failed";
      // Rotate the browser's old session only as part of a successful transaction.
      const oldToken = readAuthCookie(request, sessionCookie.name);
      if (oldToken) await tx.delete(sessions).where(eq(sessions.tokenHash, await sha256(oldToken)));
      await tx.insert(sessions).values({ tokenHash, userId: id, expiresAt, createdAt: now });
      stage = "database_failed"; // A transaction commit failure is a database error.
      return ownedBusiness;
    });
    const response = authRedirect(new URL(business ? "/dashboard" : "/setup", origin));
    setAuthCookie(response, sessionCookie.name, sessionToken, origin, sessionCookie.maxAge);
    return clearOAuthCookies(response, origin);
  } catch {
    return fail(stage);
  }
}
