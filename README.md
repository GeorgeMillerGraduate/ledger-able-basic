> **Contacts, Invoices and Banking update:** start with [BASIC_UPGRADE.md](BASIC_UPGRADE.md) for your existing cPanel installation. See [CHANGELOG_BASIC.md](CHANGELOG_BASIC.md) and [TEST_RESULTS.md](TEST_RESULTS.md). Older setup notes below describe the original conversion.

# Authentication repair

For the corrected Google sign-in setup, Windows commands and verification results, read [AUTHENTICATION_FIX.md](AUTHENTICATION_FIX.md). Use `.env.example` locally and `.env.production.example` as the production settings reference. This guide supersedes the older hosting notes where localhost HTTPS requirements differ.

# Ledger-able / Jenga Accounts

The existing TypeScript/React application, converted from Cloudflare Workers/D1 to **Node 22 + MySQL/MariaDB**, retaining Vinext/Vite and the existing UI.

Start with **[IFASTNET_DEPLOYMENT.md](IFASTNET_DEPLOYMENT.md)** for the full cPanel walkthrough. See **[CONVERSION_REPORT.md](CONVERSION_REPORT.md)** for changes, verification and limitations.

```bash
pnpm install --frozen-lockfile --prod=false
# Copy .env.example to .env and fill in your own server configuration.
pnpm run db:migrate
pnpm run db:check
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm test
pnpm start
```

Production startup: `app.js`. Application URL: `https://ledger-able.com`.
Database data and sessions live in MySQL, independently of the build or application process. No credentials are included.

For local development, use your own local database and `.env`, set `NODE_ENV=development` and `APP_URL=http://localhost:3000`, and run `pnpm dev`. Register a separate localhost callback with Google for local OAuth testing. Production always requires HTTPS.
