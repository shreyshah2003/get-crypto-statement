import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amountValue,dateValues,suggestFields,textLines} from './document-fields.js';
import {validateRead,readAttachment} from './document-reader.js';
import {cleanTransaction,cleanEvidence,saveCase,openCase} from './casefile.js';
import {report} from './core.js';
import {reportBlocks} from './pdf.js';
const page=text=>[{page:2,method:'PDF text',text,confidence:null}];
test('document amounts preserve precision and explicit western/Indian/decimal-comma formats',()=>{
  assert.equal(amountValue('50,000.00'),'50000');assert.equal(amountValue('1,23,456.78'),'123456.78');assert.equal(amountValue('1.234,56','comma'),'1234.56');assert.equal(amountValue('0.000000000000000001'),'0.000000000000000001');
  for(const value of ['12,34.56','1.2.3','0','-50','1e3'])assert.equal(amountValue(value),null);
});
test('ambiguous dates need source order; invalid and two-digit-year dates never guessed',()=>{
  assert.deepEqual(dateValues('03/04/2026'),['2026-04-03','2026-03-04']);assert.deepEqual(dateValues('03/04/2026','dmy'),['2026-04-03']);assert.deepEqual(dateValues('03/04/2026','mdy'),['2026-03-04']);
  assert.deepEqual(dateValues('23/10/2026'),['2026-10-23']);assert.deepEqual(dateValues('2026-02-30'),[]);assert.deepEqual(dateValues('31/02/2026'),[]);assert.deepEqual(dateValues('01/02/26'),[]);
  assert.deepEqual(dateValues('23 October 2026'),['2026-10-23']);assert.deepEqual(dateValues('Oct 23, 2026'),['2026-10-23']);
});
test('suggestions cite page/line/source and compare targets without inventing missing values',()=>{
  const result=suggestFields(page('Transaction date: 2026-10-23\nAmount received: INR 50,000.00\nFee: INR 15.00\nBalance: INR 62,500.00'),{target:{amount:'50000',asset:'INR',date:'2026-10-23'}});
  assert.equal(result.amounts.length,3);assert.equal(result.dates.length,1);const amount=result.amounts.find(a=>a.matchesTarget);assert.equal(amount.page,2);assert.equal(amount.line,2);assert.equal(amount.value,'50000');assert.equal(amount.asset,'INR');assert.ok(amount.snippet.includes('50,000'));assert.equal(result.dates[0].matchesTarget,true);
  const empty=suggestFields(page('No transaction details available'),{target:{amount:'50000',date:'2026-10-23'}});assert.deepEqual(empty.amounts,[]);assert.deepEqual(empty.dates,[]);
});
test('dates, IDs, hashes and time fragments do not become amount candidates',()=>{
  const result=suggestFields(page('Transaction date: 2026-10-23\nAccount ID: 1234567890\nHash: 0x1234567890abcdef\nTime 10:32:45\nAmount\n750.25 USD'));
  assert.deepEqual(result.amounts.map(a=>a.value),['750.25']);
});
test('OCR provenance, confidence and ambiguous date warnings survive candidate parsing',()=>{
  const result=suggestFields([{page:1,method:'OCR',confidence:82,text:'Amount: -1,250.75 INR\nDate: 03/04/2026'}]);
  assert.equal(result.amounts[0].negative,true);assert.equal(result.amounts[0].confidence,82);assert.equal(result.dates.length,2);assert.ok(result.warnings.some(w=>w.includes('two possible')));assert.ok(result.warnings.some(w=>w.includes('OCR')));
});
test('currency symbols stay conservative and extraction treats hostile text as data',()=>{
  const result=suggestFields(page('Amount $100.00\nAmount ₹200.00\nAmount €300.00\nAmount <script> USD 400.00 </script>'));
  assert.equal(result.amounts[0].asset,'');assert.equal(result.amounts[1].asset,'INR');assert.equal(result.amounts[2].asset,'EUR');assert.ok(result.amounts[3].snippet.includes('<script>'));
  assert.equal(suggestFields(page('Amount $100.00'),{target:{amount:'100',asset:'USD'}}).amounts[0].matchesTarget,false);
  assert.deepEqual(suggestFields(page('Amount USD 5O,123.45')).amounts,[]);
});
test('candidate bounds and PDF text line grouping preserve rows and decimal strings',()=>{
  assert.ok(suggestFields(page(Array(600).fill('Amount USD 10.00').join('\n'))).amounts.length<=250);
  assert.equal(textLines([{str:'50,000.00',transform:[1,0,0,1,200,700]},{str:'Amount USD',transform:[1,0,0,1,20,700]},{str:'2026-10-23',transform:[1,0,0,1,20,650]}]),'Amount USD 50,000.00\n2026-10-23');
});
test('reading rejects missing/oversized/unsupported files and invalid ranges before loading libraries',()=>{
  const file={size:100,type:'application/pdf'};assert.doesNotThrow(()=>validateRead(file,1,10));assert.throws(()=>validateRead(file,1,11));assert.throws(()=>validateRead(file,0,1));assert.throws(()=>validateRead(file,2,1));assert.throws(()=>validateRead({...file,size:11*1024*1024},1,1));assert.throws(()=>validateRead({...file,type:'text/html'},1,1));assert.throws(()=>validateRead(null,1,1));
});
test('already cancelled reads stop before loading PDF/OCR code',async()=>{
  const controller=new AbortController();controller.abort();await assert.rejects(readAttachment({size:100,type:'application/pdf'},{signal:controller.signal}),/cancelled/);
});
test('applied source notes survive reports and case reopening without importing review or originals',()=>{
  const transaction=cleanTransaction({kind:'fiat_deposit',title:'Synthetic',amount:'50000',asset:'USD',date:'2026-10-21',network:'none'});
  const notes='Local extraction suggestion (synthetic.pdf, page 1, line 3, PDF text): amount=50000 USD; source: Amount USD 50,000.00. Not independently verified.';
  const evidence={...cleanEvidence({label:'Synthetic',role:'bank',amount:'50000',asset:'USD',date:'2026-10-21',fileName:'synthetic.pdf',notes}),id:'1',file:{name:'synthetic.pdf'},review:'reviewed',linked:true};
  const reopened=openCase(JSON.stringify(saveCase(transaction,[evidence])));assert.equal(reopened.evidence[0].notes,notes);assert.equal(reopened.evidence[0].review,'unreviewed');assert.equal(reopened.evidence[0].linked,false);assert.equal(reopened.evidence[0].originalRequired,true);assert.equal(reopened.evidence[0].file,undefined);
  const r=report(transaction,[evidence]);assert.equal(r.evidence[0].notes,notes);assert.equal(r.evidence[0].file,undefined);assert.ok(reportBlocks(r).some(b=>b.text.includes(notes)));
});
