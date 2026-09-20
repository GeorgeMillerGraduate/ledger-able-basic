import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { databaseOptions } from '../db/pool.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const settings = { DB_HOST:'127.0.0.1', DB_PORT:'1', DB_NAME:'smoke_only', DB_USER:'smoke_only', DB_PASSWORD:'smoke-password-sentinel' };

test('pool configuration rejects missing secrets and unsafe limits', () => {
  assert.throws(() => databaseOptions({}), /DB_HOST/);
  assert.throws(() => databaseOptions({...settings, DB_PORT:'invalid'}), /DB_PORT/);
  assert.throws(() => databaseOptions({...settings, DB_POOL_SIZE:'200'}), /DB_POOL_SIZE/);
  assert.equal(databaseOptions(settings).multipleStatements, false);
  assert.equal(databaseOptions(settings).connectionLimit, 5);
});

for (const [origin,cli] of [['https://ledger-able.com',false], ['http://localhost:3000',false], ['http://localhost:3000',true]]) test(`production ${cli?'vinext start':'app.js'} serves existing pages, assets and protects API routes: ${origin}`, {timeout:60000}, async t => {
  // require() emulates Passenger's loading of app.js on Node 22, without claiming
  // to emulate Apache/Passenger's native listen interception.
  const child = spawn(process.execPath, cli ? ['node_modules/vinext/dist/cli.js','start','--port','0'] : ['-e', 'require("./app.js")'], {
    cwd:root, env:{...process.env,...settings,NODE_ENV:'production',APP_URL:origin,PORT:'0',
      GOOGLE_CLIENT_ID:'smoke-client-id',GOOGLE_CLIENT_SECRET:'smoke-oauth-secret-sentinel'},
    stdio:['ignore','pipe','pipe']
  });
  let output='';
  child.stdout.on('data', b => {output+=b;});
  child.stderr.on('data', b => {output+=b;});
  t.after(async () => { if(child.exitCode===null) {child.kill('SIGTERM'); await once(child,'exit');} });
  const port = await new Promise((resolve,reject) => {
    const timer=setTimeout(()=>reject(new Error(`Startup timed out: ${output}`)),20000);
    child.stdout.on('data',()=>{const match=output.match(/http:\/\/0\.0\.0\.0:(\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Startup exited ${code}: ${output}`));});
  });
  const base=`http://127.0.0.1:${port}`;
  const request=(url,init={})=>fetch(base+url,{redirect:'manual',...init});
  const home=await request('/'); assert.equal(home.status,200);
  const html=await home.text(); assert.match(html,/Ledger-able/);
  assert.doesNotMatch(html,/smoke-password-sentinel|smoke-oauth-secret-sentinel/);
  assert.match(home.headers.get('cache-control'),/no-store/);
  const asset=html.match(/(?:src|href)="([^" ]+\.(?:js|css))"/);
  assert.ok(asset,'page references production CSS or JS');
  const assetResponse=await request(asset[1]); assert.equal(assetResponse.status,200);
  assert.equal((await request('/favicon.svg')).status,200);
  const dashboard=await request('/dashboard'); assert.ok([302,303,307,308].includes(dashboard.status));
  assert.match(dashboard.headers.get('location'),/signin=required/);
  assert.equal((await request('/api/data')).status,401);
  assert.equal((await request('/api/basic')).status,401);
  for(const route of ['/api/data','/api/business','/api/basic']) {
    assert.equal((await request(route,{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json'},body:'{}'})).status,403);
    assert.equal((await request(route,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'})).status,401);
  }
  const login=await request('/api/auth/google',cli ? {} : {headers:{host:'attacker.invalid','x-forwarded-host':'attacker.invalid'}});
  assert.equal(login.status,303);
  const google=new URL(login.headers.get('location'));
  assert.equal(google.origin,'https://accounts.google.com');
  assert.equal(google.searchParams.get('redirect_uri'),origin+'/api/auth/google/callback');
  assert.equal(google.searchParams.get('code_challenge_method'),'S256');
  assert.ok(google.searchParams.get('nonce')); assert.ok(google.searchParams.get('state'));
  const cookies=login.headers.getSetCookie();assert.equal(cookies.length,3);
  for(const cookie of cookies){assert.match(cookie,/HttpOnly/i);assert.equal(/; Secure/i.test(cookie),origin.startsWith('https:'));assert.match(cookie,/SameSite=Lax/i);}
  const speculative=await request('/api/auth/google',{headers:{rsc:'1'}});
  assert.ok([307,400].includes(speculative.status));
  // Vinext may canonicalize an RSC URL before route dispatch. It must never
  // send OAuth cookies or redirect a speculative request straight to Google.
  assert.equal(speculative.headers.getSetCookie().length,0);
  assert.ok(!speculative.headers.get('location')?.includes('accounts.google.com'));
  const prefetch=await request('/api/auth/google',{headers:{purpose:'prefetch'}});
  assert.equal(prefetch.status,400);assert.equal(prefetch.headers.getSetCookie().length,0);
  const callback=await request('/api/auth/google/callback?code=bad&state=bad');
  assert.match(callback.headers.get('location'),/missing_state_cookie/);
  const signout=await request('/api/auth/signout');assert.equal(signout.status,303);
  assert.equal(signout.headers.getSetCookie().length,4);
  // Unreachable DB with a session must fail safely, not include SQL or credentials.
  const failure=await request('/api/data',{headers:{cookie:'ja_session=invalid-token'}});
  assert.equal(failure.status,500);
  const failureBody=await failure.text();assert.doesNotMatch(failureBody,/smoke-password|SELECT|stack|ECONNREFUSED/);
  for(const url of ['/.env','/db/pool.mjs','/package.json']) assert.equal((await request(url)).status,404);
});

test('browser output contains no database driver, OAuth secret or server environment access', async () => {
  async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name);
    if(item.isDirectory())await scan(file);
    else if(/\.(js|css|html)$/.test(file)){
      const content=await readFile(file,'utf8');
      assert.doesNotMatch(content,/GOOGLE_CLIENT_SECRET|DB_PASSWORD|cloudflare:workers|drizzle-orm\/d1/);
    }
  }}
  await scan(path.join(root,'dist/client'));
});
