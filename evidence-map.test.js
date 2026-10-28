import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapEvidence} from './evidence-map.js';
import {cleanEvidence,saveCase,openCase} from './casefile.js';
import {report,checklist} from './core.js';
const base={role:'bank',amount:'1250.75',asset:'INR',date:'2026-10-23',review:'unreviewed',linked:false};
const pair=(a={},b={})=>[{...base,id:'a',label:'Bank CSV',fileName:'bank.csv',...a},{...base,id:'b',label:'Exchange PDF',fileName:'exchange.pdf',...b}];
test('shared hashes/references create traceable review suggestions without changing links or gaps',()=>{
  const records=pair({reference:'UTR-12345'},{reference:'utr 12345'}),before=JSON.stringify(records),mapping=mapEvidence(records);
  assert.equal(mapping.comparisons.length,1);assert.equal(mapping.comparisons[0].state,'review required');assert.ok(mapping.comparisons[0].signals.includes('reference'));assert.equal(JSON.stringify(records),before);
  assert.equal(checklist({kind:'fiat_deposit'},records).every(c=>!c.complete),true);
});
test('conflicting hashes, assets, amounts and missing dates are explicit; no FX or fee adjustment',()=>{
  const mapping=mapEvidence(pair({txid:'a'.repeat(64)},{txid:'b'.repeat(64)}));assert.equal(mapping.comparisons[0].state,'conflicting fields');
  const identifier=mapEvidence(pair({reference:'REF100',asset:'BTC',amount:'0.01',date:''},{reference:'REF100',asset:'USD',amount:'500'}));assert.ok(identifier.comparisons[0].cautions.some(c=>c.includes('Different or missing asset')));assert.ok(identifier.comparisons[0].cautions.includes('Date is missing'));
  assert.equal(mapEvidence(pair({date:''},{})).comparisons.length,0);
  assert.equal(mapEvidence(pair({amount:'1250.74'},{})).comparisons.length,0);
});
test('same-file duplicate candidates and repeated payments do not imply independent evidence',()=>{
  const records=pair({fileName:'same.csv'},{fileName:'same.csv'});assert.equal(mapEvidence(records).comparisons[0].state,'possible duplicate');
  const comparison=mapEvidence(pair({review:'reviewed'},{review:'reviewed'})).comparisons[0];assert.equal(comparison.state,'candidate only');assert.ok(comparison.cautions.some(c=>c.includes('unrelated or repeated')));
});
test('large repeated groups are bounded and limits are reported',()=>{
  const records=Array.from({length:1000},(_,i)=>({...base,id:'r'+i,label:'Synthetic '+i,reference:'SAME100'}));const mapping=mapEvidence(records,{limit:5});assert.equal(mapping.comparisons.length,5);assert.ok(mapping.warnings.length);assert.equal(mapping.recordsConsidered,1000);
});
test('CSV/manual reference fields survive case reopen and mapping is included in JSON reports',()=>{
  const transaction={kind:'fiat_deposit',title:'Synthetic',amount:'1250.75',asset:'INR',date:'2026-10-23',network:'none'};
  const records=pair({reference:'UTR-12345'},{reference:'UTR12345'}).map(e=>({...cleanEvidence(e),id:e.id,review:'reviewed',linked:true}));
  const reopened=openCase(JSON.stringify(saveCase(transaction,records)));assert.equal(reopened.evidence[0].reference,'UTR-12345');assert.equal(reopened.evidence[0].review,'unreviewed');assert.equal(reopened.evidence[0].linked,false);
  const r=report(transaction,reopened.evidence);assert.equal(r.evidenceMap.comparisons.length,1);assert.equal(r.evidenceMap.comparisons[0].state,'review required');assert.ok(!JSON.stringify(r).includes('blob:'));
});
