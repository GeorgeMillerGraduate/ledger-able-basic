import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const outputDir=root+'tmp/browser-check';
mkdirSync(outputDir,{recursive:true});

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
export async function browserCheck(env){
 const c=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME});
 const user=randomUUID(),business=randomUUID(),token=randomUUID(),time=new Date().toISOString();
 await c.execute('INSERT INTO users (id,email,name,created_at,updated_at) VALUES (?,?,?,?,?)',[user,user+'@test.invalid','Browser Test',time,time]);
 await c.execute('INSERT INTO businesses (id,owner_user_id,name,accounting_year_start,created_at,updated_at) VALUES (?,?,?,?,?,?)',[business,user,'Browser Test Ltd','2026-01-01',time,time]);
 await c.execute('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',[createHash('sha256').update(token).digest('hex'),user,'2099-01-01T00:00:00.000Z',time]);await c.end();
 console.log('Browser: seeded session');
 const origin='http://localhost:3000';const app=spawn(process.execPath,['app.js'],{cwd:root,env:{...env,APP_URL:origin,PORT:'3000',NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});
 let output='';app.stdout.on('data',b=>output+=b);app.stderr.on('data',b=>output+=b);
 let browser,page;
 try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(output)),15000);app.stdout.on('data',()=>{if(output.includes('0.0.0.0:3000')){clearTimeout(timer);resolve();}});});
 console.log('Browser: server ready');
 browser=await chromium.launch({headless:true});
 console.log('Browser: launched');
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'ja_session',value:token,url:origin}]);page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/dashboard');await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByText('No contacts yet',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Add contact',exact:true}).click();await page.getByLabel('Contact/person name').fill('UI Customer');await page.getByLabel('Company',{exact:true}).fill('UI Company');await page.getByLabel('Email',{exact:true}).fill('ui@example.test');await page.getByRole('button',{name:'Save contact',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('UI Customer',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Telephone').fill('01234');await page.getByRole('button',{name:'Save contact',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.reload();await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:'View',exact:true}).click();await page.getByText('01234',{exact:true}).waitFor();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Invoices',exact:true}).click();await page.getByRole('button',{name:'Add invoice',exact:true}).click();await page.getByLabel('Customer',{exact:true}).selectOption({label:'UI Company'});
 await page.getByLabel('Description',{exact:true}).fill('UI Service');await page.getByLabel('Unit price (£)',{exact:true}).fill('10.00');await page.getByLabel('VAT (%)',{exact:true}).fill('20');await page.getByRole('button',{name:'Add line',exact:true}).click();await page.getByLabel('Description',{exact:true}).nth(1).fill('UI Extra');await page.getByLabel('Unit price (£)',{exact:true}).nth(1).fill('5.00');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'View',exact:true}).click();await page.getByRole('button',{name:'Mark sent',exact:true}).click();await page.getByRole('button',{name:'Mark paid & create sale',exact:true}).click();await page.getByText(/Paid £17.00 on/).waitFor();await page.screenshot({path:outputDir+'/invoice-desktop.png'});await page.pdf({path:outputDir+'/invoice-print.pdf',format:'A4',printBackground:true});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Banking',exact:true}).click();await page.getByRole('button',{name:'Add bank account',exact:true}).click();await page.getByLabel('Account name',{exact:true}).fill('UI Current');await page.getByRole('button',{name:'Save account',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByLabel('Bank account',{exact:true}).selectOption({label:'UI Current'});await page.getByRole('button',{name:'Import CSV',exact:true}).click();
 await page.getByLabel('CSV statement (maximum 2 MB)').setInputFiles({name:'statement.csv',mimeType:'text/csv',buffer:Buffer.from(`Date,Description,Amount\n${time.slice(0,10)},UI payment,17.00`)});
 await page.getByLabel('date',{exact:true}).selectOption('0');await page.getByLabel('description',{exact:true}).selectOption('1');await page.getByLabel('amount',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Validate & preview import',exact:true}).click();await page.getByRole('button',{name:'Confirm import',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByLabel('Classification',{exact:true}).selectOption('match');await page.getByLabel('Accounting entry (same amount)',{exact:true}).selectOption({index:1});await page.getByLabel('Mark reconciled (locks this transaction)').check();await page.getByRole('button',{name:'Save review',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('RECONCILED',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:outputDir+'/banking-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow on mobile');
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:'Add contact',exact:true}).click();await page.screenshot({path:outputDir+'/contact-mobile.png',fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.querySelector('[role=dialog]').getBoundingClientRect().right<=innerWidth),'Dialog fits mobile');
 assert.deepEqual(errors,[]);console.log('Browser workflows passed: contacts, invoice payment, CSV mapping/import/match/reconcile, mobile overflow, print PDF.');
 }catch(e){if(page)await page.screenshot({path:outputDir+'/browser-failure.png',fullPage:true}).catch(()=>{});console.error('Browser failure:',e,output);throw e;}finally{if(browser)await browser.close();if(app.exitCode===null){app.kill('SIGTERM');await once(app,'exit');}}
}

if(process.env.LEDGER_TEST_DATABASE!=="disposable")throw new Error("Use a migrated disposable database and LEDGER_TEST_DATABASE=disposable.");
await browserCheck(process.env);
