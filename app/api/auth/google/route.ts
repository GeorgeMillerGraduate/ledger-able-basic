import { appOrigin } from "@/app/server-config";
import { codeChallenge, randomToken } from "@/app/auth";
import { authDiagnostic, authRedirect, setAuthCookie } from "@/app/auth-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = appOrigin();
  // OAuth is a document navigation. A speculative/RSC request must never rotate
  // a browser's in-flight state or attempt to fetch Google as an RSC resource.
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch") ||
      /prefetch/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`)) {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    authDiagnostic("google_not_configured", crypto.randomUUID());
    return authRedirect(new URL("/?auth_error=google_not_configured", origin));
  }
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code", scope: "openid email profile", state, nonce,
    code_challenge: await codeChallenge(verifier), code_challenge_method: "S256",
    prompt: "select_account",
  });
  const response = authRedirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  setAuthCookie(response, "ja_oauth_state", state, origin, 600);
  setAuthCookie(response, "ja_oauth_nonce", nonce, origin, 600);
  setAuthCookie(response, "ja_oauth_verifier", verifier, origin, 600);
  return response;
}
