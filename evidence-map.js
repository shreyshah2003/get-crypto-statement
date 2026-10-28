import {canonicalAmount} from './amount.js';

const hash=value=>/^(?:0x[a-f0-9]{64}|[a-f0-9]{64})$/i.test(value||'')?String(value).toLowerCase():'';
const reference=value=>String(value||'').toUpperCase().replace(/[\s-]/g,'');
const amount=value=>{try{return canonicalAmount(value);}catch{return '';}};
const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?Date.parse(value)/86400000:null;

// This compares entered fields only. It never verifies provenance, infers FX/fees, links evidence or changes gaps.
export function mapEvidence(evidence,{limit=120}={}){
  const records=evidence.slice(0,5000),groups=new Map(),pairs=new Map(),warnings=[];let examined=0,oversized=false;
  function add(key,index){if(!key)return;let group=groups.get(key);if(!group){group=[];groups.set(key,group);}if(group.length<200)group.push(index);else oversized=true;}
  records.forEach((record,index)=>{
    const h=hash(record.txid),r=reference(record.reference),a=amount(record.amount);
    if(h)add('hash:'+h,index);if(r.length>=4&&r.length<=160)add('reference:'+r,index);
    if(a&&record.asset)add('amount:'+record.asset+':'+a,index);
  });
  outer:for(const [key,group]of groups){for(let a=0;a<group.length;a++)for(let b=a+1;b<group.length;b++){
    if(++examined>20000){warnings.push('Comparison budget reached. Large repeated-value groups need manual review.');break outer;}
    const leftIndex=group[a],rightIndex=group[b],pairKey=leftIndex+':'+rightIndex;
    let pair=pairs.get(pairKey);if(!pair){pair={leftIndex,rightIndex,signals:new Set()};pairs.set(pairKey,pair);}pair.signals.add(key.split(':')[0]);
  }}
  if(evidence.length>5000)warnings.push('Only the first 5,000 records were compared.');
  if(oversized)warnings.push('A repeated identifier/amount group exceeded 200 records; that group is only partially compared.');
  const comparisons=[];
  for(const pair of pairs.values()){
    const a=records[pair.leftIndex],b=records[pair.rightIndex],daysA=day(a.date),daysB=day(b.date),days=daysA===null||daysB===null?null:Math.abs(daysA-daysB);
    const signals=[...pair.signals],identifier=signals.includes('hash')||signals.includes('reference');
    if(!identifier&&(days===null||days>3))continue;
    const reasons=[],cautions=[];let conflict=false;
    const ha=hash(a.txid),hb=hash(b.txid),ra=reference(a.reference),rb=reference(b.reference);
    if(signals.includes('hash'))reasons.push('Same recorded transaction hash');
    if(signals.includes('reference'))reasons.push('Reference / UTR agrees after case/space/hyphen formatting');
    if(ha&&hb&&ha!==hb){cautions.push('Transaction hashes conflict');conflict=true;}
    if(ra&&rb&&ra!==rb){cautions.push('References differ; check what each identifier represents');if(!signals.includes('hash'))conflict=true;}
    const sameAsset=Boolean(a.asset)&&a.asset===b.asset,sameAmount=Boolean(amount(a.amount))&&amount(a.amount)===amount(b.amount);
    if(sameAsset&&sameAmount)reasons.push('Exact recorded asset and amount');
    else if(!sameAsset)cautions.push('Different or missing asset labels; conversion/token identity needs separate evidence');
    else cautions.push('Amounts differ; outputs, fees or partial payments need an explanation');
    if(days===null)cautions.push('Date is missing');else if(days>3)cautions.push(`Dates differ by ${days} days`);else reasons.push(`${days} day date difference`);
    if(!identifier)cautions.push('Amount/date agreement alone can match unrelated or repeated payments');
    const ta=a.evm?.transfers?.find(t=>t.id===a.selectedTransfer),tb=b.evm?.transfers?.find(t=>t.id===b.selectedTransfer);
    if(ta?.contract||tb?.contract){if(ta?.contract&&tb?.contract&&(ta.contract!==tb.contract||a.evm.chainId!==b.evm.chainId)){cautions.push('Token contract or chain conflicts');conflict=true;}else cautions.push('Check token contract and chain identity against the original records');}
    const sameFile=Boolean(a.fileName)&&a.fileName===b.fileName;
    const duplicate=sameFile&&sameAsset&&sameAmount&&a.date===b.date&&ha===hb&&ra===rb;
    if(sameFile)cautions.push('Same source filename; these are not established as independent originals');
    const needsReview=a.review!=='reviewed'||b.review!=='reviewed'||a.originalRequired||b.originalRequired;
    if(needsReview)cautions.push('Review both originals and entered fields before using this relationship');
    const state=conflict?'conflicting fields':duplicate?'possible duplicate':needsReview?'review required':'candidate only';
    comparisons.push({leftId:a.id||`record-${pair.leftIndex+1}`,rightId:b.id||`record-${pair.rightIndex+1}`,leftLabel:a.label,rightLabel:b.label,leftFile:a.fileName||'',rightFile:b.fileName||'',state,signals,reasons,cautions,rank:(signals.includes('hash')?3:0)+(signals.includes('reference')?2:0)+(sameAsset&&sameAmount?1:0)});
  }
  comparisons.sort((a,b)=>b.rank-a.rank||a.leftId.localeCompare(b.leftId)||a.rightId.localeCompare(b.rightId));
  const cap=Math.max(1,Math.min(500,Number.isInteger(limit)?limit:120));
  if(comparisons.length>cap)warnings.push(`Showing ${cap} of ${comparisons.length} possible comparisons. These are suggestions, not a complete funds trail.`);
  return {version:1,recordsConsidered:records.length,comparisons:comparisons.slice(0,cap).map(({rank,...pair})=>pair),warnings,limitations:'Recorded-field comparisons only. No automatic connections, FX/fee assumptions, authenticity, ownership or source-of-funds verification.'};
}
