import {validateTransaction} from './core.js';
import {cleanBTCSnapshot} from './btc.js';
import {cleanEVMSnapshot} from './evm.js';
import {canonicalAmount} from './amount.js';

const roles = ['bank', 'exchange', 'chain', 'ownership', 'source'];
const networks = ['none', 'BTC', 'EVM'];
const text = (value, max = 4000) => {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw Error('Invalid or oversized text field.');
  return value;
};
const integerString = value => typeof value === 'string' && /^\d{1,80}$/.test(value);
const address = value => typeof value === 'string' && /^0x[a-f0-9]{40}$/i.test(value);

export function validateStructure(x, network) {
  if (x === null || x === undefined) return null;
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('Invalid chain details.');
  if (network === 'BTC') {
    if (!Array.isArray(x.inputs) || !Array.isArray(x.outputs) || !x.inputs.length || !x.outputs.length || x.inputs.length > 100 || x.outputs.length > 100) throw Error('BTC requires 1–100 inputs and outputs.');
    return {
      inputs: x.inputs.map(i => {
        if (!i || !/^[a-f0-9]{64}$/i.test(i.txid) || !Number.isSafeInteger(i.vout) || i.vout < 0) throw Error('Invalid BTC input outpoint.');
        return {txid: i.txid, vout: i.vout};
      }),
      outputs: x.outputs.map(o => {
        if (!o || !text(o.address, 120).trim() || !integerString(o.satoshis)) throw Error('BTC outputs need an address and whole satoshis.');
        return {address: o.address, satoshis: o.satoshis};
      })
    };
  }
  if (network === 'EVM') {
    if (!address(x.from) || !address(x.to) || !integerString(x.valueWei)) throw Error('EVM needs from/to addresses and whole wei.');
    if (!Array.isArray(x.tokenTransfers || []) || (x.tokenTransfers || []).length > 100) throw Error('Invalid token transfers.');
    return {from: x.from, to: x.to, valueWei: x.valueWei, tokenTransfers: (x.tokenTransfers || []).map(t => {
      if (!t || !address(t.contract) || !address(t.from) || !address(t.to) || !integerString(t.rawAmount) || !Number.isInteger(t.decimals) || t.decimals < 0 || t.decimals > 255) throw Error('Invalid EVM token transfer.');
      return {contract: t.contract, from: t.from, to: t.to, rawAmount: t.rawAmount, decimals: t.decimals};
    })};
  }
  throw Error('Chain details need a BTC or EVM network.');
}

export function cleanTransaction(t) {
  if (!t || !networks.includes(t.network)) throw Error('Invalid transaction network.');
  const result = Object.fromEntries(['kind','title','amount','asset','date','network','txid','chainId','tokenContract','narrative'].map(k => [k, text(t[k])]));
  if (!result.title.trim() || result.title.length > 120) throw Error('Enter a case title (up to 120 characters).');
  validateTransaction(result);
  if(result.tokenContract&&!address(result.tokenContract))throw Error('Enter a valid EVM token contract address.');
  result.tokenContract=result.network==='EVM'?result.tokenContract.toLowerCase():'';
  if (result.network !== 'EVM') result.chainId = '';
  else result.chainId=String(BigInt(result.chainId));
  result.structure = validateStructure(t.structure, t.network);
  return result;
}

export function cleanEvidence(e) {
  if (!e || !roles.includes(e.role)) throw Error('Invalid evidence role.');
  const result = Object.fromEntries(['label','role','amount','asset','date','txid','notes','fileName','provenance','linkReason'].map(k => [k, text(e[k])]));
  if (!result.label.trim() || result.label.length > 160) throw Error('Evidence needs a label (up to 160 characters).');
  if (result.amount) canonicalAmount(result.amount);
  if (result.asset && !/^[A-Z0-9]{2,12}$/.test(result.asset)) throw Error('Invalid evidence asset.');
  if (result.date && (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !Number.isFinite(Date.parse(result.date)) || new Date(result.date).toISOString().slice(0,10) !== result.date)) throw Error('Invalid evidence date.');
  if (e.blockchain != null) {
    result.blockchain=cleanBTCSnapshot(e.blockchain);
    if (!Number.isInteger(e.selectedOutput) || !result.blockchain.outputs[e.selectedOutput]) throw Error('Invalid selected BTC output.');
    result.selectedOutput=e.selectedOutput;
  }
  if(e.evm!=null){
    if(e.blockchain!=null)throw Error('Evidence cannot contain both BTC and EVM snapshots.');
    result.evm=cleanEVMSnapshot(e.evm);
    if(e.selectedTransfer!=='status'&&!result.evm.transfers.some(t=>t.id===e.selectedTransfer))throw Error('Invalid selected EVM transfer.');
    result.selectedTransfer=e.selectedTransfer;
  }
  return result;
}

// Original bytes and browser blob URLs are deliberately never serialized.
export function saveCase(transaction, evidence) {
  const saved = {format: 'crypto-passport-case', version: 1, savedAt: new Date().toISOString(), transaction: cleanTransaction(transaction), evidence: evidence.map(e => ({...cleanEvidence(e), id: e.id, review: e.review, linked: e.linked, previousLinkReason: text(e.previousLinkReason), originalRequired: Boolean(e.file || e.originalRequired)}))};
  if (new TextEncoder().encode(JSON.stringify(saved, null, 2)).length > 5_000_000) throw Error('Case exceeds the 5 MB reopen limit. Reduce evidence or notes before saving.');
  return saved;
}

export function openCase(raw) {
  if (typeof raw !== 'string' || raw.length > 5_000_000) throw Error('Case file exceeds 5 MB.');
  const value = JSON.parse(raw);
  if (value.format !== 'crypto-passport-case' || value.version !== 1 || !Array.isArray(value.evidence) || value.evidence.length > 5000) throw Error('Unsupported case file. Choose a saved case, not a report export.');
  const transaction = cleanTransaction(value.transaction);
  const evidence = value.evidence.map((e, index) => {
    const cleaned=cleanEvidence(e);
    if (cleaned.blockchain) cleaned.blockchain.acquisition='case-file-unverified';
    if(cleaned.evm)cleaned.evm.acquisition='case-file-unverified';
    return {...cleaned, id: `reopened-${index + 1}`, review: 'unreviewed', linked: false, linkReason: '', previousLinkReason: text(e.linkReason) || text(e.previousLinkReason), originalRequired: Boolean(e.originalRequired), provenance: text(e.provenance) || 'Reopened case'};
  });
  return {transaction, evidence};
}
