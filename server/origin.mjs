// A production build is also used for localhost testing: transport, not NODE_ENV,
// determines cookie security. HTTP is allowed only on the explicit local origin.
export function canonicalOrigin(value = process.env.APP_URL) {
  if (!value) throw new Error('APP_URL is required');
  let url;
  try { url = new URL(value); } catch { throw new Error('APP_URL must be a valid origin'); }
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
      (url.protocol !== 'https:' && url.origin !== 'http://localhost:3000')) {
    throw new Error('APP_URL must be an HTTPS origin or http://localhost:3000');
  }
  return url.origin;
}
