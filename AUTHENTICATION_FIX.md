# Ledger-able Google authentication repair

## Findings

The uploaded project had two confirmed authentication integration problems:

- Both Google entry points in `app/welcome.tsx` used Next Link. That invokes Vinext client navigation/prefetch rather than a document navigation. OAuth initiation has side effects (rotating state cookies) and redirects off-site; it must not run as an RSC/prefetch request. This also made sign-in depend on the reported failing Link bundle.
- Both `app/server-config.ts` and `server/start.mjs` rejected HTTP whenever NODE_ENV was production. A local production build still needs `http://localhost:3000`. The only supplied environment example also pointed to production; using it unchanged locally gives a production callback and Secure cookies, not a local OAuth flow.

The original pinned Vinext 1.0.0-beta.5 cookie implementation was inspected and its production HTTP test was run before changes. It emitted all three separate Set-Cookie headers successfully. There is **no evidence that NextResponse.cookies itself dropped cookies**. A missing/mismatched state in the user's browser cannot be uniquely reconstructed from this archive without that browser's network trace and deployed environment. The former single `invalid_oauth_state` branch also covered missing code, nonce and verifier, hiding which condition failed.

The replacement uses native Response/Headers with individual Set-Cookie fields, browser anchors for both Google links, explicit no-store headers, prefetch rejection, and stage-specific safe diagnostics. APP_URL is shared between startup and routes. HTTP is permitted only for `http://localhost:3000`, including production builds; HTTPS gets Secure cookies. Host/forwarded headers never choose an OAuth redirect URI.

## Security and persistence

State and nonce use secure random values and constant-time comparison. PKCE uses S256. Google ID tokens are verified against Google's JWKS with RS256, issuer, audience, required expiry/issued-at/subject/nonce claims, nonce comparison, verified email and authorized-party checks. The token exchange has a timeout and does not follow redirects.

The Google subject remains the identity key. Existing users are updated; new users and identities are created in the existing Drizzle/MySQL transaction. No email-only account linking is introduced. The same transaction checks business ownership, rotates an existing browser session, and inserts a hashed random session token. Success redirects to `/setup` or `/dashboard`. Temporary cookies expire after 10 minutes and are cleared on every callback response. Sessions retain the existing 30-day lifetime, HttpOnly, SameSite=Lax and host-only Path=/ cookies. Sign-out revokes the database session, clears cookies, and rejects speculative/cross-site requests.

Logs contain a fixed event and a random correlation ID only. Events distinguish missing state/state cookie, state mismatch, missing nonce/verifier/code, denied access, token exchange, ID token verification, nonce mismatch, unverified email, invalid identity/authorized party, database failure, session creation failure and session revocation failure. No provider response bodies, exceptions, SQL, codes, tokens, verifier values or secrets are logged.

No schema migrations or accounting/UI redesigns were made. Existing accounting logic, forms, styling, branding, assets and database schema remain unchanged.

## Required environment

For local testing, copy `.env.example` to `.env` and fill in your own values:

- `APP_URL=http://localhost:3000`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: your Google Web application credentials.
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: a reachable MySQL/MariaDB database.
- `DB_PORT`: defaults to 3306; `DB_POOL_SIZE`: defaults to 5.
- `NODE_ENV=production` is suitable for testing a production build locally.

For cPanel/Passenger, set `APP_URL=https://ledger-able.com`, `NODE_ENV=production`, your production Google credentials and database values in the application environment. `.env.production.example` lists the production template; it is not loaded automatically. Keep `app.js` as the Passenger startup file and restart the application after replacing the project/build or changing environment settings.

Do not copy a production APP_URL into local settings. Use `localhost`, not `127.0.0.1`, in your local browser. Existing process variables take priority over `.env`; remove conflicting APP_URL/Google settings in your terminal or cPanel. For the direct Vinext CLI, also check for old `.env.local` or `.env.production` files that could override your intended settings.

## Google Cloud Console

Use an OAuth client of type **Web application**. Register these exact authorized redirect URIs:

```text
http://localhost:3000/api/auth/google/callback
https://ledger-able.com/api/auth/google/callback
```

Do not add a trailing slash. This server-side flow does not require the browser Google JavaScript SDK. If the consent screen is in Testing, add your Google account as a test user. Both deployments must use the matching client ID/secret, with both redirect URIs registered for that client.

## Windows Command Prompt

Extract the ZIP into `%USERPROFILE%\Downloads\Ledger-able-Google-Auth-Fixed`. The source files should be directly inside that folder, including package.json. Use Node.js 22.13 or later (verified with 22.22.0).

```bat
cd /d "%USERPROFILE%\Downloads\Ledger-able-Google-Auth-Fixed"
copy .env.example .env
notepad .env
```

Save your real Google and database settings in `.env`, then:

```bat
pnpm install --frozen-lockfile
pnpm db:check
pnpm typecheck
pnpm build
pnpm test
pnpm exec vinext start
```

Open `http://localhost:3000`. If pnpm is not installed, run `npm install -g pnpm@11.25.0` first. If using a new empty database, run `pnpm db:migrate` before sign-in; an existing migrated database needs no authentication schema changes. Do not run migrations against an unrelated database.

`pnpm start` (which runs `node app.js`) is also supported locally and uses the same entry point as Passenger. Stop the first server with Ctrl+C before starting the other.

Delete stale cookies for the app once, or use a fresh private window. Click Continue with Google once and complete that flow in the same browser. In Network, the initial response must have three separate Set-Cookie headers. After returning successfully, the temporary cookies are intentionally deleted and `ja_session` remains. Opening two login attempts at once replaces the first attempt's temporary state; finish the newest attempt.

## Changed files

- `app/api/auth/google/route.ts`: native redirect/cookies, prefetch guard, configuration diagnostics.
- `app/api/auth/google/callback/route.ts`: complete validation, staged diagnostics, transactional user/identity/session flow and native cookie response.
- `app/api/auth/signout/route.ts`: native cookie cleanup and safe revocation errors.
- `app/auth-http.ts` (new): shared native response/cookie helpers and safe diagnostics.
- `app/auth.ts`: shared session lifetime; existing session reads and business authorization preserved.
- `app/server-config.ts`, `server/origin.mjs` (new), `server/start.mjs`: one canonical origin validator, local production-build support, no-referrer policy.
- `app/welcome.tsx`: only the two sign-in entry points changed to native anchors; appearance unchanged.
- `.env.example`, `.env.production.example` (new), `.gitignore`: separate local/production templates with placeholders only.
- `package.json`, `tests/auth.test.mjs` (new), `tests/production.test.mjs`: security and runtime regression tests.
- `AUTHENTICATION_FIX.md` (new), `README.md`: setup and verification documentation.

`app.js`, Vite configuration, dependency versions/lockfile, Drizzle schema/migrations, database configuration and all accounting components remain unchanged.

## Verification

- Frozen-lockfile dependency installation completed.
- TypeScript type-check and production build completed on Node 22.22.0.
- Production build includes `/api/auth/google`, `/api/auth/google/callback`, `/api/auth/signout` and all existing application routes.
- 27 automated tests pass on Node 22.22.0: actual HTTP responses from the Passenger-style app.js entry point under both origin configurations and the direct `vinext start` CLI locally, authentication success/failure paths, signed JWT security cases, cookie attributes, hashed sessions, transaction rollback with a simulated database, existing API protection and absence of server credentials in browser bundles.
- Unit callback tests use real RSA signing/signature verification with local test keys, a simulated Google token response and a simulated database. They do not claim a live Google or real MySQL login.

A final live Google sign-in and live database write require your private credentials and database. No live Google account, production database, Apache or Passenger installation was available for an end-to-end deployment test. No secrets are included in this archive. The freshly verified Node 22 production build is included in `dist/`; node_modules is omitted. Install dependencies and rebuild after extraction as shown above. Browser automation could not run because the Chromium download endpoint failed; browser cookie retention and live Google login still require the manual check above.
