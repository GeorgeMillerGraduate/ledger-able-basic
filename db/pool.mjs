import mysql from 'mysql2/promise';

export function databaseOptions(env = process.env) {
  for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
    if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  const port = Number(env.DB_PORT || 3306);
  const connectionLimit = Number(env.DB_POOL_SIZE || 5);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 20) throw new Error('DB_POOL_SIZE must be between 1 and 20');
  return {
    host: env.DB_HOST, port, database: env.DB_NAME, user: env.DB_USER,
    password: env.DB_PASSWORD, connectionLimit, maxIdle: connectionLimit,
    idleTimeout: 60000, waitForConnections: true, queueLimit: 50,
    connectTimeout: 10000, charset: 'utf8mb4', timezone: 'Z',
    multipleStatements: false,
  };
}
let pool;
export function getPool() { return pool ??= mysql.createPool(databaseOptions()); }
export async function closePool() { if (pool) { await pool.end(); pool = undefined; } }
