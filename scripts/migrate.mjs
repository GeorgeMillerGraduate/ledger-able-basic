import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { databaseOptions } from '../db/pool.mjs';
import { fileURLToPath } from 'node:url';

let connection;
try {
  connection = await mysql.createConnection(databaseOptions());
  const [rows] = await connection.execute("SELECT GET_LOCK('ledger_able_schema_migration', 30) AS acquired");
  if (Number(rows[0].acquired) !== 1) throw new Error('Migration lock unavailable');
  await migrate(drizzle(connection), { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  console.log('Database migrations completed. Existing data is preserved.');
} catch {
  console.error('Migration failed. Check DB variables, privileges and migration history. MySQL DDL is not transactional; see the recovery instructions before retrying a partial migration.');
  process.exitCode = 1;
} finally {
  if (connection) {
    await connection.execute("SELECT RELEASE_LOCK('ledger_able_schema_migration')").catch(() => {});
    await connection.end();
  }
}
