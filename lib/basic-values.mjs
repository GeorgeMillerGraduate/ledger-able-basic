export class ValidationError extends Error {}
export function check(ok, message) { if (!ok) throw new ValidationError(message); }
export function text(value, max=255, required=false) { check(typeof value==='string', 'Expected text.'); const s=value.trim(); check(s.length<=max && (!required||s.length>0), `Text must be ${required?'1':'0'}–${max} characters.`); return s; }
export function scaled(value, places=2, signed=false) {
  const s=String(value??'');check(new RegExp(`^${signed?'-?':''}\\d{1,13}(?:\\.\\d{1,${places}})?$`).test(s),'Invalid amount or too many decimal places.');
  const neg=s.startsWith('-'), [whole, frac='']=s.replace('-','').split('.');return (BigInt(whole)*10n**BigInt(places)+BigInt(frac.padEnd(places,'0')))*(neg?-1n:1n);
}
export function decimal(n, places=2) { const sign=n<0n?'-':'';n=n<0n?-n:n;const s=n.toString().padStart(places+1,'0');return sign+s.slice(0,-places)+'.'+s.slice(-places); }
export function money(value,signed=false){const n=scaled(value,2,signed);check(n<=999999999999999n&&n>=-999999999999999n,'Amount is too large.');return decimal(n);}
export function date(value) {const s=String(value??'');check(/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<='9999-12-31'&&Number.isFinite(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s,'Enter a valid date.');return s;}
export function invoiceTotals(items) {
  check(Array.isArray(items)&&items.length>0&&items.length<=100,'Use 1–100 invoice lines.');let subtotal=0n,taxTotal=0n;
  const lines=items.map(i=>{check(i&&typeof i==='object','Invalid invoice line.');const description=text(i.description,2000,true),q=scaled(i.quantity,3),p=scaled(i.unit_price),r=scaled(i.tax_rate);check(q>0n&&q<=999999999999n&&r<=10000n,'Quantity must be positive and tax must be 0–100%.');const net=(q*p+500n)/1000n,tax=(net*r+5000n)/10000n;subtotal+=net;taxTotal+=tax;return{description,quantity:decimal(q,3),unit_price:decimal(p),tax_rate:decimal(r),net:decimal(net),tax:decimal(tax)};});
  check(subtotal+taxTotal>0n,'Invoice total must be positive.');money(decimal(subtotal+taxTotal));return {lines,subtotal:decimal(subtotal),tax_total:decimal(taxTotal),amount:decimal(subtotal+taxTotal)};
}
export function parseCSV(source) {
  check(typeof source==='string'&&source.length<=2000000,'CSV must be under 2 MB.');source=source.replace(/^\uFEFF/,'');const first=source.split(/\r?\n/)[0];const delimiter=first.split(';').length>first.split(',').length?';':',';
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c==='"'){check(!cell&&!closed,'Malformed CSV quote.');quoted=true;}else if(c===delimiter){row.push(cell);cell='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}else{check(!closed||/\s/.test(c),'Unexpected text after CSV quote.');if(!closed)cell+=c;}}
  check(!quoted,'Unclosed CSV quote.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);check(rows.length>=2&&rows.length<=2001,'CSV must have a header and 1–2,000 rows.');check(rows[0].length<=50,'Too many CSV columns.');return rows;
}
export function statementRows(source,mapping) {
 const [headers,...rows]=parseCSV(source);for(const key of ['date','description'])check(Number.isInteger(mapping[key])&&mapping[key]>=0&&mapping[key]<headers.length,`Map the ${key} column.`);
 const amountMode=Number.isInteger(mapping.amount)&&mapping.amount>=0;
 for(const key of amountMode?['amount']:['money_in','money_out'])check(Number.isInteger(mapping[key])&&mapping[key]>=0&&mapping[key]<headers.length,`Map the ${key} column.`);
 const used=['date','description',...(amountMode?['amount']:['money_in','money_out'])].map(k=>mapping[k]);check(new Set(used).size===used.length,'Map each field to a different column.');
 const read=(s)=>{s=s.trim().replace(/^£\s*/,'');if(!s)return 0n;check(/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s),'Invalid statement amount.');return scaled(s.replaceAll(',',''),2,true);};
 return rows.map((r,index)=>{try{check(r.length===headers.length,'Column count differs from header.');let d=r[mapping.date].trim();const m=d.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);if(m)d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;date(d);let amount;if(amountMode)amount=read(r[mapping.amount]);else{const a=read(r[mapping.money_in]),b=read(r[mapping.money_out]);check(a>=0n&&b>=0n&&!(a&&b),'Use one positive money-in or money-out value.');amount=a-b;}check(amount!==0n,'Zero-value transaction.');return {row:index+2,transaction_date:d,description:text(r[mapping.description],2000,true),amount:money(decimal(amount),true)};}catch(e){throw new ValidationError(`CSV row ${index+2}: ${e.message}`);}});
}
