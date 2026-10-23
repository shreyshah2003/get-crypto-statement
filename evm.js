import {formatUnits} from './amount.js';

export const EVM_RPC='https://eth.drpc.org';
export const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MAX=(1n<<256n)-1n;
const isHash=v=>typeof v==='string'&&/^0x[a-f0-9]{64}$/i.test(v);
const isAddress=v=>typeof v==='string'&&/^0x[a-f0-9]{40}$/i.test(v);
function address(v,nullable=false){if(v===null&&nullable)return null;if(!isAddress(v))throw Error('Invalid EVM address in provider data.');return v.toLowerCase();}
function hash(v){if(!isHash(v))throw Error('Invalid EVM hash in provider data.');return v.toLowerCase();}
function quantity(v){if(typeof v!=='string'||!/^0x(?:0|[1-9a-f][a-f0-9]{0,63})$/i.test(v))throw Error('Invalid EVM integer quantity.');return String(BigInt(v));}
function hex(v){if(typeof v!=='string'||!/^\d{1,78}$/.test(v)||BigInt(v)>MAX)throw Error('Invalid saved EVM integer.');return '0x'+BigInt(v).toString(16);}
function optionalQuantity(v){return v==null?null:quantity(v);}
function product(a,b){if(a===null||b===null)return null;const n=BigInt(a)*BigInt(b);if(n>MAX)throw Error('Invalid EVM fee amount.');return String(n);}
function iso(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Invalid EVM observation time.');return value;}
function blockRecord(block){if(!block)return null;const timestamp=quantity(block.timestamp);if(BigInt(timestamp)>253402300799n)throw Error('Invalid EVM block time.');return {hash:hash(block.hash),number:quantity(block.number),timestamp};}
function logRecord(l,txHash,blockHash,blockNumber) {
  if(!l||l.removed===true||hash(l.transactionHash)!==txHash||hash(l.blockHash)!==blockHash||quantity(l.blockNumber)!==blockNumber)throw Error('Receipt logs disagree with the transaction block. Retry after a possible reorganization.');
  if(!Array.isArray(l.topics)||l.topics.length>4||typeof l.data!=='string'||!/^0x(?:[a-f0-9]{2}){0,16384}$/i.test(l.data))throw Error('Unsupported receipt log.');
  return {address:address(l.address),topics:l.topics.map(hash),data:l.data.toLowerCase(),logIndex:quantity(l.logIndex)};
}

export function normalizeEVM(bundle,requestedHash,retrievedAt=new Date().toISOString()) {
  const tx=bundle.transaction;if(quantity(bundle.chainId)!=='1')throw Error('Provider chain ID is not Ethereum mainnet (1).');
  if(!tx||hash(tx.hash)!==hash(requestedHash))throw Error('Transaction not found or hash mismatch on Ethereum mainnet.');
  if(tx.chainId!=null&&quantity(tx.chainId)!=='1')throw Error('Transaction chain ID disagrees with Ethereum mainnet.');
  const transaction={hash:hash(tx.hash),type:tx.type==null?'0':quantity(tx.type),from:address(tx.from),to:address(tx.to,true),valueWei:quantity(tx.value),gasLimit:quantity(tx.gas),gasPriceWei:optionalQuantity(tx.gasPrice),blockHash:tx.blockHash==null?null:hash(tx.blockHash),blockNumber:optionalQuantity(tx.blockNumber)};
  if((transaction.blockHash===null)!==(transaction.blockNumber===null))throw Error('Incomplete transaction block reference.');
  const block=blockRecord(bundle.block),receipt=bundle.receipt;
  let state=transaction.blockHash===null?'pending':'receipt-unavailable',logs=[],normalizedReceipt=null;
  let gasUsed=null,effectivePrice=null,executionWei=null,blobWei=null,totalWei=null;
  let canonicalChecked=false;
  if(receipt!==null&&receipt!==undefined){
    if(transaction.blockHash===null||hash(receipt.transactionHash)!==transaction.hash||hash(receipt.blockHash)!==transaction.blockHash||quantity(receipt.blockNumber)!==transaction.blockNumber||address(receipt.from)!==transaction.from||address(receipt.to,true)!==transaction.to)throw Error('Transaction and receipt disagree. No evidence added.');
    if(!block||block.hash!==transaction.blockHash||block.number!==transaction.blockNumber)throw Error('Receipt and block disagree. Retry the lookup.');
    const s=receipt.status==null?null:quantity(receipt.status);if(s!==null&&s!=='0'&&s!=='1')throw Error('Invalid receipt status.');
    state=s==='1'?'succeeded':s==='0'?'failed':'status-unavailable';
    if(!Array.isArray(receipt.logs)||receipt.logs.length>1000)throw Error('Receipt exceeds the 1,000-log limit.');
    logs=receipt.logs.map(l=>logRecord(l,transaction.hash,block.hash,block.number));
    if(new Set(logs.map(l=>l.logIndex)).size!==logs.length)throw Error('Duplicate receipt log indices.');
    gasUsed=quantity(receipt.gasUsed);effectivePrice=optionalQuantity(receipt.effectiveGasPrice);
    if(BigInt(gasUsed)>BigInt(transaction.gasLimit))throw Error('Receipt gas used exceeds the transaction gas limit.');
    // Legacy gasPrice is paid in full. Never substitute a type-2/3 max fee cap.
    if(effectivePrice===null&&['0','1'].includes(transaction.type))effectivePrice=transaction.gasPriceWei;
    executionWei=product(gasUsed,effectivePrice);
    const blobUsed=optionalQuantity(receipt.blobGasUsed),blobPrice=optionalQuantity(receipt.blobGasPrice);
    blobWei=blobUsed===null&&blobPrice===null&&transaction.type!=='3'?'0':product(blobUsed,blobPrice);
    if(executionWei!==null&&blobWei!==null){const n=BigInt(executionWei)+BigInt(blobWei);if(n>MAX)throw Error('Invalid total fee.');totalWei=String(n);}
    normalizedReceipt={status:s,gasUsed,effectiveGasPriceWei:effectivePrice,blobGasUsed:blobUsed,blobGasPriceWei:blobPrice,contractAddress:receipt.contractAddress==null?null:address(receipt.contractAddress),logs};
    if(bundle.canonicalBlock){const c=bundle.canonicalBlock;if(quantity(c.number)!==block.number||hash(c.hash)!==block.hash)throw Error('Canonical block changed during lookup. Retry; no evidence was added.');canonicalChecked=true;}
  } else if(block!==null)throw Error('Unexpected block without a receipt.');
  const metadata=[];
  const transfers=[];
  if(state==='succeeded'){
    const destination=transaction.to||normalizedReceipt.contractAddress;
    if(BigInt(transaction.valueWei)>0n){if(!destination)throw Error('Successful native transfer has no recipient.');transfers.push({id:'native',kind:'native',from:transaction.from,to:destination,contract:null,rawAmount:transaction.valueWei,decimals:18,amount:formatUnits(transaction.valueWei,18),metadataStatus:'native ETH (18 decimals)'});}
    for(const l of logs){
      // ERC-721 uses four indexed topics; ERC-1155 has different event signatures.
      if(l.topics[0]!==TRANSFER_TOPIC||l.topics.length!==3||!/^0x[0-9a-f]{64}$/.test(l.data)||!/^0x0{24}[0-9a-f]{40}$/.test(l.topics[1])||!/^0x0{24}[0-9a-f]{40}$/.test(l.topics[2]))continue;
      let decimals=null,metadataStatus='decimals unavailable; raw amount only';
      const word=bundle.tokenDecimals?.[l.address];
      if(typeof word==='string'&&/^0x[0-9a-f]{64}$/i.test(word)&&BigInt(word)<=255n){decimals=Number(BigInt(word));metadataStatus='provider eth_call decimals at receipt block hash';}
      if(!metadata.some(m=>m.contract===l.address))metadata.push({contract:l.address,decimals,status:metadataStatus});
      const rawAmount=String(BigInt(l.data));
      transfers.push({id:'log:'+l.logIndex,kind:'erc20-shaped-event',logIndex:l.logIndex,contract:l.address,from:'0x'+l.topics[1].slice(-40),to:'0x'+l.topics[2].slice(-40),rawAmount,decimals,amount:decimals===null?null:formatUnits(rawAmount,decimals),metadataStatus});
    }
  }
  const tip=bundle.tip==null?null:quantity(bundle.tip);
  const confirmations=block&&tip!==null&&BigInt(tip)>=BigInt(block.number)?String(BigInt(tip)-BigInt(block.number)+1n):null;
  return {version:1,network:'ethereum-mainnet',chainId:'1',provider:'dRPC',sourceUrl:EVM_RPC,retrievedAt:iso(retrievedAt),acquisition:'live-provider',transaction,receipt:normalizedReceipt,block,tipBlockNumber:tip,canonicalChecked,confirmations,state,fees:{executionWei,blobWei,totalWei,complete:totalWei!==null},transfers,tokenMetadata:metadata,limitations:['Provider-reported, non-atomic snapshot; no independent inclusion proof, finality or ownership verification.','Native values are top-level transaction values only. Internal calls, traces, net balances and token authenticity are not verified.','ERC-20-shaped events can be emitted by arbitrary contracts. Contract plus chain identify the asset; ticker labels are manual. NFT and ERC-1155 events are not decoded.','Gas fees use receipt gasUsed × paid effectiveGasPrice, plus blob gas fees where supplied. Missing components stay unknown.','Decimals are optional provider eth_call metadata at the receipt block hash. Unknown decimals never default to 18.']};
}

export function cleanEVMSnapshot(value) {
  if(value==null)return null;
  if(value.version!==1||value.network!=='ethereum-mainnet'||value.chainId!=='1'||value.provider!=='dRPC'||value.sourceUrl!==EVM_RPC)throw Error('Unsupported EVM snapshot.');
  if(typeof value.canonicalChecked!=='boolean')throw Error('Invalid saved canonical-block observation.');
  const t=value.transaction,r=value.receipt,b=value.block;
  if(!t)throw Error('Missing saved EVM transaction.');
  const transaction={hash:t.hash,type:hex(t.type),from:t.from,to:t.to,value:hex(t.valueWei),gas:hex(t.gasLimit),gasPrice:t.gasPriceWei==null?null:hex(t.gasPriceWei),blockHash:t.blockHash,blockNumber:t.blockNumber==null?null:hex(t.blockNumber)};
  let receipt=null;
  if(r){
    if(!Array.isArray(r.logs)||r.logs.length>1000)throw Error('Invalid saved receipt logs.');
    receipt={transactionHash:t.hash,blockHash:t.blockHash,blockNumber:transaction.blockNumber,from:t.from,to:t.to,status:r.status==null?null:hex(r.status),gasUsed:hex(r.gasUsed),effectiveGasPrice:r.effectiveGasPriceWei==null?null:hex(r.effectiveGasPriceWei),blobGasUsed:r.blobGasUsed==null?null:hex(r.blobGasUsed),blobGasPrice:r.blobGasPriceWei==null?null:hex(r.blobGasPriceWei),contractAddress:r.contractAddress,logs:r.logs.map(l=>({...l,blockHash:t.blockHash,blockNumber:transaction.blockNumber,transactionHash:t.hash,logIndex:hex(l.logIndex)}))};
  }
  const tokenDecimals={};
  if(!Array.isArray(value.tokenMetadata)||value.tokenMetadata.length>1000)throw Error('Invalid saved token metadata.');
  const seenMetadata=new Set();
  for(const m of value.tokenMetadata){const contract=address(m.contract);if(seenMetadata.has(contract))throw Error('Duplicate saved token metadata.');seenMetadata.add(contract);if(m.decimals!==null&&(!Number.isInteger(m.decimals)||m.decimals<0||m.decimals>255))throw Error('Invalid token decimals.');if(m.decimals!==null)tokenDecimals[contract]='0x'+BigInt(m.decimals).toString(16).padStart(64,'0');}
  const block=b?{hash:b.hash,number:hex(b.number),timestamp:hex(b.timestamp)}:null;
  const result=normalizeEVM({chainId:'0x1',transaction,receipt,block,tip:value.tipBlockNumber==null?null:hex(value.tipBlockNumber),canonicalBlock:value.canonicalChecked&&b?{hash:b.hash,number:hex(b.number)}:null,tokenDecimals},t.hash,value.retrievedAt);
  result.acquisition=value.acquisition==='live-provider'?'live-provider':'case-file-unverified';return result;
}

export async function fetchEVM(txHash,{consent=false,fetcher=globalThis.fetch}={}) {
  if(!consent)throw Error('Approve sending the transaction hash, related addresses and IP metadata to dRPC first.');
  if(!isHash(txHash))throw Error('Enter a 0x-prefixed 64-hex-character Ethereum transaction hash.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let id=0,totalBytes=0;
  async function rpc(method,params){
    if(!['eth_chainId','eth_getTransactionByHash','eth_getTransactionReceipt','eth_getBlockByHash','eth_getBlockByNumber','eth_blockNumber','eth_call'].includes(method))throw Error('Unsupported RPC method.');
    const requestId=++id;
    const response=await fetcher(EVM_RPC,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),signal:controller.signal});
    if(!response.ok)throw Error(response.status===429?'dRPC rate limit reached. Retry later.':'EVM provider unavailable.');
    if(Number(response.headers.get('content-length'))>2_000_000)throw Error('RPC response exceeds 2 MB.');
    const reader=response.body?.getReader();let raw='';
    if(reader){const chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;totalBytes+=value.length;if(size>2_000_000||totalBytes>6_000_000){await reader.cancel();throw Error('RPC response budget exceeded.');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}raw=new TextDecoder().decode(bytes);}
    else{raw=await response.text();const size=new TextEncoder().encode(raw).length;totalBytes+=size;if(size>2_000_000||totalBytes>6_000_000)throw Error('RPC response budget exceeded.');}
    const result=JSON.parse(raw);
    if(result.jsonrpc!=='2.0'||result.id!==requestId)throw Error('RPC response ID/version mismatch.');
    if(result.error)throw Error('RPC read failed; historical metadata may be unavailable.');
    if(!Object.hasOwn(result,'result'))throw Error('RPC result missing.');return result.result;
  }
  try{
    const chainId=await rpc('eth_chainId',[]);if(quantity(chainId)!=='1')throw Error('Wrong provider chain: Ethereum mainnet (1) is required.');
    const [transaction,receipt]=await Promise.all([rpc('eth_getTransactionByHash',[txHash]),rpc('eth_getTransactionReceipt',[txHash])]);
    if(!transaction)throw Error('Transaction not found on Ethereum mainnet.');
    const block=receipt?await rpc('eth_getBlockByHash',[receipt.blockHash,false]):null;
    const bundle={chainId,transaction,receipt,block,tip:null,canonicalBlock:null,tokenDecimals:{}};
    // Reject inconsistent identity/status/log data before optional metadata requests.
    const initial=normalizeEVM(bundle,txHash);
    const contracts=[...new Set(initial.transfers.filter(t=>t.contract).map(t=>t.contract))].slice(0,10);
    const jobs=[rpc('eth_blockNumber',[]),...(block?[rpc('eth_getBlockByNumber',[block.number,false])]:[Promise.resolve(null)]),...contracts.map(contract=>rpc('eth_call',[{to:contract,data:'0x313ce567'},{blockHash:block.hash,requireCanonical:true}]))];
    const values=await Promise.allSettled(jobs);
    if(values[0].status==='fulfilled')bundle.tip=values[0].value;
    if(values[1].status==='fulfilled')bundle.canonicalBlock=values[1].value;
    contracts.forEach((contract,index)=>{if(values[index+2].status==='fulfilled')bundle.tokenDecimals[contract]=values[index+2].value;});
    return normalizeEVM(bundle,txHash,new Date().toISOString());
  }catch(e){
    if(controller.signal.aborted)throw Error('EVM lookup timed out. No evidence added.');
    if(e instanceof SyntaxError)throw Error('Provider returned malformed JSON. No evidence added.');
    if(e instanceof TypeError)throw Error('EVM provider connection failed. Check the network; no evidence added.');
    throw e;
  }finally{clearTimeout(timer);controller.abort();}
}

export function evmEvidence(snapshot,selection) {
  const evm=cleanEVMSnapshot(snapshot),transfer=evm.transfers.find(t=>t.id===selection);
  if(selection!=='status'&&(!transfer||BigInt(transfer.rawAmount)===0n))throw Error('Select a positive transfer or the status-only record.');
  const selected=selection==='status'?null:transfer;
  return {role:'chain',label:selected?`Ethereum ${selected.kind} — ${evm.transaction.hash.slice(0,14)}`:`Ethereum status: ${evm.state}`,asset:selected?.kind==='native'?'ETH':selected?'TOKEN':'ETH',amount:selected?.amount||'',date:evm.block?new Date(Number(evm.block.timestamp)*1000).toISOString().slice(0,10):'',txid:evm.transaction.hash,notes:selected?`Selected ${selected.id}: ${selected.from} → ${selected.to}. ${selected.contract?'Token contract '+selected.contract+'. Ticker is a manual label.':''} ${selected.decimals===null?'Decimals unknown: raw amount '+selected.rawAmount+'; no scaled amount inferred.':''} Block date is not payment initiation; ownership and source of funds remain unverified.`:`Status-only snapshot; no completed transfer is claimed. Attempted top-level value: ${evm.transaction.valueWei} wei.`,provenance:'dRPC Ethereum snapshot',review:'unreviewed',linked:false,evm,selectedTransfer:selection};
}
