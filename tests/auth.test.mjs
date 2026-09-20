import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import * as jose from 'jose';
import { getTableName } from 'drizzle-orm';
import { canonicalOrigin } from '../server/origin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const keys = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(keys.publicKey);
const otherKeys = await jose.generateKeyPair('RS256');

// Execute the actual route source with real crypto/JWT verification. Only the
// external Google network and SQL transport are substituted; no production test
// backdoors, alternate OAuth endpoints or signature bypasses are introduced.
async function harness(options = {}) {
  const records = { users: [], auth_identities: [], sessions: [], businesses: [] };
  if (options.existing) {
    records.users.push({ id:'existing-user', email:'old@example.test', name:'Old' });
    records.auth_identities.push({ userId:'existing-user', provider:'google', providerSubject:'subject-1' });
  }
  if (options.business) records.businesses.push({ id:'business-1', ownerUserId:'existing-user' });
  const tx = {
    select() { return { from(table) {
      if (options.dbFailure) throw Error('PRIVATE_DB_PASSWORD SQL');
      const query = { where() { return query; }, limit() { return records[getTableName(table)]; } };
      return query;
    } }; },
    insert(table) { return { async values(value) {
      if (options.sessionFailure && getTableName(table)==='sessions') throw Error('PRIVATE_SESSION_TOKEN');
      records[getTableName(table)].push(value);
    } }; },
    update(table) { return { set(value) { return { async where() { Object.assign(records[getTableName(table)][0],value); } }; } }; },
    delete(table) { return { async where() { records[getTableName(table)] = []; } }; },
  };
  const db = { ...tx, async transaction(fn) {
    const snapshot = structuredClone(records);
    try { return await fn(tx); } catch (e) { Object.assign(records,snapshot); throw e; }
  } };
  const logs = [], calls = [];
  const env = { APP_URL: options.origin ?? 'http://localhost:3000', GOOGLE_CLIENT_ID:'test-client', GOOGLE_CLIENT_SECRET:'PRIVATE_GOOGLE_SECRET' };
  const context = vm.createContext({
    Request, Response, Headers, URL, URLSearchParams, Buffer, TextEncoder, crypto, btoa,
    AbortSignal, setTimeout, clearTimeout, process: { env },
    console: { error(message) { logs.push(message); } },
    async fetch(url, init) {
      calls.push({ url, init });
      if (options.networkFailure) throw Error('PRIVATE_AUTHORIZATION_CODE');
      if (options.tokenStatus) return new Response('{}', {status: options.tokenStatus});
      const payload = { nonce: h.nonce, email:'person@example.test', email_verified:true, name:'Person', ...options.claims };
      const token = await new jose.SignJWT(payload).setProtectedHeader({alg:'RS256'})
        .setIssuer(options.issuer ?? 'https://accounts.google.com').setAudience(options.audience ?? 'test-client')
        .setSubject('subject-1').setIssuedAt().setExpirationTime(options.expired ? '-1m' : '5m')
        .sign(options.badSignature ? otherKeys.privateKey : keys.privateKey);
      return Response.json({ id_token:token });
    },
  });
  const cache = new Map();
  async function synthetic(key, values) {
    if (cache.has(key)) return cache.get(key);
    const m = new vm.SyntheticModule(Object.keys(values), function() {
      for (const [k,v] of Object.entries(values)) this.setExport(k,v);
    }, {context, identifier:key});
    cache.set(key,m); return m;
  }
  async function load(specifier, parent = path.join(root,'entry.ts')) {
    if (specifier === 'server-only') return synthetic(specifier,{});
    if (specifier === '@/db') return synthetic(specifier,{ getDb: () => db });
    if (specifier === 'next/headers') return synthetic(specifier,{ cookies:async()=>({get:()=>undefined}) });
    if (specifier === 'next/navigation') return synthetic(specifier,{redirect:()=>{throw Error('unexpected page redirect');}});
    if (specifier === 'jose') return synthetic(specifier,{...jose, createRemoteJWKSet:()=>jose.createLocalJWKSet({keys:[jwk]})});
    if (!specifier.startsWith('.') && !specifier.startsWith('@/') && !path.isAbsolute(specifier)) return synthetic(specifier,await import(specifier));
    let filename = specifier.startsWith('@/') ? path.join(root,specifier.slice(2)) : path.resolve(path.dirname(parent),specifier);
    if (!path.extname(filename)) filename += '.ts';
    if (cache.has(filename)) return cache.get(filename);
    const pending = (async () => {
      const source = await readFile(filename,'utf8');
      const code = filename.endsWith('.ts') ? ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText : source;
      return new vm.SourceTextModule(code,{context,identifier:filename});
    })();
    cache.set(filename,pending);
    return pending;
  }
  async function route(file) {
    const m=await load(path.join(root,file));
    if (m.status === 'unlinked') await m.link((s,ref)=>load(s,ref.identifier));
    await m.evaluate(); return m.namespace.GET;
  }
  const login=await route('app/api/auth/google/route.ts');
  const callback=await route('app/api/auth/google/callback/route.ts');
  const h={records,logs,calls,env,login,callback,nonce:'',state:'',cookie:'',verifier:''};
  h.begin = async () => {
    const response=await login(new Request(env.APP_URL+'/api/auth/google'));
    const google=new URL(response.headers.get('location'));
    h.nonce=google.searchParams.get('nonce'); h.state=google.searchParams.get('state');
    h.cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    h.verifier=h.cookie.match(/ja_oauth_verifier=([^;]+)/)[1];
    return response;
  };
  h.finish=(query=`code=PRIVATE_AUTHORIZATION_CODE&state=${h.state}`,cookie=h.cookie)=>callback(new Request(env.APP_URL+'/api/auth/google/callback?'+query,{headers:{cookie}}));
  return h;
}

for (const origin of ['http://localhost:3000','https://ledger-able.com']) {
  test(`OAuth cookies, PKCE and completed new-user login: ${origin}`,async()=>{
    const h=await harness({origin}); const login=await h.begin();
    const google=new URL(login.headers.get('location'));
    assert.equal(google.searchParams.get('redirect_uri'),origin+'/api/auth/google/callback');
    assert.equal(google.searchParams.get('code_challenge_method'),'S256');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(h.verifier));
    assert.equal(google.searchParams.get('code_challenge'),Buffer.from(digest).toString('base64url'));
    assert.equal(login.headers.getSetCookie().length,3);
    for(const c of login.headers.getSetCookie()){
      assert.match(c,/Path=\/; Max-Age=600; HttpOnly; SameSite=Lax/);
      assert.equal(c.includes('; Secure'),origin.startsWith('https'));
      assert.doesNotMatch(c,/Domain=/i);
    }
    const result=await h.finish();
    assert.equal(result.headers.get('location'),origin+'/setup');
    assert.equal(h.records.users.length,1);assert.equal(h.records.auth_identities.length,1);
    const cookies=result.headers.getSetCookie();assert.equal(cookies.length,4);
    assert.equal(cookies.filter(c=>c.includes('Max-Age=0')).length,3);
    const session=cookies.find(c=>c.startsWith('ja_session='));
    const token=session.split(';')[0].split('=')[1];
    assert.equal(h.records.sessions[0].tokenHash,Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex'));
    assert.ok(!JSON.stringify(h.records).includes(token));
    assert.equal(h.calls[0].init.body.get('code_verifier'),h.verifier);
    assert.equal(h.calls[0].init.body.get('redirect_uri'),origin+'/api/auth/google/callback');
    assert.deepEqual(h.logs,[]);
  });
}

test('returning Google identity updates its user and opens dashboard',async()=>{
  const h=await harness({existing:true,business:true});await h.begin();const r=await h.finish();
  assert.match(r.headers.get('location'),/\/dashboard$/);
  assert.equal(h.records.users.length,1);assert.equal(h.records.auth_identities.length,1);
  assert.equal(h.records.users[0].email,'person@example.test');
  assert.equal(h.records.sessions[0].userId,'existing-user');
});

const failures = [
  ['missing_state', {}, ()=>['code=x']],
  ['missing_state_cookie', {}, h=>[`state=${h.state}&code=x`,'']],
  ['state_mismatch', {}, h=>['state=wrong&code=x',h.cookie]],
  ['missing_nonce', {}, h=>[undefined,h.cookie.replace(/ja_oauth_nonce=[^;]+;?\s*/, '')]],
  ['missing_pkce_verifier', {}, h=>[undefined,h.cookie.replace(/; ja_oauth_verifier=[^;]+/, '')]],
  ['access_denied', {}, h=>[`state=${h.state}&error=access_denied`]],
  ['missing_authorization_code', {}, h=>[`state=${h.state}`]],
  ['token_exchange_failed', {tokenStatus:400}],
  ['token_exchange_failed', {networkFailure:true}],
  ['id_token_verification_failed', {badSignature:true}],
  ['id_token_verification_failed', {issuer:'https://attacker.invalid'}],
  ['id_token_verification_failed', {audience:'wrong-client'}],
  ['id_token_verification_failed', {expired:true}],
  ['nonce_mismatch', {claims:{nonce:'wrong'}}],
  ['email_not_verified', {claims:{email_verified:false}}],
  ['invalid_authorized_party', {claims:{azp:'wrong-client'}}],
  ['database_failed', {dbFailure:true}],
  ['session_creation_failed', {sessionFailure:true}],
];
for(const [event,options,args] of failures) test(`rejects ${event}: ${JSON.stringify(options)}`,async()=>{
  const h=await harness(options);await h.begin();const r=await h.finish(...(args?.(h)??[]));
  assert.equal(new URL(r.headers.get('location')).searchParams.get('auth_error'),event);
  assert.equal(r.headers.getSetCookie().length,3);
  assert.ok(r.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));
  assert.equal(h.records.sessions.length,0);assert.equal(h.records.users.length,0);
  assert.equal(JSON.parse(h.logs[0]).event,event);
  assert.doesNotMatch(h.logs.join(''),/PRIVATE_|person@example|SELECT|code=|eyJ/);
  assert.ok(!h.logs.join('').includes(h.verifier));
});

test('prefetch cannot rotate state; origin rejects unsafe HTTP and URL components',async()=>{
  const h=await harness();
  for(const headers of [{rsc:'1'},{'next-router-prefetch':'1'},{purpose:'prefetch'}]){
    const r=await h.login(new Request(h.env.APP_URL+'/api/auth/google',{headers}));
    assert.equal(r.status,400);assert.equal(r.headers.getSetCookie().length,0);
  }
  for(const origin of ['http://ledger-able.com','https://ledger-able.com/path','https://user:pass@ledger-able.com','javascript:alert(1)']) assert.throws(()=>canonicalOrigin(origin));
  assert.equal(canonicalOrigin('http://localhost:3000'),'http://localhost:3000');
});
