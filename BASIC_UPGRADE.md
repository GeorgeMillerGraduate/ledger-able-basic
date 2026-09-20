# Ledger-able Basic upgrade — existing iFastNet installation

This is an update to the attached working application. Keep the current application root, domain, Node application, MySQL database and Google OAuth credentials. Do not create a replacement Google login or database.

## What changes

- Contacts: persistent customer/supplier details, addresses, notes, search, filters, detail view, editing, archival and restore.
- Invoices: customer selection, multiple lines, exact server-calculated net/VAT/gross totals, draft editing/deletion, sent/paid/cancelled states, derived overdue status and printable PDF view. Issued invoices retain their customer snapshot. “Mark sent” records status; it does not send email.
- Payment: one full payment per invoice, with date and a linked Sale. Retried or concurrent payment requests cannot create duplicate Sales. Paid invoices and their payment dates cannot be changed in Basic.
- Banking: manual GBP accounts, opening balances, CSV file preview, column mapping, server validation, explicit duplicate review, classification, creating or matching Sales/Expenses and reconciliation. Archival retains history and can be reversed.
- Book balance = opening balance + all imported transactions. Transfers and personal items remain in the bank balance, but do not become income/expenses. This is not a live bank balance.
- New operations use the existing MySQL connection pool, authenticated ownership, transactions, foreign keys, unique payment/matching constraints and an audit table.
- Existing Sales/Expenses no longer stop loading after 250 records, so reports include older records too.
- Existing authentication routes, framework, Google callback configuration and startup architecture are retained.

## Deploy to your existing cPanel application

1. Stop the application in **Setup Node.js App** during the update. Export the **existing database in phpMyAdmin** (SQL format, structure and data) and save a copy of the existing application folder. A source ZIP is not a backup of your accounting records.
2. Extract this ZIP into your **existing application root**, where `app.js` and `package.json` already live. Overwrite application source, `dist`, `drizzle`, scripts and package files. Preserve your real `.env`, cPanel environment variables and Passenger/domain configuration. The ZIP has no credentials or database dump and deliberately excludes `node_modules`.
3. Open cPanel Terminal and use the **activation command shown by your existing Node.js application's screen**, then `cd` to its application root. Continue using Node 22.13+ (your existing Node 22 setup is supported); do not change the startup file from `app.js`.
4. Install from the corrected npm lockfile:

   ```sh
   npm ci
   ```

   Alternatively, if you already use the project's pinned pnpm setup, use `pnpm install --frozen-lockfile`. Use one package manager for the installation.
5. In that same activated environment, run:

   ```sh
   npm run db:migrate
   npm run db:check
   npm run typecheck
   npm run build
   npm test
   ```

   `db:migrate` uses your existing Drizzle migration history. It applies the additive `0001_absent_warbound` migration once; it must NOT replay `0000` on a populated database. The scripts load `.env` if present. If cPanel's Terminal does not inherit the app's variables, use a private `.env` in the application root with your existing real settings. Never put it in `public_html` or GitHub.
6. Restart the application in cPanel. Sign in using the existing Google button. Refresh the browser fully to load the new assets. No Google OAuth callback change is needed.
7. Verify on your hosting: create/edit/reload a contact; create a two-line draft, mark sent and paid, check one Sale; import a small statement, match its payment to that Sale, reconcile and reload. Test a repeated import and explicitly skip duplicates. Print an invoice using your browser's “Save as PDF”.

**No new production environment variables are required.** Continue using existing `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional `DB_POOL_SIZE`, and `NODE_ENV`. Do not use any test values in production.

## Migration details and recovery

The migration extends the existing `contacts` and `invoices` tables, backfills their business ownership through the existing business owner relationship, and adds `invoice_items`, `invoice_payments`, `bank_accounts`, `bank_transactions` and `accounting_audit`. New tables use InnoDB, utf8mb4 and the existing utf8mb4_bin collation. It does not drop existing tables or accounting entries.

Previous placeholder invoice rows, if any, are retained. Their missing line items/contact details cannot be inferred; draft records must be completed before sending. Do not use a legacy incomplete invoice as a final invoice.

If migration fails, keep the app stopped. MySQL DDL is not transactional: **do not simply rerun a partly completed migration or delete migration history**. Restore the complete pre-upgrade database backup and old application together, investigate the failing schema/privilege/collation issue, then retry from that consistent state. If the old database has tables but lacks Drizzle migration history, resolve/baseline that existing history with a database administrator before upgrading; do not run the initial CREATE TABLE migration over those tables.

## Accounting behaviour and limits

- Invoice values are GBP. Unit prices have 2 decimal places, quantities up to 3, tax rates up to 2. Net is rounded to pennies per line, then VAT is rounded per line, using integer arithmetic. Total = sum of rounded line net + VAT.
- Paid invoices create gross-amount Sales with VAT recorded separately, matching the existing entry structure. The existing planning reports/tax estimates retain their original meaning; this release is not a VAT return or tax filing system.
- Record an invoice payment through the invoice first, then match its bank transaction to the resulting Sale. Creating a separate Sale for the same payment would record income twice. The app enforces one payment per invoice and one bank match per Sale/Expense.
- Bank “Create sale / expense” uses VAT zero. For VAT-bearing transactions, create the appropriate accounting entry first and match it. Match requires identical amount and direction; you select the correct date/party manually. Partial payments, refunds and split matches are outside this version.
- Bank opening balance means the balance immediately BEFORE all transactions on the opening date. Import complete statements from that date onward; entries before that date are rejected. Once imports exist, opening date/balance are locked.
- CSV supports comma or semicolon separators, quoted cells, escaped quotes, quoted newlines, UTF-8 BOM, UK four-digit-year dates and ISO dates; signed amounts or separate positive money-in/out fields. Maximum 2 MB, 2,000 data rows, 50 columns. Preview and import both validate on the server.
- Duplicate fingerprint uses account, normalized date, exact signed amount and normalized description. Exact-looking legitimate repeats can be kept explicitly. No ambiguous duplicate is silently discarded. Repeated imports cannot proceed without a decision for each candidate.
- Reconciled rows are immutable in Basic. Review carefully before locking. Transfers classify a statement row without automatically creating the other bank account's corresponding row.
- Audit events retain previous/changed record data for new operations; no audit browser or correction workflow is included yet. Existing manually entered Sales/Expenses retain their original behaviour.
- Archiving, rather than financial-record deletion, preserves history. Contacts/accounts can be restored. Draft invoice deletion is audited.
- No Open Banking, email sending, MTD, payroll, inventory, forecasting or multi-currency accounting has been introduced.

## Optional database integration test

Use a separate disposable database, never your live database. Apply migrations to it first, set its DB variables, then run:

```sh
LEDGER_TEST_DATABASE=disposable npm test
```

This adds test users/businesses and accounting records to that database. It does not clean them away automatically. `LEDGER_TEST_DATABASE` is a test-only opt-in; do not add it to cPanel production settings. See `TEST_RESULTS.md` for checks performed during this delivery.
