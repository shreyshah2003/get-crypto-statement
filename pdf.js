import {imagePDF} from './pdf-container.js';

export function reportBlocks(r) {
  const blocks=[], add=(text,heading=false,keepGroup=heading)=>blocks.push({text:String(text),heading,keepGroup});
  add(r.title,true);add(`Generated ${r.generatedAt}`);add(r.transaction.title,true);
  add(`${r.transaction.kind.replaceAll('_',' ')} | ${r.transaction.amount} ${r.transaction.asset} | ${r.transaction.date}`);
  add(r.transaction.narrative || 'Source narrative missing.');
  add('Limitations',true);for(const line of r.limitations)add(line);
  add('Evidence gaps',true);for(const c of r.checklist)add(`${c.role}: ${c.complete?'reviewed evidence manually linked ('+c.evidenceIds.join(', ')+')':'missing evidence'}`);
  if(r.evidenceMap){add('Cross-evidence comparisons - suggestions only',true);add(r.evidenceMap.limitations);for(const warning of r.evidenceMap.warnings)add(warning);for(const pair of r.evidenceMap.comparisons){add(`${pair.leftId} ↔ ${pair.rightId}: ${pair.state}`);add([...pair.reasons,...pair.cautions].join('; '));}}
  add('Evidence timeline - user supplied / provider reported',true);
  for(const e of [...r.evidence].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))){
    add(e.label,true,true);add(`ID ${e.id} | ${e.role} | ${e.review} | ${e.linked?'linked':'unlinked'}`);
    add(`${e.amount || 'No amount'} ${e.asset || ''} | ${e.date || 'No date'} | ${e.provenance}`);
    add(e.notes || 'No notes.');add(`Link explanation: ${e.linkReason || 'None.'}`);
    if(e.txid)add(`Transaction ID: ${e.txid}`);
    if(e.reference)add(`Reference / UTR: ${e.reference}`);
    if(e.fileName)add(`Source file: ${e.fileName} (${e.originalRequired?'original missing':'original bytes excluded'})`);
    add(`Matching: ${e.match.reasons.join('; ')}`);
    if(e.blockchain){
      const b=e.blockchain,s=b.status;
      add('Bitcoin provider snapshot',true);
      add(`Source: ${b.sourceUrl} | Retrieved: ${b.retrievedAt} | Acquisition: ${b.acquisition}`);
      add(`Network: ${b.network} | Fee: ${b.feeSatoshis} satoshis | Provider status: ${s.confirmed?'confirmed':'unconfirmed'} | Confirmations at snapshot: ${s.confirmations ?? 'unavailable'}`);
      add(`Block height: ${s.blockHeight ?? 'none'} | Block hash: ${s.blockHash ?? 'none'} | Tip height: ${s.tipHeight ?? 'unavailable'}`);
      add(`Provider block time: ${s.blockTime===null?'unconfirmed':new Date(s.blockTime*1000).toISOString()} | Size ${b.sizeBytes} bytes | Weight ${b.weight}`);
      add(`Selected output: ${e.selectedOutput} | Output total: ${b.totalOutputSatoshis} satoshis (not a recipient payment)`);
      for(const i of b.inputs)add(`Input ${i.index}: ${i.coinbase?'coinbase':i.previousTxid+':'+i.previousOutput} | ${i.prevout?.satoshis ?? 'unknown'} satoshis | ${i.prevout?.address || 'no address'}`);
      for(const o of b.outputs)add(`Output ${o.index}: ${o.satoshis} satoshis | ${o.address || 'no address'} | ${o.scriptType} | Script: ${o.script}`);
      for(const limitation of b.limitations)add(limitation);
    }
    if(e.evm){
      const s=e.evm;
      add('Ethereum provider snapshot',true);
      add(`Source: ${s.sourceUrl} | Retrieved: ${s.retrievedAt} | Acquisition: ${s.acquisition}`);
      add(`Network: ${s.network}, chain ${s.chainId} | Status: ${s.state} | Confirmations: ${s.confirmations ?? 'unavailable'} | Canonical block check: ${s.canonicalChecked}`);
      add(`Transaction: ${s.transaction.hash} | From: ${s.transaction.from} | To: ${s.transaction.to ?? 'contract creation'} | Attempted top-level value: ${s.transaction.valueWei} wei`);
      add(`Block: ${s.block?.number ?? 'none'} | Hash: ${s.block?.hash ?? 'none'} | Block time: ${s.block?new Date(Number(s.block.timestamp)*1000).toISOString():'unavailable'}`);
      add(`Execution fee: ${s.fees.executionWei ?? 'unknown'} wei | Blob fee: ${s.fees.blobWei ?? 'unknown'} wei | Total: ${s.fees.totalWei ?? 'incomplete/unknown'} wei`);
      add(`Selected record: ${e.selectedTransfer}. ${e.selectedTransfer==='status'?'No completed transfer claimed.':''}`);
      for(const transfer of s.transfers)add(`${transfer.id} (${transfer.kind}): ${transfer.rawAmount} raw units | Decimals ${transfer.decimals ?? 'unknown'} | Scaled amount ${transfer.amount ?? 'not inferred'} | Contract ${transfer.contract || 'native ETH'} | ${transfer.from} → ${transfer.to}`);
      add(`Receipt logs retained in report JSON: ${s.receipt?.logs.length ?? 0}. NFT/ERC-1155 and internal transfers are not decoded.`);
      for(const limitation of s.limitations)add(limitation);
    }
  }
  const {title,narrative,kind,amount,asset,date,...networkDetails}=r.transaction;
  add('Transaction network details - user supplied',true);add(JSON.stringify(networkDetails,null,2));
  return blocks;
}

export async function createReportPDF(r) {
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF rendering is unavailable in this browser.');
  const width=canvas.width,margin=90,bottom=1550,pages=[[]];let y=125;
  function page(){if(pages.length>=150)throw Error('Report exceeds 150 PDF pages. Reduce evidence or use JSON export.');pages.push([]);y=125;}
  function line(value,heading){const height=heading?36:29;if(y+height>bottom)page();pages.at(-1).push({text:value,y,heading});y+=height;}
  const laidOut=reportBlocks(r).map(block=>{
    ctx.font=block.heading?'bold 25px sans-serif':'22px sans-serif';
    const wrapped=[];
    // Preserve paragraph breaks and split even long hashes/scripts without clipping.
    for(const paragraph of block.text.split(/\r?\n/)){
      let current='';
      for(const token of paragraph.split(/(\s+)/)){
        if(ctx.measureText(current+token).width<=width-margin*2){current+=token;continue;}
        if(current.trim()){wrapped.push(current.trimEnd());current='';}
        for(const character of token){if(ctx.measureText(current+character).width>width-margin*2){wrapped.push(current);current='';}current+=character;}
      }
      wrapped.push(current.trimEnd());
    }
    return {...block,wrapped};
  });
  for(let index=0;index<laidOut.length;index++){
    const block=laidOut[index];
    if(block.keepGroup){
      let groupHeight=block.wrapped.length*36+10;
      for(let j=index+1;j<laidOut.length&&!laidOut[j].heading;j++)groupHeight+=laidOut[j].wrapped.length*29+14;
      if(groupHeight<=bottom-125 && y+groupHeight>bottom)page();
    }
    if(block.heading&&y+90>bottom)page();
    if(block.wrapped.length<=8 && y+block.wrapped.length*(block.heading?36:29)+14>bottom)page();
    for(const value of block.wrapped)line(value,block.heading);
    y+=block.heading?10:14;
  }
  const images=[];
  for(let i=0;i<pages.length;i++){
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,canvas.height);
    ctx.fillStyle='#235a46';ctx.font='bold 20px sans-serif';ctx.fillText('CRYPTO PASSPORT | EVIDENCE SUMMARY',margin,65);
    for(const item of pages[i]){ctx.fillStyle=item.heading?'#173b37':'#283e38';ctx.font=item.heading?'bold 25px sans-serif':'22px sans-serif';ctx.fillText(item.text,margin,item.y);}
    ctx.fillStyle='#526960';ctx.font='18px sans-serif';ctx.fillText(`User-supplied / provider-reported. No ownership certification. | ${i+1} / ${pages.length}`,margin,1620);
    ctx.fillText('Page images; use report JSON for searchable, machine-readable data.',margin,1648);
    const base64=canvas.toDataURL('image/jpeg',0.95).split(',')[1];
    images.push({bytes:Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),width:canvas.width,height:canvas.height});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return imagePDF(images);
}
