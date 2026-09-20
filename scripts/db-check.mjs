import { getPool, closePool } from '../db/pool.mjs';
try {
  const db = getPool();
  await db.execute('SELECT 1');
  const [rows] = await db.execute('SELECT VERSION() AS version');
  const [tables] = await db.execute('SHOW TABLES');
  const names = new Set(tables.map(row => Object.values(row)[0]));
  const required = ['users','auth_identities','sessions','businesses','profiles','entries','contacts','invoices','invoice_items','invoice_payments','bank_accounts','bank_transactions','accounting_audit'];
  const missing = required.filter(name => !names.has(name));
  console.log(`Connection OK: MySQL/MariaDB ${rows[0].version}.`);
  if (missing.length) { console.error(`Missing tables: ${missing.join(', ')}. Run pnpm run db:migrate.`); process.exitCode = 1; }
  else console.log('All thirteen application tables are present.');
} catch {
  console.error('Database check failed. Check the DB variables, database user assignment and hostname in cPanel.');
  process.exitCode = 1;
} finally { await closePool(); }
