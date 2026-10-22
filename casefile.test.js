import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveCase,openCase,validateStructure,cleanTransaction} from './casefile.js';
import {demoCase} from './demo.js';
import {checklist,match,parseCSV} from './core.js';

test('save/reopen omits bytes, rejects imported trust and retains original requirement',()=>{
  const d=demoCase();
  d.evidence[0]={...d.evidence[0],review:'reviewed',linked:true,linkReason:'Historic rationale',file:'SECRET BYTES',preview:'blob:secret',fileName:'original.pdf'};
  const saved=saveCase(d.transaction,d.evidence), json=JSON.stringify(saved);
  assert.ok(!json.includes('SECRET BYTES')); assert.ok(!json.includes('blob:secret'));
  const reopened=openCase(json);
  assert.equal(reopened.evidence[0].review,'unreviewed');assert.equal(reopened.evidence[0].linked,false);
  assert.equal(reopened.evidence[0].originalRequired,true);assert.equal(reopened.evidence[0].linkReason,'');
  assert.equal(reopened.evidence[0].previousLinkReason,'Historic rationale');
  const twice = openCase(JSON.stringify(saveCase(reopened.transaction,reopened.evidence)));
  assert.equal(twice.evidence[0].previousLinkReason,'Historic rationale');
  assert.ok(checklist(reopened.transaction,reopened.evidence).every(x=>!x.complete));
});
test('case import rejects unsupported formats, malformed fields and excess size',()=>{
  const d=demoCase(), saved=saveCase(d.transaction,d.evidence);
  assert.throws(()=>openCase('{}'));assert.throws(()=>openCase('x'.repeat(5_000_001)));
  assert.throws(()=>openCase(JSON.stringify({...saved,version:999})));
  assert.throws(()=>openCase(JSON.stringify({...saved,evidence:[{role:'admin',label:'x'}]})));
  assert.throws(()=>cleanTransaction({...d.transaction,kind:'constructor'}));
  assert.throws(()=>cleanTransaction({...d.transaction,network:'other'}));
  assert.throws(()=>saveCase(d.transaction,Array.from({length:1500},()=>({...d.evidence[0],notes:'x'.repeat(4000)}))));
});
test('BTC and EVM structures preserve exact integer strings and reject lossy numbers',()=>{
  const btc={inputs:[{txid:'a'.repeat(64),vout:0}],outputs:[{address:'user-supplied-address',satoshis:'100000000000000001'}]};
  assert.equal(validateStructure(btc,'BTC').outputs[0].satoshis,'100000000000000001');
  assert.throws(()=>validateStructure({...btc,outputs:[{address:'a',satoshis:1000}]},'BTC'));
  const evm={from:'0x'+'a'.repeat(40),to:'0x'+'b'.repeat(40),valueWei:'100000000000000001',tokenTransfers:[]};
  assert.equal(validateStructure(evm,'EVM').valueWei,'100000000000000001');
  assert.throws(()=>validateStructure({...evm,valueWei:1e18},'EVM'));
  assert.throws(()=>validateStructure({...evm,tokenTransfers:[{contract:evm.from,from:evm.from,to:evm.to,rawAmount:'1',decimals:256}]},'EVM'));
});
test('synthetic end-to-end journey preserves role gaps and cross-asset uncertainty',()=>{
  const d=demoCase();assert.equal(d.evidence.length,8);assert.ok(d.evidence.every(e=>e.label.startsWith('SYNTHETIC')));
  assert.ok(checklist(d.transaction,d.evidence).every(c=>!c.complete));
  assert.equal(match(d.transaction,{...d.evidence[3],review:'reviewed'}).candidate,false);
  assert.equal(match(d.transaction,{...d.evidence[7],review:'reviewed'}).candidate,true);
  const bank={...d.evidence[7],review:'reviewed',linked:true};
  assert.equal(checklist(d.transaction,[bank]).find(c=>c.role==='bank').complete,true);
  assert.equal(checklist(d.transaction,[{...bank,originalRequired:true}]).find(c=>c.role==='bank').complete,false);
  assert.equal(checklist(d.transaction,[bank]).find(c=>c.role==='ownership').complete,false);
});
test('CSV import preserves hostile text as data and rejects duplicate headers and overprecision',()=>{
  const r=parseCSV('date,amount,asset,reference\n2026-10-21,50000,USD,<img src=x onerror=alert(1)>');
  assert.equal(r[0].reference,'<img src=x onerror=alert(1)>');
  assert.throws(()=>parseCSV('date,amount,asset,asset\n2026-10-21,1,USD,USD'));
  assert.throws(()=>parseCSV('date,amount,asset\n2026-10-21,1,"USD"junk'));
  assert.throws(()=>parseCSV('date,amount,asset\n2026-10-21,0.'+'0'.repeat(255)+'1,BTC'));
});
