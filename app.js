// Deliberately no top-level await: Node 22 Passenger can require this ESM entry.
// The actual HTTP server runs in this process, not in a detached CLI child.
import('./server/start.mjs').catch(() => {
  console.error('Ledger-able startup failed. Check environment variables, dependencies and the production build.');
  process.exit(1);
});
