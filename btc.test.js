import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBTC,fetchBTC,btcEvidence,btcAmount,cleanBTCSnapshot,BTC_API} from './btc.js';
import {saveCase,openCase} from './casefile.js';
import {demoCase} from './demo.js';
import {imagePDF} from './pdf-container.js';
import {reportBlocks} from './pdf.js';
import {report,match} from './core.js';

const txid='a'.repeat(64);
function fixture(){return {txid,fee:1000,size:225,weight:900,vin:[{is_coinbase:false,txid:'b'.repeat(64),vout:1,prevout:{value:100001000,scriptpubkey_address:'synthetic-input',scriptpubkey:'00',scriptpubkey_type:'p2wpkh'}}],vout:[{value:60000000,scriptpubkey_address:'synthetic-output-1',scriptpubkey:'00',scriptpubkey_type:'p2wpkh'},{value:40000000,scriptpubkey_address:'synthetic-output-2',scriptpubkey:'00',scriptpubkey_type:'p2wpkh'}],status:{confirmed:true,block_height:800000,block_hash:'c'.repeat(64),block_time:1690000000}};}
const clock='2026-10-22T07:00:00.000Z';
test('normalization preserves satoshis, outputs and observed confirmations without ownership claims',()=>{
  const b=normalizeBTC(fixture(),txid,800003,clock);
  assert.equal(b.status.confirmations,4);assert.equal(b.feeSatoshis,'1000');assert.equal(b.totalOutputSatoshis,'100000000');
  const e=btcEvidence(b,1);assert.equal(e.amount,'0.40000000');assert.equal(e.review,'unreviewed');assert.equal(e.linked,false);
  assert.equal(e.blockchain.outputs.length,2);assert.equal(btcAmount('1'),'0.00000001');
  assert.throws(()=>btcEvidence(b,-1));assert.throws(()=>normalizeBTC(fixture(),'d'.repeat(64),800003));
});
test('unconfirmed, missing prevouts, coinbase and inconsistent tip remain explicit',()=>{
  const raw=fixture();raw.status={confirmed:false};raw.vin[0].prevout=null;
  const b=normalizeBTC(raw,txid,null,clock);assert.equal(b.status.blockTime,null);assert.equal(b.status.confirmations,0);assert.equal(b.inputs[0].prevout,null);assert.equal(btcEvidence(b,0).date,'');
  raw.vin=[{is_coinbase:true}];assert.equal(normalizeBTC(raw,txid,null,clock).inputs[0].coinbase,true);
  assert.equal(normalizeBTC(fixture(),txid,799999,clock).status.confirmations,null);
});
test('malformed, oversized and lossy provider data is rejected',()=>{
  for(const value of [-1,1.5,Number.MAX_SAFE_INTEGER+1]){const raw=fixture();raw.vout[0].value=value;assert.throws(()=>normalizeBTC(raw,txid,null,clock));}
  const raw=fixture();raw.vout=Array(1001).fill(raw.vout[0]);assert.throws(()=>normalizeBTC(raw,txid,null,clock));
  assert.throws(()=>cleanBTCSnapshot({...normalizeBTC(fixture(),txid,null,clock),sourceUrl:'https://attacker.example'}));
});
test('lookup requires consent and valid ID before any external request',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected');};
  await assert.rejects(()=>fetchBTC(txid,{fetcher}),/Approve/);await assert.rejects(()=>fetchBTC('bad',{consent:true,fetcher}),/64-character/);assert.equal(calls,0);
});
test('lookup uses only fixed GET endpoints, omits credentials/referrer and handles missing tip',async()=>{
  const calls=[];const b=await fetchBTC(txid,{consent:true,fetcher:async(url,options)=>{calls.push({url,options});if(url.endsWith('/height'))throw Error('tip unavailable');return new Response(JSON.stringify(fixture()));}});
  assert.equal(calls.length,2);assert.equal(calls[0].url,`${BTC_API}/tx/${txid}`);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');assert.equal(b.status.confirmations,null);
});
test('404, rate limits, malformed JSON and response limits produce failures',async()=>{
  for(const code of [404,429,503])await assert.rejects(()=>fetchBTC(txid,{consent:true,fetcher:async()=>new Response('',{status:code})}));
  await assert.rejects(()=>fetchBTC(txid,{consent:true,fetcher:async()=>new Response('{bad')}),/malformed JSON/);
  await assert.rejects(()=>fetchBTC(txid,{consent:true,fetcher:async()=>new Response('x',{headers:{'content-length':'2000001'}})}),/size limit/);
  await assert.rejects(()=>fetchBTC(txid,{consent:true,fetcher:async()=>{const error=new Error('aborted');error.name='AbortError';throw error;}}));
});
test('case roundtrip preserves BTC snapshot but never imports live-provider trust',()=>{
  const d=demoCase(),e=btcEvidence(normalizeBTC(fixture(),txid,800001,clock),0);
  const r=openCase(JSON.stringify(saveCase(d.transaction,[{...e,id:'btc-1',review:'reviewed',linked:true}])));
  assert.equal(r.evidence[0].blockchain.acquisition,'case-file-unverified');assert.equal(r.evidence[0].review,'unreviewed');assert.equal(r.evidence[0].linked,false);assert.equal(r.evidence[0].selectedOutput,0);assert.equal(r.evidence[0].blockchain.feeSatoshis,'1000');
});
test('edited or unconfirmed BTC snapshots never manufacture deterministic matches',()=>{
  const e={...btcEvidence(normalizeBTC(fixture(),txid,800001,clock),0),review:'reviewed'};
  const t={amount:e.amount,asset:'BTC',date:e.date,txid};
  assert.equal(match(t,e).candidate,true);
  assert.equal(match({...t,asset:'USD'},{...e,asset:'USD'}).candidate,false);
  assert.equal(match({...t,amount:'5'},{...e,amount:'5'}).candidate,false);
  assert.equal(match(t,{...e,originalRequired:true}).candidate,false);
  const raw=fixture();raw.status={confirmed:false};
  const u={...btcEvidence(normalizeBTC(raw,txid,null,clock),0),review:'reviewed',date:t.date};
  assert.equal(match(t,u).candidate,false);
});
test('PDF report blocks retain gaps, Unicode notes, provenance and each BTC output',()=>{
  const d=demoCase(),e={...btcEvidence(normalizeBTC(fixture(),txid,null,clock),0),id:'btc-1',notes:'Unicode: café, ₹, 日本語'};
  const blocks=reportBlocks(report(d.transaction,[e])).map(b=>b.text).join('\n');
  assert.ok(blocks.includes('Unicode: café, ₹, 日本語'));assert.ok(blocks.includes('ownership: missing evidence'));assert.ok(blocks.includes('Output 1: 40000000 satoshis'));assert.ok(blocks.includes(clock));
});
test('PDF container writes coherent page objects and exact xref offsets',()=>{
  const bytes=imagePDF([{bytes:new Uint8Array([255,216,255,217]),width:1190,height:1684}]);const text=new TextDecoder().decode(bytes);
  assert.ok(text.startsWith('%PDF-1.4'));assert.ok(text.includes('/Count 1'));assert.ok(text.includes('/MediaBox [0 0 595 842]'));
  const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(xref,xref+4),'xref');
  for(const match of text.matchAll(/(\d+) 0 obj/g)){const id=Number(match[1]);const lines=text.slice(xref).split('\n');assert.equal(Number(lines[2+id].slice(0,10)),match.index);}
  assert.throws(()=>imagePDF([]));
});
