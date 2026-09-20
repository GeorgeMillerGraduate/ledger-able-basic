import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { databaseOptions } from '../db/pool.mjs';
import { canonicalOrigin } from './origin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
process.env.NODE_ENV ||= 'production';
databaseOptions(); // Validate configuration without requiring a live connection at startup.
const origin = new URL(canonicalOrigin());
if (!existsSync(path.join(root, 'dist/server/index.js'))) throw new Error('Run pnpm run build before starting');
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be a valid TCP port');
// Passenger intercepts the first HTTP server listen() call in its default auto-install mode.
// PORT is honored outside Passenger; no separate local upstream process is needed.
process.env.VINEXT_TRUSTED_HOSTS = origin.host;
const { startProdServer } = await import('vinext/server/prod-server');
const { server } = await startProdServer({ port, host: '0.0.0.0', outDir: path.join(root, 'dist') });
// Normalize only to the operator-configured canonical origin before the framework reads headers.
// The application still compares the untouched Origin header for every write.
server.prependListener('request', (req, res) => {
  req.headers.host = origin.host;
  req.headers['x-forwarded-host'] = origin.host;
  req.headers['x-forwarded-proto'] = origin.protocol.slice(0, -1);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!req.url?.startsWith('/_next/static/')) res.setHeader('Cache-Control', 'private, no-store');
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
});
