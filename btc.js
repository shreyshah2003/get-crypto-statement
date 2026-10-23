// Read-only Bitcoin mainnet snapshots. No keys, signing, broadcasting or ownership inference.
export const BTC_API = 'https://mempool.space/api';
export const BTC_LIMIT = 1000;
const MAX_SATS = 2100000000000000;
const hash = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
function uint(v, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(v) || v < 0 || v > max) throw Error('Provider returned an invalid integer.');
  return v;
}
function str(v, max = 20000) {
  if (v == null) return '';
  if (typeof v !== 'string' || v.length > max) throw Error('Provider returned invalid text.');
  return v;
}
export function btcAmount(satoshis) {
  if (typeof satoshis !== 'string' || !/^\d+$/.test(satoshis)) throw Error('Invalid satoshis.');
  const n=BigInt(satoshis); return `${n/100000000n}.${String(n%100000000n).padStart(8,'0')}`;
}
function output(o, index) {
  if (!o || typeof o !== 'object') throw Error('Missing output details.');
  return {index, address:str(o.scriptpubkey_address,120), satoshis:String(uint(o.value,MAX_SATS)), script:str(o.scriptpubkey), scriptType:str(o.scriptpubkey_type,80)};
}
export function normalizeBTC(raw, requestedId, tipHeight, retrievedAt = new Date().toISOString()) {
  if (!hash(requestedId) || !raw || !hash(raw.txid) || raw.txid.toLowerCase() !== requestedId.toLowerCase()) throw Error('Provider transaction ID does not match the request.');
  if (!Array.isArray(raw.vin) || !raw.vin.length || raw.vin.length>BTC_LIMIT || !Array.isArray(raw.vout) || !raw.vout.length || raw.vout.length>BTC_LIMIT) throw Error('Unsupported transaction size (limit 1,000 inputs/outputs).');
  if (typeof raw.status?.confirmed !== 'boolean') throw Error('Provider confirmation status is missing.');
  if (typeof retrievedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T/.test(retrievedAt) || !Number.isFinite(Date.parse(retrievedAt))) throw Error('Invalid retrieval time.');
  const inputs=raw.vin.map((i,index)=>{
    if (!i || typeof i.is_coinbase !== 'boolean') throw Error('Invalid input details.');
    if (i.is_coinbase) return {index,coinbase:true,previousTxid:null,previousOutput:null,prevout:null};
    if (!hash(i.txid)) throw Error('Invalid previous transaction ID.');
    return {index,coinbase:false,previousTxid:i.txid.toLowerCase(),previousOutput:uint(i.vout,4294967295),prevout:i.prevout == null ? null : output(i.prevout,i.vout)};
  });
  const outputs=raw.vout.map(output);
  const total=outputs.reduce((sum,o)=>sum+BigInt(o.satoshis),0n);
  if (total>BigInt(MAX_SATS)) throw Error('Invalid total output amount.');
  const confirmed=raw.status.confirmed;
  let blockHeight=null,blockHash=null,blockTime=null;
  if (confirmed) {
    blockHeight=uint(raw.status.block_height);
    if (!hash(raw.status.block_hash)) throw Error('Confirmed snapshot is missing its block hash.');
    blockHash=raw.status.block_hash.toLowerCase(); blockTime=uint(raw.status.block_time,253402300799);
  }
  const tip=tipHeight == null ? null : uint(tipHeight);
  return {version:1,network:'bitcoin-mainnet',provider:'mempool.space',sourceUrl:`${BTC_API}/tx/${requestedId.toLowerCase()}`,retrievedAt,acquisition:'live-provider',txid:raw.txid.toLowerCase(),feeSatoshis:String(uint(raw.fee,MAX_SATS)),sizeBytes:uint(raw.size),weight:uint(raw.weight),inputs,outputs,totalOutputSatoshis:String(total),status:{confirmed,blockHeight,blockHash,blockTime,tipHeight:tip,confirmations:confirmed?(tip!==null&&tip>=blockHeight?tip-blockHeight+1:null):0},limitations:['Provider-reported snapshot, not independently cryptographically verified.','Confirmations are calculated from separately retrieved tip height and may change or be affected by reorgs.','Output totals are not a recipient payment or net wallet change. Ownership and source of funds are unverified.']};
}

// Validate case-file metadata by reconstructing a whitelisted provider-shaped record.
export function cleanBTCSnapshot(value) {
  if (value == null) return null;
  if (value.version!==1 || value.network!=='bitcoin-mainnet' || value.provider!=='mempool.space' || !hash(value.txid) || value.sourceUrl!==`${BTC_API}/tx/${value.txid.toLowerCase()}`) throw Error('Unsupported BTC snapshot.');
  function rawOutput(o) {
    if (!o || typeof o.satoshis!=='string' || !/^\d{1,16}$/.test(o.satoshis)) throw Error('Invalid BTC snapshot output.');
    return {value:Number(o.satoshis),scriptpubkey_address:o.address,scriptpubkey:o.script,scriptpubkey_type:o.scriptType};
  }
  if (!Array.isArray(value.inputs) || !Array.isArray(value.outputs)) throw Error('Invalid BTC snapshot.');
  if (typeof value.feeSatoshis!=='string' || !/^\d{1,16}$/.test(value.feeSatoshis)) throw Error('Invalid BTC snapshot fee.');
  const s=value.status || {};
  const raw={txid:value.txid,fee:Number(value.feeSatoshis),size:value.sizeBytes,weight:value.weight,vin:value.inputs.map(i=>({is_coinbase:i.coinbase,txid:i.previousTxid,vout:i.previousOutput,prevout:i.prevout==null?null:rawOutput(i.prevout)})),vout:value.outputs.map(rawOutput),status:{confirmed:s.confirmed,block_height:s.blockHeight,block_hash:s.blockHash,block_time:s.blockTime}};
  const result=normalizeBTC(raw,value.txid,s.tipHeight,value.retrievedAt);
  result.acquisition=value.acquisition==='live-provider'?'live-provider':'case-file-unverified';
  return result;
}

export async function fetchBTC(txid, {consent=false, fetcher=globalThis.fetch}={}) {
  if (!consent) throw Error('Approve sending the transaction ID to mempool.space first.');
  if (!hash(txid)) throw Error('Enter a 64-character Bitcoin transaction ID.');
  txid=txid.toLowerCase();
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  async function read(url,max) {
    const response=await fetcher(url,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal});
    if (!response.ok) throw Error(response.status===404?'Transaction not found on Bitcoin mainnet.':response.status===429?'Provider rate limit reached. Try again later.':'BTC provider is unavailable.');
    if (Number(response.headers.get('content-length'))>max) throw Error('Provider response exceeds the size limit.');
    const reader=response.body?.getReader();
    if (!reader) {const body=await response.text();if(new TextEncoder().encode(body).length>max) throw Error('Provider response exceeds the size limit.');return body;}
    const chunks=[];let size=0;
    try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Provider response exceeds the size limit.');}chunks.push(value);}}
    finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
  }
  try {
    const body=await read(`${BTC_API}/tx/${txid}`,2_000_000);
    const observedAt=new Date().toISOString();
    // Validate transaction before making the optional second request.
    normalizeBTC(JSON.parse(body),txid,null,observedAt);
    let tip=null;
    try {const text=await read(`${BTC_API}/blocks/tip/height`,32);if(/^\d+$/.test(text.trim()))tip=Number(text.trim());} catch { /* Preserve the transaction even if tip-height lookup fails. */ }
    return normalizeBTC(JSON.parse(body),txid,tip,observedAt);
  } catch (e) {
    if (controller.signal.aborted) throw Error('BTC lookup timed out. Try again; no evidence was added.');
    if (e instanceof SyntaxError) throw Error('Provider returned malformed JSON. No evidence was added.');
    if (e instanceof TypeError) throw Error('BTC lookup could not connect. Check the provider or network; no evidence was added.');
    throw e;
  } finally { clearTimeout(timer); }
}

export function btcEvidence(snapshot, outputIndex) {
  const clean=cleanBTCSnapshot(snapshot), selected=clean.outputs[outputIndex];
  if (!Number.isInteger(outputIndex) || !selected || BigInt(selected.satoshis)===0n) throw Error('Choose a positive output to describe; output totals are not a payment amount.');
  return {role:'chain',label:`BTC output ${outputIndex} — ${clean.txid.slice(0,12)}`,asset:'BTC',amount:btcAmount(selected.satoshis),date:clean.status.blockTime===null?'':new Date(clean.status.blockTime*1000).toISOString().slice(0,10),txid:clean.txid,notes:`User selected output ${outputIndex}; recipient ${selected.address || '(no address; inspect script)'}. Ownership is unverified. ${clean.status.confirmed?'Date is the provider-reported block date, not payment initiation.':'Unconfirmed: no block date available.'}`,provenance:'mempool.space BTC snapshot',review:'unreviewed',linked:false,blockchain:clean,selectedOutput:outputIndex};
}
