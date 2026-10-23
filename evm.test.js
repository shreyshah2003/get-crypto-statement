import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEVM,cleanEVMSnapshot,fetchEVM,evmEvidence,EVM_RPC,TRANSFER_TOPIC} from './evm.js';
import {canonicalAmount,formatUnits} from './amount.js';
import {saveCase,openCase} from './casefile.js';
import {match,report} from './core.js';
import {reportBlocks} from './pdf.js';
import {demoCase} from './demo.js';

const txHash='0x'+'a'.repeat(64),blockHash='0x'+'b'.repeat(64),from='0x'+'1'.repeat(40),to='0x'+'2'.repeat(40),contract='0x'+'3'.repeat(40),clock='2026-10-22T08:00:00.000Z';
const hx=n=>'0x'+BigInt(n).toString(16),word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0'),topic=a=>'0x'+a.slice(2).padStart(64,'0');
function fixture(){
  const transaction={hash:txHash,chainId:'0x1',type:'0x2',from,to,value:hx(1000000000000000001n),gas:'0x186a0',gasPrice:hx(1000000000),blockHash,blockNumber:'0x64'};
  const logs=[{address:contract,topics:[TRANSFER_TOPIC,topic(from),topic(to)],data:word(1000001),logIndex:'0x0',transactionHash:txHash,blockHash,blockNumber:'0x64',removed:false}];
  const receipt={transactionHash:txHash,blockHash,blockNumber:'0x64',from,to,status:'0x1',gasUsed:'0x5208',effectiveGasPrice:hx(1000000000),contractAddress:null,logs};
  return {chainId:'0x1',transaction,receipt,block:{hash:blockHash,number:'0x64',timestamp:hx(1760000000)},tip:'0x66',canonicalBlock:{hash:blockHash,number:'0x64'},tokenDecimals:{[contract]:word(6)}};
}
test('Ethereum native/token amounts, block identity and fees use exact integers',()=>{
  const s=normalizeEVM(fixture(),txHash,clock);
  assert.equal(s.state,'succeeded');assert.equal(s.confirmations,'3');assert.equal(s.fees.executionWei,'21000000000000');assert.equal(s.fees.totalWei,'21000000000000');
  assert.equal(s.transfers[0].amount,'1.000000000000000001');assert.equal(s.transfers[1].amount,'1.000001');assert.equal(s.transfers[1].contract,contract);assert.equal(s.transfers[1].id,'log:0');
  assert.equal(evmEvidence(s,'log:0').review,'unreviewed');assert.throws(()=>evmEvidence(s,'invalid'));
});
test('pending, failed and unavailable receipt/status never imply completed transfers',()=>{
  const b=fixture();b.receipt.status='0x0';const failed=normalizeEVM(b,txHash,clock);assert.equal(failed.state,'failed');assert.equal(failed.transfers.length,0);assert.equal(evmEvidence(failed,'status').amount,'');assert.throws(()=>evmEvidence(failed,'native'));
  b.receipt=null;b.block=null;const unavailable=normalizeEVM(b,txHash,clock);assert.equal(unavailable.state,'receipt-unavailable');
  b.transaction.blockHash=null;b.transaction.blockNumber=null;assert.equal(normalizeEVM(b,txHash,clock).state,'pending');
  const old=fixture();old.receipt.status=null;assert.equal(normalizeEVM(old,txHash,clock).state,'status-unavailable');assert.equal(normalizeEVM(old,txHash,clock).transfers.length,0);
});
test('wrong chains, hashes, blocks, receipt identities and duplicate/removed logs are rejected',()=>{
  const changes=[b=>b.chainId='0x2',b=>b.transaction.chainId='0x2',b=>b.receipt.transactionHash='0x'+'d'.repeat(64),b=>b.receipt.from=to,b=>b.block.hash='0x'+'d'.repeat(64),b=>b.canonicalBlock.hash='0x'+'d'.repeat(64),b=>b.receipt.logs.push(b.receipt.logs[0]),b=>b.receipt.logs[0].removed=true,b=>b.receipt.gasUsed='0xffffff'];
  for(const change of changes){const b=fixture();change(b);assert.throws(()=>normalizeEVM(b,txHash,clock));}
  assert.throws(()=>normalizeEVM(fixture(),'0x'+'e'.repeat(64),clock));
});
test('NFT-shaped events are excluded and missing/invalid decimals remain unknown',()=>{
  const b=fixture();b.tokenDecimals={};let s=normalizeEVM(b,txHash,clock);assert.equal(s.transfers[1].decimals,null);assert.equal(s.transfers[1].amount,null);assert.equal(evmEvidence(s,'log:0').amount,'');
  b.tokenDecimals={[contract]:word(256)};assert.equal(normalizeEVM(b,txHash,clock).transfers[1].decimals,null);
  b.receipt.logs[0].topics.push(word(7));b.receipt.logs[0].data='0x';s=normalizeEVM(b,txHash,clock);assert.equal(s.transfers.length,1);assert.equal(s.receipt.logs.length,1);
});
test('255 token decimals and full uint256 values are preserved without rounding',()=>{
  const b=fixture();b.tokenDecimals[contract]=word(255);b.receipt.logs[0].data=word(1);const s=normalizeEVM(b,txHash,clock);
  assert.equal(s.transfers[1].amount,'0.'+'0'.repeat(254)+'1');assert.equal(canonicalAmount(s.transfers[1].amount),s.transfers[1].amount);
  const d=demoCase(),entry={...evmEvidence(s,'log:0'),id:'precision'};assert.equal(openCase(JSON.stringify(saveCase(d.transaction,[entry]))).evidence[0].amount,s.transfers[1].amount);
  const max=String((1n<<256n)-1n);assert.equal(formatUnits(max,0),max);assert.equal(formatUnits('1000000',6),'1');
  assert.equal(canonicalAmount('0001.0000'),'1');assert.throws(()=>canonicalAmount('0.'+'0'.repeat(255)+'1'));
});
test('gas fees distinguish effective prices, legacy fallback and blob-fee incompleteness',()=>{
  const b=fixture();b.transaction.type='0x3';assert.equal(normalizeEVM(b,txHash,clock).fees.totalWei,null);
  b.receipt.blobGasUsed='0x2';b.receipt.blobGasPrice='0x3';assert.equal(normalizeEVM(b,txHash,clock).fees.totalWei,'21000000000006');
  b.transaction.type='0x2';b.receipt.effectiveGasPrice=null;assert.equal(normalizeEVM(b,txHash,clock).fees.executionWei,null);
  b.transaction.type='0x0';assert.equal(normalizeEVM(b,txHash,clock).fees.executionWei,'21000000000000');
});
test('contract creation and incomplete canonical observations stay explicit',()=>{
  const b=fixture();b.transaction.to=null;b.receipt.to=null;b.receipt.contractAddress=contract;b.canonicalBlock=null;b.tip='0x1';const s=normalizeEVM(b,txHash,clock);
  assert.equal(s.transfers[0].to,contract);assert.equal(s.canonicalChecked,false);assert.equal(s.confirmations,null);
});
test('case reopening preserves EVM provenance but resets acquisition/review/link trust',()=>{
  const d=demoCase(),e={...evmEvidence(normalizeEVM(fixture(),txHash,clock),'log:0'),id:'evm-1',review:'reviewed',linked:true};
  const saved=saveCase(d.transaction,[e]);const restored=openCase(JSON.stringify(saved));assert.equal(restored.evidence[0].evm.acquisition,'case-file-unverified');assert.equal(restored.evidence[0].review,'unreviewed');assert.equal(restored.evidence[0].linked,false);assert.equal(restored.evidence[0].evm.transfers[1].rawAmount,'1000001');
  assert.throws(()=>cleanEVMSnapshot({...e.evm,sourceUrl:'https://attacker.example'}));
  assert.throws(()=>cleanEVMSnapshot({...e.evm,canonicalChecked:'yes'}));assert.throws(()=>cleanEVMSnapshot({...e.evm,tokenMetadata:[...e.evm.tokenMetadata,...e.evm.tokenMetadata]}));
});
test('matching requires correct chain, native/token identity and unchanged snapshot values',()=>{
  const s=normalizeEVM(fixture(),txHash,clock),e={...evmEvidence(s,'log:0'),review:'reviewed',asset:'USDC'};
  const t={network:'EVM',chainId:'1',asset:'USDC',tokenContract:contract,amount:e.amount,date:e.date,txid:txHash};
  assert.equal(match(t,e).candidate,true);assert.equal(match({...t,chainId:'2'},e).candidate,false);assert.equal(match({...t,tokenContract:to},e).candidate,false);
  assert.equal(match({...t,amount:'2'},{...e,amount:'2'}).candidate,false);assert.equal(match(t,{...e,selectedTransfer:'status'}).candidate,false);
  const native={...evmEvidence(s,'native'),review:'reviewed'};assert.equal(match({...t,asset:'ETH',tokenContract:'',amount:native.amount},native).candidate,true);
});
test('Ethereum snapshot status, exact values, contract and fees reach PDF report blocks',()=>{
  const d=demoCase(),e={...evmEvidence(normalizeEVM(fixture(),txHash,clock),'log:0'),id:'evm-1'};
  const body=reportBlocks(report(d.transaction,[e])).map(b=>b.text).join('\n');assert.ok(body.includes('Ethereum provider snapshot'));assert.ok(body.includes('21000000000000'));assert.ok(body.includes(contract));assert.ok(body.includes('1000001 raw units'));assert.ok(body.includes('ownership: missing evidence'));
});
function mockProvider(bundle,calls=[],options={}){return async(url,request)=>{
  const body=JSON.parse(request.body);calls.push({url,request,body});let result;
  switch(body.method){case'eth_chainId':result=bundle.chainId;break;case'eth_getTransactionByHash':result=bundle.transaction;break;case'eth_getTransactionReceipt':result=bundle.receipt;break;case'eth_getBlockByHash':result=bundle.block;break;case'eth_getBlockByNumber':result=bundle.canonicalBlock;break;case'eth_blockNumber':result=bundle.tip;break;case'eth_call':if(options.metadataError)return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,error:{code:-32000}}));result=bundle.tokenDecimals?.[body.params[0].to]||'0x';break;default:throw Error('Unexpected RPC method');}
  return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result}));
};}
test('consent and invalid hash reject before any RPC; wrong chain stops immediately',async()=>{
  const calls=[],fetcher=mockProvider(fixture(),calls);await assert.rejects(()=>fetchEVM(txHash,{fetcher}),/Approve/);await assert.rejects(()=>fetchEVM('bad',{consent:true,fetcher}),/transaction hash/);assert.equal(calls.length,0);
  const b=fixture();b.chainId='0x2';await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:mockProvider(b,calls)}),/Wrong provider chain/);assert.equal(calls.length,1);
});
test('RPC calls are read-only, bounded to the fixed endpoint and omit credentials/referrer',async()=>{
  const calls=[],s=await fetchEVM(txHash,{consent:true,fetcher:mockProvider(fixture(),calls)});assert.equal(s.transfers[1].decimals,6);assert.ok(calls.length<=16);
  for(const c of calls){assert.equal(c.url,EVM_RPC);assert.equal(c.request.method,'POST');assert.equal(c.request.credentials,'omit');assert.equal(c.request.referrerPolicy,'no-referrer');assert.ok(!/send|sign|wallet/.test(c.body.method));}
  const metadata=calls.find(c=>c.body.method==='eth_call');assert.equal(metadata.body.params[1].blockHash,blockHash);assert.equal(metadata.body.params[1].requireCanonical,true);
  const unknown=await fetchEVM(txHash,{consent:true,fetcher:mockProvider(fixture(),[],{metadataError:true})});assert.equal(unknown.transfers[1].decimals,null);
});
test('not found, rate limit, malformed RPC, wrong IDs and size limits fail clearly',async()=>{
  const empty=fixture();empty.transaction=null;empty.receipt=null;await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:mockProvider(empty)}),/not found/);
  await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:async()=>new Response('',{status:429})}),/rate limit/);
  await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:async()=>new Response('{bad')}),/malformed JSON/);
  await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:999,result:'0x1'}))}),/mismatch/);
  await assert.rejects(()=>fetchEVM(txHash,{consent:true,fetcher:async()=>new Response('x',{headers:{'content-length':'2000001'}})}),/2 MB/);
});
