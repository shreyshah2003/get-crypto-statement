import {canonicalAmount,formatUnits} from './amount.js';
import {mapEvidence} from './evidence-map.js';
export const requirements={fiat_deposit:['bank','source'],crypto_deposit:['chain','ownership','source'],cash_out:['chain','exchange','bank','ownership','source']};
export function decimal(value){if(!/^\d+(\.\d{1,18})?$/.test(String(value)))throw Error('Use a positive decimal with up to 18 decimal places.');const [a,b='']=String(value).split('.');const n=BigInt(a+b.padEnd(18,'0'));if(n<=0n)throw Error('Amount must be greater than zero.');return n;}
export function validateTransaction(t){canonicalAmount(t.amount);if(!Object.hasOwn(requirements,t.kind))throw Error('Choose a case type.');if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date)throw Error('Enter a valid date.');if(!/^[A-Z0-9]{2,12}$/.test(t.asset))throw Error('Enter an asset or currency code.');if(t.network==='BTC'&&!/^[a-f0-9]{64}$/i.test(t.txid))throw Error('BTC transaction IDs require 64 hexadecimal characters.');if(t.network==='EVM'&&(!/^0x[a-f0-9]{64}$/i.test(t.txid)||!/^\d+$/.test(t.chainId)||BigInt(t.chainId)<=0n))throw Error('EVM requires a transaction hash and positive chain ID.');return t;}
export function parseCSV(text) {
  if (text.length > 2_000_000) throw Error('CSV exceeds 2 MB limit.');
  const rows = [];
  let row = [], cell = '', quoted = false, closedQuote = false;
  const finishCell = () => { row.push(cell); cell = ''; closedQuote = false; };
  const finishRow = () => { finishCell(); if (row.some(Boolean)) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else cell += c;
    } else if (c === ',') finishCell();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      finishRow();
    } else if (c === '"' && !cell && !closedQuote) quoted = true;
    else {
      if (closedQuote || c === '"') throw Error('Malformed CSV quotes.');
      cell += c;
    }
  }
  if (quoted) throw Error('Unclosed CSV quote.');
  finishRow();
  if (!rows.length) throw Error('CSV is empty.');
  const headers = rows.shift().map(x => x.trim().replace(/^\uFEFF/, '').toLowerCase());
  if (new Set(headers).size !== headers.length) throw Error('Duplicate CSV headers.');
  for (const key of ['date','amount','asset']) if (!headers.includes(key)) throw Error('CSV requires date, amount, asset headers.');
  if (rows.length > 5000) throw Error('Limit CSV to 5,000 rows.');
  return rows.map((r, index) => {
    if (r.length !== headers.length) throw Error('Row ' + (index + 2) + ': column count differs.');
    const item = Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
    try { validateTransaction({...item, asset:item.asset.toUpperCase(), kind:'fiat_deposit', network:'none'}); }
    catch (e) { throw Error('Row ' + (index + 2) + ': ' + e.message); }
    return {...item, asset:item.asset.toUpperCase(), row:index + 2};
  });
}
export function match(t,e) {
  const reasons=[];
  if(e.originalRequired) return {candidate:false,reasons:['Original attachment is missing']};
  if(e.review!=='reviewed') return {candidate:false,reasons:['Evidence has not been reviewed']};
  if(e.blockchain) {
    try {
      const b=e.blockchain, output=b.outputs[e.selectedOutput];
      if(!b.status.confirmed) return {candidate:false,reasons:['BTC snapshot is unconfirmed; confirmation and date gaps need review']};
      const blockDate=new Date(b.status.blockTime*1000).toISOString().slice(0,10);
      if(!output || e.asset!=='BTC' || String(e.txid).toLowerCase()!==b.txid || canonicalAmount(e.amount)!==canonicalAmount(formatUnits(output.satoshis,8)) || e.date!==blockDate)
        return {candidate:false,reasons:['Entered fields differ from the preserved BTC snapshot; explain any conversion or date adjustment manually']};
    } catch { return {candidate:false,reasons:['BTC snapshot fields are incomplete or inconsistent']}; }
  }
  if(e.evm){
    try{
      const s=e.evm,transfer=s.transfers.find(x=>x.id===e.selectedTransfer);
      if(s.state!=='succeeded'||!s.canonicalChecked||!transfer||transfer.decimals===null)return {candidate:false,reasons:['EVM execution, canonical block, transfer or token decimals need review']};
      if(t.network!=='EVM'||t.chainId!==s.chainId)return {candidate:false,reasons:['EVM network/chain ID differs or is unspecified']};
      if(transfer.kind==='native'?(e.asset!=='ETH'||t.asset!=='ETH'||Boolean(t.tokenContract)):(String(t.tokenContract||'').toLowerCase()!==transfer.contract))return {candidate:false,reasons:['EVM token contract/native asset differs or is unspecified']};
      const date=new Date(Number(s.block.timestamp)*1000).toISOString().slice(0,10);
      if(String(e.txid).toLowerCase()!==s.transaction.hash||canonicalAmount(e.amount)!==canonicalAmount(transfer.amount)||e.date!==date)return {candidate:false,reasons:['Entered fields differ from the preserved EVM transfer snapshot']};
      reasons.push('EVM chain and contract/native identity agree');
    }catch{return {candidate:false,reasons:['EVM snapshot fields are incomplete or inconsistent']};}
  }
  if(e.asset!==t.asset) return {candidate:false,reasons:['Different asset; conversion requires separate evidence']};
  try { if(canonicalAmount(e.amount)!==canonicalAmount(t.amount)) return {candidate:false,reasons:['Amount differs; no fee or FX assumptions applied']}; }
  catch { return {candidate:false,reasons:['Missing or invalid amount']}; }
  const days=Math.abs(Date.parse(t.date)-Date.parse(e.date))/86400000;
  if(!Number.isFinite(days)||days>3) return {candidate:false,reasons:['Outside the 3-day window']};
  reasons.push('Exact asset and amount',days+' day date difference');
  if(e.txid&&t.txid) {
    if(e.txid.toLowerCase()!==t.txid.toLowerCase()) return {candidate:false,reasons:['Transaction ID conflicts']};
    reasons.push('Transaction ID agrees');
  }
  return {candidate:true,reasons};
}
export function checklist(t,evidence){return requirements[t.kind].map(role=>{const linked=evidence.filter(e=>e.role===role&&e.linked&&e.review==='reviewed'&&!e.originalRequired);return {role,complete:linked.length>0,evidenceIds:linked.map(e=>e.id)};});}
export function report(t,evidence){return {schemaVersion:1,generatedAt:new Date().toISOString(),title:'Crypto Passport — evidence summary',limitations:['User-entered evidence, optional local PDF/OCR suggestions and provider-reported BTC/EVM snapshots; no independent cryptographic, ownership or source-of-funds verification, tax or compliance conclusion.','Extraction can misread digits, dates and document context. Applied values require human review; source/page notes preserve the selected suggestion.','Linked evidence reflects manual review. Exact amount matching does not establish source of funds.','Original files remain in this browser session and are not embedded in exports.'],transaction:t,evidence:evidence.map(({file,preview,...e})=>({...e,match:match(t,e)})),checklist:checklist(t,evidence),evidenceMap:mapEvidence(evidence)};}
