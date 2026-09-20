# Verification performed

Environment: Node 24.19.0 on Linux; isolated MariaDB 10.11.7; Chromium headless. No live iFastNet database, user credentials or Google account were used.

Passed:

- Production Vinext build, TypeScript typecheck and ESLint.
- npm lockfile consistency (`npm ci --dry-run`).
- Drizzle schema generation check: no remaining schema changes.
- Both database migrations against a fresh database, including a database whose default collation differs from the application tables; second migration run safely does nothing.
- Database check: all 13 application tables present.
- 33 automated tests with database integration enabled; no failures or skipped tests in that run.
- Existing OAuth/session tests, including successful simulated Google login, returning identity, PKCE/state/nonce failures and secure cookies.
- Existing production-server tests plus new API unauthenticated/origin checks.
- Exact invoice arithmetic, invalid/oversized values, invalid dates, CSV quoting/newlines/BOM/split columns and row-specific errors.
- Real MariaDB contact creation/editing and reread; invoice creation/editing, multiple lines, sending and concurrent/retried payment; exactly one linked Sale.
- Real MariaDB CSV preview/import, repeat-import rejection, explicit duplicate skipping, matching a Sale, creating an Expense, transfers, reconciliation and reread.
- Ownership isolation across two users/businesses for contact edits, invoice access, bank access and processing.
- Invalid CSV import leaves no partially imported records; protected paid/reconciled records reject changes; opening balance locks after imports; archival and audit history.
- Browser production workflow: create/edit/reload/view Contact; create a two-line Invoice, mark sent/paid; add Account; upload/map/preview/import CSV; match the invoice Sale and reconcile.
- Mobile browser checks at 390 × 844: banking page has no document overflow; contact dialog fits viewport; menu navigation works. Tables scroll within their containers.
- Invoice print-to-PDF: generated A4 PDF, extracted and checked its text, rendered and visually inspected. Fixed a dialog-positioning clipping defect found by this check.
- Authentication and startup preservation: nine authentication/config/startup files verified byte-identical to the attached ZIP.
- Browser bundle secret checks pass. Delivery excludes local credentials, test database, node_modules and test-browser binaries.

`npm test` without `LEDGER_TEST_DATABASE=disposable` deliberately skips the real-database workflow test. The production authentication tests use mocks for Google's identity provider; they do not contact a real Google account. Final Google login and Passenger restart should still be checked on your own hosting after deployment.

## Reproduce the optional browser workflow

On a development machine with an already migrated **disposable** MySQL database and its DB environment variables, install optional browser-test tooling (not a production dependency):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
LEDGER_TEST_DATABASE=disposable node tests/browser-workflow.mjs
```

The script starts the existing production app on localhost:3000, seeds a test session in the disposable database, exercises real forms and saves screenshots/PDF under `tmp/browser-check`. Port 3000 must be free. Build first. Do not run against production. Browser screenshots are captured separately from the 33 Node tests. The delivered script uses standard Playwright Chromium; the local verification used an equivalent separately installed headless Chromium binary because the standard download endpoint was unavailable.
