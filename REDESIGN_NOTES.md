# Ledger-able redesign

This is the existing iFastNet application with a redesigned interface, not a replacement application.

## Included
- Official supplied artwork used in a cropped SVG viewport: book/chart and Ledger-able wordmark only. No tagline or extra promotional icons. Original colours and proportions preserved.
- Shared logo component, matching book favicon, fresh green/light visual system, accessible dark text on bright green actions.
- Refined welcome/sign-in, business setup, sidebar, dashboard, records, tax estimate, reports, settings and existing unfinished sections.
- Monthly income/expense chart derived from transaction dates, readable tooltips, legend and text alternative.
- Global record search, table filtering, date/amount sorting and pagination. Narrow screens show labelled transaction cards.
- Clear forms, saving states, inline network/server errors, cancel controls, mobile menu focus handling, reduced-motion support and print styling.
- Reports include numerical income, expense and profit totals and browser Print / Save PDF.
- Honest all-recorded-dates labels; no fabricated monthly changes, dates, balances, tax progress or invoice functionality.

## Existing scope preserved
Sales/expense entry, account creation, saved business records, totals and basic tax estimates remain the current functional scope. Invoices, contacts and banking are existing unfinished modules and are marked Coming soon. Profile settings remain read-only. No advanced accounting features or new database tables were introduced.

20 original backend/deployment files were compared byte-for-byte with the uploaded ZIP and are unchanged, including API handlers, authentication/session logic, MySQL configuration/schema/migrations, Node entry point and deployment scripts. Dependencies and the lockfile are unchanged. Existing session cookie identifiers intentionally remain unchanged to preserve authentication.

## Validation
- TypeScript, ESLint, production build and all 3 existing production/security tests pass.
- Chromium checked all main navigation sections, the entry dialog, welcome view, empty records, desktop and 390px phone layout. No browser runtime errors; no phone page overflow. Mobile menu Escape handling passed.
- Browser UI verification used isolated temporary fixture records; those fixtures and their preview harness are NOT shipped and no sample transactions are added to the application.
- Live Google account sign-in, successful MySQL writes and actual cPanel Passenger hosting require the account's environment and were not exercised here. Local runtime: Node 24; existing Node >=22.13 requirement is retained.

## Update your existing deployment
Use IFASTNET_DEPLOYMENT.md for the existing hosting procedure. Keep your current .env/environment variables and database. This redesign requires no database migration. The archive includes source and rebuilt dist output, with no node_modules or secrets. Install from the existing lockfile and rebuild on the host using the existing procedure if needed, then restart the cPanel Node application. Do not overwrite your live secrets with .env.example.
