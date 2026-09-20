import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceTotals, statementRows, parseCSV, money, date } from '../lib/basic-values.mjs';
test('invoice lines calculate exact rounded net and VAT',()=>{
 const result=invoiceTotals([{description:'Service',quantity:'3',unit_price:'0.10',tax_rate:'20'},{description:'Part hour',quantity:'1.125',unit_price:'19.99',tax_rate:'20'}]);
 assert.equal(result.subtotal,'22.79');assert.equal(result.tax_total,'4.56');assert.equal(result.amount,'27.35');
});
test('invoice totals reject invalid inputs and bounds',()=>{
 for(const amount of ['-1','NaN','1e3','0.001','Infinity'])assert.throws(()=>invoiceTotals([{description:'x',quantity:'1',unit_price:amount,tax_rate:'20'}]));
 assert.throws(()=>invoiceTotals([]));assert.throws(()=>invoiceTotals([null]));assert.throws(()=>invoiceTotals([{description:'x',quantity:'0',unit_price:'2',tax_rate:'20'}]));
 assert.throws(()=>invoiceTotals([{description:'x',quantity:'1',unit_price:'2',tax_rate:'101'}]));
 assert.equal(money('9999999999999.99'),'9999999999999.99');assert.throws(()=>money('10000000000000'));
});
test('strict dates reject invalid leap days and out-of-range components',()=>{
 assert.equal(date('2024-02-29'),'2024-02-29');for(const s of ['2025-02-29','2026-99-01','2026-04-31','20/09/2026'])assert.throws(()=>date(s),/valid date/);
});
test('CSV handles BOM, escaped quotes, quoted newlines, CRLF and UK dates',()=>{
 const csv='\uFEFFDate,Details,Amount\r\n20/09/2026,"Payment, ""one""\ncontinued","1,200.50"\r\n21-09-2026,Fee,-2.30';
 const rows=statementRows(csv,{date:0,description:1,amount:2});assert.equal(rows[0].amount,'1200.50');assert.equal(rows[0].transaction_date,'2026-09-20');assert.match(rows[0].description,/"one"/);assert.equal(rows[1].amount,'-2.30');
});
test('CSV supports split columns and reports row errors',()=>{
 assert.equal(statementRows('Date;Text;In;Out\n20.09.2026;Sale;4.25;\n21.09.2026;Cost;;2.10',{date:0,description:1,money_in:2,money_out:3})[1].amount,'-2.10');
 assert.throws(()=>statementRows('Date,Text,Amount\n31/02/2026,Sale,10',{date:0,description:1,amount:2}),/CSV row 2/);
 assert.throws(()=>statementRows('Date,Text,Amount\n20/09/2026,Sale,"1,2"',{date:0,description:1,amount:2}),/CSV row 2/);
 assert.throws(()=>parseCSV('a,b\n"unclosed,5'),/Unclosed/);
 assert.throws(()=>statementRows('Date,Text,Amount\n20/09/2026,Sale,10',{date:0,description:1,amount:1}),/different column/);
});
