import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { appOrigin } from "@/app/server-config";
import { sha256, sessionCookie } from "@/app/auth";
import { authDiagnostic, authRedirect, clearOAuthCookies, readAuthCookie, setAuthCookie } from "@/app/auth-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Retain the existing sign-out link, but reject speculative and cross-site
  // requests so prefetching or third-party embeds cannot log a user out.
  const origin = appOrigin();
  const site = request.headers.get("sec-fetch-site");
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch") ||
      /prefetch/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`) ||
      (site && site !== "same-origin" && site !== "none") ||
      (request.headers.has("origin") && request.headers.get("origin") !== origin)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const token = readAuthCookie(request, sessionCookie.name);
  try {
    if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  } catch {
    authDiagnostic("session_revocation_failed", crypto.randomUUID());
    // Keep the cookie so the user can retry server-side revocation.
    return new Response("Sign-out could not be completed. Please try again.", {
      status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const response = clearOAuthCookies(authRedirect(new URL("/", origin)), origin);
  setAuthCookie(response, sessionCookie.name, "", origin, 0);
  return response;
}
