# Hosting conversion report

## Result

The supplied project has been modified in place to run its existing Vinext/Vite application on Node.js with MySQL/MariaDB. All original UI component, layout, dashboard, setup form, welcome and stylesheet files remain byte-identical. The homepage server component changes only how it reads Google configuration. Original Jenga Accounts branding is retained.

## Architecture and database

- `app.js` dynamically imports `server/start.mjs`, which starts Vinext's actual production HTTP server inside Passenger's process. There is no dummy response or background Wrangler process. Node 22.23.2 can load this startup file via `require()`, as tested.
- The server honors `PORT`, serves the root app and production assets, and uses a configured canonical `APP_URL` behind Passenger. Existing routes are retained.
- Removed the Cloudflare Vite plugin, Workers type dependency, Wrangler scripts, D1 examples, Sites hosting metadata/build plugin and obsolete environment/install scripts. The locked installed graph no longer includes Workers types, Wrangler, Miniflare or workerd. Drizzle's upstream optional-peer metadata still mentions Workers types; Vinext's upstream code still supports other deployment platforms. Neither is a dependency on the Workers runtime in this application.
- Replaced every application D1 query with Drizzle MySQL operations through mysql2's bounded connection pool. No D1-compatible shim or renamed binding is used.
- Replaced all SQLite schema/migrations with a generated MySQL baseline and metadata, using InnoDB and utf8mb4_bin. It retains all eight tables, IDs, session hashes, ISO UTC timestamps, indexes and the shape of API responses.
- Money uses DECIMAL(15,2), the tax estimate rate DECIMAL(6,5), VAT registration BOOLEAN, and entry kind ENUM. Bounded VARCHAR columns replace indexed SQLite TEXT. Dates remain validated YYYY-MM-DD strings to preserve existing UI/API values.
- One business per user is enforced with a unique owner index, matching the existing single-business flow. The unique Google provider/subject constraint is retained.
- OAuth identity creation, user update/creation and session insertion are transactional. No automatic email-based account linking was added. Concurrent first-time identity creation can cause one callback to fail safely; retrying signs into the committed account.
- Session expiry, hashed tokens, secure HTTP-only cookies, nonce, state, PKCE and Google JWT verification remain. Entry reads require both the authenticated user's ID and their owned business ID; clients cannot select another owner via request fields.
- Added validation for calendar dates, field lengths, finite decimal amounts and malformed JSON. Database errors are not serialized into API responses. The client bundle scan found no database password/OAuth-secret environment references.

## Verified commands

Final runtime: **Node v22.23.2**, package manager **pnpm 11.25.0**, Linux.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed with the final lockfile; full dependencies installed. A scratch store path was supplied for this environment. Deployment guide adds `--prod=false` for Production-mode shells. |
| `pnpm run db:generate` | Generated the MySQL baseline successfully; subsequent run found no schema changes. |
| `pnpm run build` | Passed: all five Vinext build phases, three pages and five API routes. |
| `pnpm run typecheck` | Passed, no TypeScript errors. |
| `pnpm run lint` | Passed, no ESLint errors. |
| `pnpm test` | Passed all three tests, including the multi-assertion production HTTP smoke test. |
| `pnpm start` | Started the actual server with production settings and an explicit non-default port. |

The smoke test also launches `require('./app.js')` with `PORT=0`, confirms HTTP 200 for the homepage, built CSS/JS and favicon, checks the dashboard redirect and unauthenticated API rejection, checks cross-origin writes are forbidden, and verifies Google's exact HTTPS callback, state/nonce/PKCE and secure cookies. Invalid callback state is rejected. A database-unavailable request produces a generic 500. `.env`, package and source paths return 404. The tests use synthetic credentials, never real secrets.

`db:check` and `db:migrate` were additionally executed against a deliberately unreachable local endpoint: both exited 1 with safe messages and no password leakage. These are **failure-path tests**, not successful database execution.

## Not verified here / configuration you must finish

- Actual iFastNet cPanel/Passenger process registration, virtual-environment modules symlink behavior, domain routing, TLS and resource limits: no account access was supplied.
- Successful connection, SQL migration execution, database writes, transactional rollback, two-account data isolation against real rows and persistence across process restarts: no live MySQL/MariaDB server or account credentials were available. A local database installation was unavailable in this environment. The deployment guide includes explicit verification steps.
- Live Google consent/token/certificate exchange and a real sign-in: no OAuth credentials were provided. Configure the Web client and callback, then test on the domain.
- Existing D1 data migration: the ZIP contains schema/source only, not a database export. The included migrations create an empty MySQL schema and preserve data on subsequent normal migration runs; they do not import D1 records.
- No end-to-end browser automation was performed; production HTTP behavior was tested and the unchanged UI files were compared to the original ZIP.

The supplied application remains a prototype in several areas: invoice/contact/bank buttons and export/settings-edit controls are placeholders. The existing list limit is 250 entries and dashboard totals use those loaded entries, with existing date labels and JavaScript arithmetic. This hosting conversion preserves those behaviors, and does not claim to make them complete accounting features.

## File inventory

`dist/` is newly generated production output included in the deliverable. Dependencies, local caches, secrets, logs and TypeScript incremental state are excluded. The following lists describe source/configuration changes relative to the uploaded ZIP.

### Modified

- `.gitignore`
- `README.md`
- `app/api/auth/google/callback/route.ts`
- `app/api/auth/google/route.ts`
- `app/api/auth/signout/route.ts`
- `app/api/business/route.ts`
- `app/api/data/route.ts`
- `app/auth.ts`
- `app/page.tsx`
- `db/index.ts`
- `db/schema.ts`
- `drizzle.config.ts`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `vite.config.ts`

### Added

- `.env.example`
- `CONVERSION_REPORT.md`
- `IFASTNET_DEPLOYMENT.md`
- `app.js`
- `app/api-utils.ts`
- `app/server-config.ts`
- `db/pool.mjs`
- `drizzle/0000_conscious_xavin.sql`
- `next-env.d.ts`
- `scripts/db-check.mjs`
- `scripts/migrate.mjs`
- `server/start.mjs`
- `tests/production.test.mjs`

### Removed/replaced

- `.openai/hosting.json`
- `build/sites-vite-plugin.LICENSE`
- `build/sites-vite-plugin.ts`
- `cloudflare-env.d.ts`
- `drizzle/0000_smiling_starbolt.sql`
- `drizzle/0001_chilly_loa.sql`
- `drizzle/meta/0001_snapshot.json`
- `examples/d1/app/api/notes/route.ts`
- `examples/d1/db/schema.ts`
- `scripts/build-verified.sh`
- `scripts/execution-profile.mjs`
- `scripts/install-ci.mjs`
- `scripts/install-ci.sh`
- `scripts/install-pnpm.sh`
- `scripts/pnpm-install.mjs`
- `scripts/run-framework.mjs`
- `scripts/sites-env.mjs`
- `scripts/sites-env.sh`

81 original source/configuration/assets were unchanged.
