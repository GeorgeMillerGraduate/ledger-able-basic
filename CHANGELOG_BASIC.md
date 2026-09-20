# Basic features changelog

Added Contacts, Invoices and manual Banking within the existing green workspace.

- Added `app/basic-modules.tsx` and responsive/print styles; enabled existing navigation.
- Added authenticated `/api/basic`, transactional `server/basic-service.mjs`, exact money and CSV helpers.
- Extended the existing Drizzle schema and added additive migration `0001_absent_warbound.sql` with ownership backfill, history, matching constraints and foreign keys.
- Added CSV validation/money tests and disposable-MariaDB workflow tests. Extended existing production API security tests to cover the new endpoint.
- Removed the 250-entry read cap from `/api/data`, which previously truncated reports.
- Corrected npm lockfile dependency consistency; no new application dependency was added.
- Preserved Google OAuth/session code and the existing Node/MySQL deployment architecture.

Deployment, migration, environment variables and known Basic limits: `BASIC_UPGRADE.md`.
