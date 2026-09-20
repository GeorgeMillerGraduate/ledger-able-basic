import { randomUUID, createHash } from 'node:crypto';
import { check, text, date, money, scaled, decimal, invoiceTotals, statementRows } from '../lib/basic-values.mjs';
const now=()=>new Date().toISOString();
const uuid=()=>randomUUID();
export async function basicService(pool,ctx,op,b={}) {
 check(ctx?.userId&&ctx?.businessId,'Authentication required.');
 const c=await pool.getConnection();
 const query=async(sql,args=[])=>{const [r]=await c.execute(sql,args);return r;};
 const owned=async(table,id)=>{check(['contacts','invoices','bank_accounts','entries'].includes(table),'Invalid record.');const rows=await query(`SELECT * FROM ${table} WHERE id=? AND user_id=? AND business_id=? FOR UPDATE`,[String(id||''),ctx.userId,ctx.businessId]);check(rows.length===1,'Record not found.');return rows[0];};
 const insert=async(table,data)=>{const keys=Object.keys(data);await query(`INSERT INTO ${table} (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,Object.values(data));};
 const update=async(table,id,data)=>{const keys=Object.keys(data);await query(`UPDATE ${table} SET ${keys.map(k=>'`'+k+'`=?').join(',')} WHERE id=?`,[...Object.values(data),id]);};
 const audit=async(id,action,detail)=>insert('accounting_audit',{id:uuid(),user_id:ctx.userId,business_id:ctx.businessId,record_id:id,action,detail:JSON.stringify(detail),created_at:now()});
 const entry=async(kind,party,description,amount,vat,day,category)=>{const id=uuid();await insert('entries',{id,user_id:ctx.userId,business_id:ctx.businessId,kind,party,description,amount,vat_amount:vat,entry_date:day,category,status:'paid',created_at:now()});return id;};
 try {
 await c.beginTransaction();
 // One business lock serializes matching/payment/import operations, including retries.
 check((await query('SELECT id FROM businesses WHERE id=? AND owner_user_id=? FOR UPDATE',[ctx.businessId,ctx.userId])).length===1,'Business not found.');
 let result={ok:true};
 if(op==='list'){
  const args=[ctx.userId,ctx.businessId];
  result={contacts:await query('SELECT * FROM contacts WHERE user_id=? AND business_id=? ORDER BY name',args),invoices:await query('SELECT * FROM invoices WHERE user_id=? AND business_id=? ORDER BY created_at DESC',args),accounts:await query('SELECT * FROM bank_accounts WHERE user_id=? AND business_id=? ORDER BY name',args),entries:await query('SELECT e.* FROM entries e LEFT JOIN bank_transactions t ON t.entry_id=e.id WHERE e.user_id=? AND e.business_id=? AND t.id IS NULL ORDER BY e.entry_date DESC',args)};
  for(const i of result.invoices){i.display_status=i.status==='sent'&&i.due_date<now().slice(0,10)?'overdue':i.status;}
 }else if(op==='contact.save'){
  const previous=b.id?await owned('contacts',b.id):null;
  const fields={name:text(b.name,255,true),company:text(b.company??''),email:text(b.email??''),telephone:text(b.telephone??'',80),type:b.type,notes:text(b.notes??'',10000),address:JSON.stringify(Object.fromEntries(['line1','line2','city','county','postcode','country'].map(k=>[k,text(b.address?.[k]??'',255)]))),updated_at:now()};
  check(['customer','supplier','both'].includes(fields.type),'Choose a contact type.');check(!fields.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email),'Invalid email.');
  const id=previous?.id??uuid();if(previous)await update('contacts',id,fields);else await insert('contacts',{id,user_id:ctx.userId,business_id:ctx.businessId,...fields,created_at:now()});await audit(id,op,{before:previous,after:fields});result={id};
 }else if(op==='contact.archive'){
  const contact=await owned('contacts',b.id);await update('contacts',contact.id,{archived:b.archived?1:0,updated_at:now()});await audit(contact.id,op,{archived:!!b.archived});
 }else if(op==='invoice.get'){
  const invoice=await owned('invoices',b.id);result={invoice,items:await query('SELECT * FROM invoice_items WHERE invoice_id=? ORDER BY position',[invoice.id]),payments:await query('SELECT * FROM invoice_payments WHERE invoice_id=?',[invoice.id])};
 }else if(op==='invoice.save'){
  const old=b.id?await owned('invoices',b.id):null;check(!old||old.status==='draft','Only draft invoices can be edited.');
  const contact=await owned('contacts',b.contact_id);check(!contact.archived&&['customer','both'].includes(contact.type),'Choose an active customer.');
  const totals=invoiceTotals(b.items),issue=date(b.issue_date),due=date(b.due_date);check(due>=issue,'Due date must be on or after issue date.');
  const id=old?.id??uuid();const fields={contact_id:contact.id,customer:contact.company||contact.name,customer_snapshot:JSON.stringify(contact),issue_date:issue,due_date:due,reference:text(b.reference??''),notes:text(b.notes??'',10000),amount:totals.amount,subtotal:totals.subtotal,tax_total:totals.tax_total,updated_at:now()};
  if(old){await update('invoices',id,fields);await query('DELETE FROM invoice_items WHERE invoice_id=?',[id]);}else await insert('invoices',{id,user_id:ctx.userId,business_id:ctx.businessId,invoice_number:'INV-'+now().slice(0,10).replaceAll('-','')+'-'+id.slice(0,8).toUpperCase(),...fields,status:'draft',created_at:now()});
  for(const [position,line] of totals.lines.entries())await insert('invoice_items',{id:uuid(),invoice_id:id,position,...line});await audit(id,op,{...fields,items:totals.lines});result={id};
 }else if(op==='invoice.status'){
  const i=await owned('invoices',b.id);
  if(b.status==='paid'){
   date(b.payment_date);check(b.payment_date>=i.issue_date&&b.payment_date<=now().slice(0,10),'Payment date must be between issue date and today.');
   if(i.status==='paid'){const [p]=await query('SELECT * FROM invoice_payments WHERE invoice_id=?',[i.id]);check(p&&p.payment_date===b.payment_date,'Payment already recorded; its date cannot be changed.');result={id:i.id,already_paid:true};}
   else {check(i.status==='sent','Mark the invoice as sent first.');const sale=await entry('sale',i.customer,'Invoice '+i.invoice_number,i.amount,i.tax_total,b.payment_date,'Invoices');await insert('invoice_payments',{id:uuid(),invoice_id:i.id,entry_id:sale,payment_date:b.payment_date,amount:i.amount,created_at:now()});await update('invoices',i.id,{status:'paid',updated_at:now()});await audit(i.id,op,{status:'paid',entry_id:sale,payment_date:b.payment_date});}
  }else{check((i.status==='draft'&&b.status==='sent')||(['draft','sent'].includes(i.status)&&b.status==='cancelled'),'Invalid invoice status transition.');check(i.contact_id&&i.issue_date,'Legacy invoice: complete the draft before sending.');await update('invoices',i.id,{status:b.status,updated_at:now()});await audit(i.id,op,{from:i.status,to:b.status});}
 }else if(op==='invoice.delete'){
  const i=await owned('invoices',b.id);check(i.status==='draft','Only draft invoices can be deleted.');await audit(i.id,op,i);await query('DELETE FROM invoice_items WHERE invoice_id=?',[i.id]);await query('DELETE FROM invoices WHERE id=?',[i.id]);
 }else if(op==='account.save'){
  const old=b.id?await owned('bank_accounts',b.id):null;
  const fields={name:text(b.name,255,true),bank_name:text(b.bank_name??''),reference:text(b.reference??'',80),account_type:text(b.account_type,40,true),currency:'GBP',opening_balance:money(b.opening_balance,true),opening_date:date(b.opening_date),updated_at:now()};
  check(!b.currency||b.currency==='GBP','Basic supports GBP only.');check(['Current','Savings','Cash','Credit card'].includes(fields.account_type),'Invalid account type.');
  const accountId=old?.id??uuid();
  if(old){const [count]=await query('SELECT COUNT(*) AS n FROM bank_transactions WHERE account_id=?',[old.id]);check(!Number(count.n)||(fields.opening_date===old.opening_date&&fields.opening_balance===old.opening_balance),'Opening balance and date cannot change after importing transactions.');await update('bank_accounts',old.id,fields);}else await insert('bank_accounts',{id:accountId,user_id:ctx.userId,business_id:ctx.businessId,...fields,created_at:now()});await audit(accountId,op,{before:old,after:fields});result={id:accountId};
 }else if(op==='account.archive'){
  const a=await owned('bank_accounts',b.id);await update('bank_accounts',a.id,{archived:b.archived?1:0,updated_at:now()});await audit(a.id,op,{archived:!!b.archived});
 }else if(op==='bank.list'){
  const a=await owned('bank_accounts',b.account_id);const transactions=await query('SELECT * FROM bank_transactions WHERE account_id=? ORDER BY transaction_date DESC,created_at DESC',[a.id]);let balance=scaled(a.opening_balance,2,true),incoming=0n,outgoing=0n;for(const t of transactions){const n=scaled(t.amount,2,true);balance+=n;if(n>0n)incoming+=n;else outgoing-=n;}
  result={account:a,transactions,balance:decimal(balance),money_in:decimal(incoming),money_out:decimal(outgoing)};
 }else if(op==='bank.preview'||op==='bank.import'){
  const a=await owned('bank_accounts',b.account_id);check(!a.archived,'Account is archived.');const rows=statementRows(b.csv,b.mapping),seen=new Set();
  for(const row of rows){check(row.transaction_date>=a.opening_date,`CSV row ${row.row}: date precedes opening balance date.`);row.fingerprint=createHash('sha256').update(JSON.stringify([a.id,row.transaction_date,row.amount,row.description.trim().toLowerCase()])).digest('hex');const existing=await query('SELECT id FROM bank_transactions WHERE account_id=? AND fingerprint=?',[a.id,row.fingerprint]);row.duplicate=existing.length>0||seen.has(row.fingerprint);seen.add(row.fingerprint);}
  if(op==='bank.preview')result={rows};else{let imported=0,skipped=0;for(const r of rows){const decision=b.decisions?.[r.row];if(r.duplicate)check(['skip','keep'].includes(decision),`CSV row ${r.row}: possible duplicate; explicitly skip or keep.`);if(decision==='skip'){skipped++;continue;}await insert('bank_transactions',{id:uuid(),account_id:a.id,transaction_date:r.transaction_date,description:r.description,amount:r.amount,fingerprint:r.fingerprint,status:'UNREVIEWED',created_at:now(),updated_at:now()});imported++;}await audit(a.id,op,{imported,skipped,decisions:b.decisions??{}});result={imported,skipped};}
 }else if(op==='bank.process'){
  const a=await owned('bank_accounts',b.account_id);check(!a.archived,'Restore the archived account first.');const [t]=await query('SELECT * FROM bank_transactions WHERE id=? AND account_id=? FOR UPDATE',[String(b.id??''),a.id]);check(t,'Transaction not found.');check(t.status!=='RECONCILED','Reconciled records cannot be changed.');
  const mode=b.classification;check(['match','create','transfer','ignore','uncategorised'].includes(mode),'Choose a classification.');const category=text(b.category??'',255);let entryId=t.entry_id;
  check(!entryId||mode==='match','A linked accounting entry cannot be replaced.');
  if(mode==='match'||mode==='create'){
   const n=scaled(t.amount,2,true),kind=n>0n?'sale':'expense',amount=decimal(n>0n?n:-n);
   if(mode==='match'){const e=await owned('entries',b.entry_id);check(e.kind===kind&&e.amount===amount,'Match must have the same direction and amount.');check(!entryId||entryId===e.id,'Cannot replace a linked entry.');const matches=await query('SELECT id FROM bank_transactions WHERE entry_id=? AND id<>?',[e.id,t.id]);check(!matches.length,'This entry is already matched.');entryId=e.id;}
   else {check(category,'Enter a category.');entryId=await entry(kind,text(b.party,255,true),t.description,amount,'0.00',t.transaction_date,category);}
  }
  check(!b.reconcile||mode!=='uncategorised','Classify the transaction before reconciliation.');const fields={entry_id:entryId??null,classification:mode,category,status:b.reconcile?'RECONCILED':mode==='uncategorised'?'UNREVIEWED':'REVIEWED',updated_at:now()};await update('bank_transactions',t.id,fields);await audit(t.id,op,{before:t,after:fields});
 }else check(false,'Unknown operation.');
 await c.commit();return result;
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
