import "server-only";
import { timingSafeEqual } from "node:crypto";

export const oauthCookies = ["ja_oauth_state", "ja_oauth_nonce", "ja_oauth_verifier"] as const;

// Native Response headers survive the Vinext -> Node response bridge. Append each
// cookie separately: comma-joining Set-Cookie is not a valid substitute.
export function authRedirect(target: string | URL, status = 303) {
  return new Response(null, { status, headers: {
    Location: String(target), "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache", "Referrer-Policy": "no-referrer",
  } });
}

export function setAuthCookie(response: Response, name: string, value: string, origin: string, maxAge: number) {
  if (!/^[a-z_]+$/.test(name) || !/^[A-Za-z0-9_-]*$/.test(value)) throw new Error("Invalid auth cookie");
  response.headers.append("Set-Cookie", `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${origin.startsWith("https:") ? "; Secure" : ""}`);
}

export function clearOAuthCookies(response: Response, origin: string) {
  for (const name of oauthCookies) setAuthCookie(response, name, "", origin, 0);
  return response;
}

export function readAuthCookie(request: Request, name: string) {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  // Reject ambiguous duplicate cookies, malformed values and oversized inputs.
  if (values.length !== 1) return undefined;
  const value = values[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{1,256}$/.test(value) ? value : undefined;
}

export function equalToken(actual: string, expected: string) {
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Only fixed event names and a generated correlation ID are logged. Never pass
// provider bodies, request URLs, error objects, SQL, cookies or token values here.
export function authDiagnostic(event: string, requestId: string) {
  console.error(JSON.stringify({ component: "google-auth", event, requestId }));
}
