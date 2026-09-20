# Ledger-able: iFastNet cPanel deployment

This is the existing application converted to Node.js + MySQL/MariaDB. The UI still uses its original **Jenga Accounts** wording: branding, layout and pages have deliberately been preserved. No Cloudflare account, Worker, D1 binding or Wrangler command is needed.

## 1. What you are uploading

The ZIP contains the complete source, locked dependencies, migrations, tests and a tested `dist/` production build. It does not include `node_modules`, credentials or a database dump. You must install dependencies and migrate your database before signing in. `app.js` starts the actual Vinext production HTTP server in Passenger's process; it serves the React pages, API routes and `dist/client` assets.

Use Node **22.23.2** and pnpm **11.25.0**. MySQL 8 or MariaDB 10.6+ with InnoDB and utf8mb4 is the intended database target. The migration SQL was generated and inspected, but a live database was unavailable during conversion. Check the server version with `db:check` and contact iFastNet if your database version is older.

## 2. Prepare your domain and files

1. Log in to **cPanel**. Open **Domains** and confirm `ledger-able.com` belongs to this account and points to the hosting server.
2. Open **SSL/TLS Status** and enable/run AutoSSL if available. Confirm `https://ledger-able.com` has a valid certificate. Enable HTTPS redirection for the domain. Use the non-www URL consistently.
3. Open **File Manager**. Go to your account home, normally `/home/YOUR_CPANEL_USERNAME`, not `public_html`.
4. Create a folder named **ledger-able**. Upload and extract the ZIP there. `app.js` and `package.json` must be directly inside that folder, not inside a second nested folder. Turn on **Show Hidden Files** to see `.env.example`.
5. The final startup path must be `/home/YOUR_CPANEL_USERNAME/ledger-able/app.js`. Keep application source and secrets outside the public document root. Passenger will map the domain to the application.

## 3. Create the database and user

1. Open **MySQL Database Wizard** (or **Manage My Databases / MySQL Databases**, depending on cPanel's theme).
2. Create a database with suffix `ledgerable`. cPanel usually adds your account prefix: for example `youruser_ledgerable`. Record the **complete** name.
3. Create a separate database user, for example suffix `ledgerapp`, with a generated strong password. Record the complete username and password privately.
4. Choose **Add User To Database**, select that user and database, and grant **ALL PRIVILEGES on this database only**. Click **Make Changes / Next Step**. Creating a user alone does not grant database access.
5. In **phpMyAdmin**, select this empty database and use **Operations** to set its default collation to `utf8mb4_bin` if available. The provided tables explicitly use InnoDB, utf8mb4 and this collation as well.
6. Use `localhost` for `DB_HOST` unless iFastNet gives you a different database hostname. Use port `3306` unless told otherwise.

Database-scoped ALL PRIVILEGES makes the initial migration straightforward. If you later separate deployment and application accounts, ordinary app operation needs SELECT, INSERT, UPDATE and DELETE; migrations additionally need schema privileges such as CREATE, ALTER and INDEX. Never grant global server administrator privileges.

## 4. Register the Node application

Open **Software → Setup Node.js App → Create Application**. Enter:

| cPanel field | Value |
| --- | --- |
| Node.js version | `22.23.2` |
| Application mode | `Production` |
| Application root | `ledger-able` (relative to your account home) |
| Application URL: domain | `ledger-able.com` |
| Application URL: path | blank or `/`, meaning the domain root |
| Application startup file | `app.js` |
| Passenger log file, if offered | `/home/YOUR_CPANEL_USERNAME/ledger-able/passenger.log` |

Click **Create / Save**. An initial error before installation or configuration is expected. Do not point the startup file at `dist/server/index.js`: that is a framework handler, not the HTTP listener.

If your account instead shows **Application Manager**, register the same application path, deployment domain, root base URL and Production environment there. Its controls differ from CloudLinux's Node selector; ask iFastNet to select Node 22.23.2 and confirm the `app.js` startup file if that screen does not expose those fields. Do not create two conflicting registrations for the same domain.

## 5. Set environment variables

In the Node application's **Environment variables** section, add each name and value separately, without surrounding quotes:

| Name | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://ledger-able.com` |
| `DB_HOST` | `localhost`, or the database host supplied by iFastNet |
| `DB_PORT` | `3306` |
| `DB_NAME` | Full cPanel database name |
| `DB_USER` | Full cPanel database username |
| `DB_PASSWORD` | That user's actual password |
| `DB_POOL_SIZE` | `5` (connections per Passenger process) |
| `GOOGLE_CLIENT_ID` | Google Web application OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Corresponding Google OAuth secret |

Save changes. **Do not add a fixed `PORT` in cPanel.** `app.js` respects `process.env.PORT` when provided; Passenger normally intercepts the first `listen()` call. The port 3000 fallback is for an ordinary direct Node launch without an assigned port. No extra reverse-proxy port or background process needs configuring.

The hostname and HTTPS origin used by authentication come from `APP_URL`, not a visitor-controlled Host header. This avoids localhost callbacks behind the hosting proxy. None of these variables should have a `VITE_` or `NEXT_PUBLIC_` prefix.

### Make the same configuration available to terminal commands

cPanel application variables are not necessarily exported into **Terminal** sessions. In File Manager, copy `.env.example` to `.env` inside the private application root and edit the placeholders. Keep its values consistent with cPanel. For `.env` syntax, quote a password containing spaces or `#`, for example `DB_PASSWORD="YOUR_ACTUAL_PASSWORD"`. Never post this file or commit it to Git.

Set `.env` permissions to **600** (owner read/write). The app and database scripts load this file without replacing already-set process environment variables. If a password changes, update both cPanel and `.env`; restart afterward. `.env.example` must continue to contain placeholders only.

## 6. Configure Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select/create your project.
2. In **Google Auth Platform / APIs & Services**, configure the consent screen (app name, support email, audience and developer contact).
3. Create or edit an **OAuth client ID → Web application**.
4. Set the authorized JavaScript origin to `https://ledger-able.com` if that field is used.
5. Add this exact **Authorized redirect URI**, with no trailing slash:

   `https://ledger-able.com/api/auth/google/callback`

6. Copy the client ID and secret to the server configuration in step 5.
7. If the consent screen is in Testing, add your own Google account as a test user. Before opening access to other users, complete Google's applicable consent/publication requirements.

The existing Google flow still validates state, PKCE, nonce, issuer, audience and verified email. Sessions use random cookies and hashed tokens in MySQL. A user is associated with Google's provider subject, not matched merely by an email address. Outbound HTTPS to Google's token and certificate endpoints must be allowed by the host.

## 7. Install dependencies

Open **cPanel → Advanced → Terminal** (or use the SSH access iFastNet provides). In the Node application screen, copy the command labelled **Enter to the virtual environment** and paste it into Terminal exactly. It activates the correct Node installation. Its account path varies: do not substitute a guessed path.

Then run:

```bash
cd ~/ledger-able
node --version
npm install --global pnpm@11.25.0
pnpm --version
pnpm install --frozen-lockfile --prod=false
```

`node --version` should show `v22.23.2`. `--prod=false` is intentional: building and type-checking need development dependencies even in Production mode. Keep pnpm's lockfile. Do not mix cPanel's **Run NPM Install** button with pnpm installation.

If the virtual environment does not allow a global pnpm install, use `npx --yes pnpm@11.25.0` in place of `pnpm` in every command, for example:

```bash
npx --yes pnpm@11.25.0 install --frozen-lockfile --prod=false
```

Some Node selectors create a managed `node_modules` symlink. Leave that symlink intact. If pnpm asks to remove a populated modules directory, stop the app and consult the host before changing that managed directory. The supplied ZIP contains no `node_modules` directory to overwrite it.

## 8. Create the tables and test the connection

From `~/ledger-able`, run:

```bash
pnpm run db:check
pnpm run db:migrate
pnpm run db:check
```

On the first check, **Connection OK** followed by missing-table names is normal. After migration, the final check must say **All eight application tables are present**. The migration creates `users`, `auth_identities`, `sessions`, `businesses`, `profiles`, `entries`, `contacts` and `invoices`, plus Drizzle's migration history.

Run `pnpm run db:migrate` once more: with an unchanged schema it should complete without deleting or duplicating your records. It uses a database advisory lock to prevent concurrent migration runs. Do not run migrations automatically every time Passenger starts.

**Do not run `db:generate` during initial deployment.** The MySQL migration is already provided. That command is for developers making future schema changes.

The original D1 database is not inside the uploaded ZIP. This migration creates a fresh MySQL schema; it does **not** copy existing production D1 records. If you already have real D1 data, export and back it up before switching, arrange a reviewed import preserving IDs/ownership, reconcile counts and monetary values, and sign users in again. Do not run old SQLite migrations against MySQL.

## 9. Build and start

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm test
```

A complete build leaves `dist/client/` and `dist/server/index.js` (plus its chunks). Keep the **whole** `dist` directory. Never copy only `index.js` or only `dist/client`.

The tests start an isolated local server, with dummy credentials, to check production startup, public routes, asset delivery, authentication guards, callback settings and safe failure responses. They do not log in to Google or test your real database.

Return to **Setup Node.js App**, click **Save**, then **Restart / Start**. Visit `https://ledger-able.com`. Passenger owns the running process; do not leave `pnpm start` running separately in Terminal as the hosting solution.

For a manual diagnostic outside Passenger, `pnpm start` runs exactly the same startup file. Stop that diagnostic process with Ctrl+C before restarting through cPanel.

If a build exceeds shared-hosting memory limits, use the included tested `dist` build with its matching source and lockfile, install dependencies on the host, migrate, then restart. For later updates, build on another Node 22.23.2 machine and upload its complete matching `dist` plus changed source/configuration. Never upload Windows `node_modules` onto Linux.

## 10. Verify deployment and persistence

1. Open the root URL. Confirm the welcome page, styles and icons load. Browser Developer Tools → Network should show successful CSS/JS responses.
2. Click **Continue with Google**. Sign in, create a business, and record one identifiable sale and expense with a distinctive description and amount.
3. Refresh: both records must remain. In **phpMyAdmin**, confirm rows exist in `users`, `businesses` and `entries`. Do not publish screenshots containing session hashes or personal records.
4. In cPanel, click **Restart**. Reload, sign in again if necessary, and confirm both records and the business remain unchanged.
5. Sign out and sign back in using the same Google account. Confirm its existing business reopens, rather than creating a new identity.
6. In a separate browser/private session, use a **different Google account**. It must start with its own business and must not see the first account's records. Sign out, then open `/api/data`: it must return an authentication error.
7. Open `https://ledger-able.com/.env`: it must return 404, never the configuration file. Keep your source outside the domain's public document root even if Passenger is disabled.
8. Back up the MySQL database regularly using cPanel **Backup / Backup Wizard** or phpMyAdmin Export, and verify you can restore a backup. Uploading code or rebuilding is not a database backup.

## 11. Troubleshooting

| Symptom | Check/action |
| --- | --- |
| 503 / Passenger startup failure | Confirm application root and `app.js`, Node 22.23.2, all required DB variables and `APP_URL`; confirm dependencies and `dist/server/index.js` exist. Restart. |
| Generic startup message | It intentionally avoids printing credentials. Check configuration in step 5 and run the build and `db:check` commands. |
| Wrong Node version / `require()` or module errors | Activate the Node environment shown by cPanel. Keep `package.json`'s `type: module`. `app.js` has no top-level await and is loadable using Node 22.23.2 `require()`. If an older Passenger installation imposes a CommonJS-only loader before Node is called, ask the host to update/configure it. |
| `Cannot find package` / missing module | Repeat the frozen pnpm install in the activated environment, preserving any managed modules symlink. |
| Database check fails | Use the complete cPanel-prefixed database and user names. Confirm the user is assigned to that database, the password is consistent in both configurations, and the hostname/port are correct. |
| Too many connections | Reduce `DB_POOL_SIZE` to 2 or ask the host to limit Passenger processes. The default is five connections per process, not per account. |
| Missing tables | Run `db:migrate`; check the database name. Don't manually import the SQL and then run the migrator, because that skips its history. |
| Migration partly fails / table already exists | MySQL DDL can auto-commit, so migration failure is not guaranteed to roll back created tables. Back up first. For a genuinely empty initial deployment, create a new empty database and rerun there. For any database with records, stop and have a developer reconcile schema/history or restore a verified backup. Do not drop tables or delete migration history blindly. |
| `redirect_uri_mismatch` | Match the exact non-www HTTPS callback from step 6 in Google Console; check `APP_URL`. Restart after changes. |
| Google says access denied | Check consent-screen test users/publication state and the selected Google project/client. |
| Generic authentication error | Confirm outbound HTTPS to Google is allowed, the server clock is correct, migrations succeeded, and OAuth credentials belong to the configured Web client. A simultaneous first-time sign-in can hit the unique identity constraint; retrying sign-in is safe. |
| Invalid request origin (403) | Use the exact `https://ledger-able.com` origin, not www, a preview hostname or plain HTTP. `APP_URL` and the browser address must match. |
| CSS/JS 404 or unstyled page | Upload the entire matching `dist` tree; use the domain root as application URL. Remove an old static `index.html` or conflicting WordPress/rewrite registration only after backing it up. Don't add SPA fallback rewrites to this server-rendered app. |
| Old content after deployment | Finish the build, restart Passenger and hard-refresh the browser. Do not edit a running `dist` tree piecemeal. |
| No Terminal or Node feature | Ask iFastNet for Node selector/Terminal access or help running installation and migrations. This package needs a real Node process; PHP/static hosting alone is insufficient. |

### Logs and restart fallback

Check the Node selector's configured **Passenger log file** first. In File Manager, look for that chosen file; some hosts use `stderr.log`. Standard cPanel **Application Manager** documents the application's `logs/` directory. Also check **cPanel → Metrics → Errors**. The actual Apache/Passenger server-wide error-log path is controlled by iFastNet; ask support for the relevant startup error if it isn't exposed to your account.

Where supported, a Passenger restart can also be requested from the application directory:

```bash
mkdir -p tmp
touch tmp/restart.txt
```

Use the cPanel Restart button first. Logs may contain personal information from framework errors: keep them private, and never enable development mode on the public accounting site to investigate a failure.

## 12. Scope and verification limits

- Google sign-in, business setup and manual sales/expense records are the functional persistence paths present in the supplied source. Their pages and UI were retained.
- Invoices, contacts and banking controls remain the original placeholders; settings editing and report export were not implemented by this hosting conversion.
- The existing API reads the latest 250 entries, and the UI totals those loaded entries. The original month/date labels and estimate behavior were preserved. This change does not certify full-year accounting accuracy or complete those unfinished features.
- MySQL now stores money as DECIMAL(15,2) and the estimate rate as DECIMAL(6,5); the existing React calculations still use JavaScript numbers.
- See `CONVERSION_REPORT.md` for exact successful commands and outstanding checks. A production build and Node smoke tests are evidence of local compatibility, not proof that your particular Passenger configuration, MySQL account or Google consent setup works.

## Reference documentation

- [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)
- [CloudLinux Node.js Selector](https://docs.cloudlinux.com/cloudlinuxos/cloudlinux_os_components/#node-js-selector)
- [Passenger Node reverse port binding](https://www.phusionpassenger.com/library/indepth/nodejs/reverse_port_binding.html)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Vinext project and deployment support](https://github.com/cloudflare/vinext)
