import {canonicalAmount} from './amount.js';

const currencies=/(?<![A-Za-z])(?:USDT|USDC|USD|INR|EUR|GBP|CAD|AUD|SGD|AED|CHF|JPY|BTC|ETH)(?![A-Za-z])/gi;
const monetary=/\b(?:amount|paid|received|credit(?:ed)?|debit(?:ed)?|deposit|withdrawal|transfer|balance|fee|total|value|payment)\b/i;
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function date(y,m,d){const s=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return y>=1900&&y<=2199&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;}
export function dateValues(raw,order='ask',century=''){
  raw=raw.replace(/([A-Za-z]{3})\./g,'$1');
  let m=raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(m)return [date(+m[1],+m[2],+m[3])].filter(Boolean);
  m=raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if(m){if(m[3].length===2&&!['1900','2000'].includes(century))return [];const a=+m[1],b=+m[2],y=+m[3]+(m[3].length===2?+century:0);return [...new Set((order==='dmy'?[date(y,b,a)]:order==='mdy'?[date(y,a,b)]:[date(y,b,a),date(y,a,b)]).filter(Boolean))];}
  m=raw.match(/^(\d{1,2})[\s-]+([a-z]+)[\s,-]+(\d{4})$/i);
  if(m)return [date(+m[3],months.indexOf(m[2].slice(0,3).toLowerCase())+1,+m[1])].filter(Boolean);
  m=raw.match(/^([a-z]+)[\s-]+(\d{1,2}),?[\s-]+(\d{4})$/i);
  return m?[date(+m[3],months.indexOf(m[1].slice(0,3).toLowerCase())+1,+m[2])].filter(Boolean):[];
}
export function amountValue(raw,separator='dot'){
  let s=raw.replace(/[\s\u00a0\u202f]/g,'');
  const decimal=separator==='comma'?',':'.',group=separator==='comma'?'.':',';
  const parts=s.split(decimal);if(parts.length>2||parts[1]!==undefined&&!/^\d{1,255}$/.test(parts[1]))return null;
  const whole=parts[0];
  if(whole.includes(group)){
    const chunks=whole.split(group);
    const western=/^\d{1,3}$/.test(chunks[0])&&chunks.slice(1).every(c=>/^\d{3}$/.test(c));
    const indian=/^\d{1,2}$/.test(chunks[0])&&/^\d{3}$/.test(chunks.at(-1))&&chunks.slice(1,-1).every(c=>/^\d{2}$/.test(c));
    if(!western&&!indian)return null;
  }else if(!/^\d+$/.test(whole))return null;
  s=whole.split(group).join('')+(parts[1]!==undefined?'.'+parts[1]:'');
  try{return canonicalAmount(s);}catch{return null;}
}
const datePattern=/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:\d{4}|\d{2})|\d{1,2}[\s-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[\s,-]+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[\s-]+\d{1,2},?[\s-]+\d{4})\b/gi;
const hashPattern=/(?<![A-Za-z0-9])(?:0x[a-f0-9]{64}|[a-f0-9]{64})(?![A-Za-z0-9])/gi;
const referencePattern=/\b(?:UTR|reference(?:\s+(?:number|no\.?|id))?|transfer\s+id|order\s+id)(?:\s*[:#=-]\s*|\s+)([A-Za-z0-9][A-Za-z0-9/_-]{3,79})/gi;

// Suggestions are grounded only in extracted source strings. Targets compare; they never supply missing values.
export function suggestFields(pages,{dateOrder='ask',numberFormat='dot',century='',target={}}={}){
  const amounts=[],dates=[],txids=[],references=[],warnings=[];let count=0,shortYears=false;
  for(const page of pages){
    const lines=String(page.text).slice(0,100000).split(/\r?\n/);
    const pageCodes=[...new Set([...(String(page.text).match(currencies)||[]).map(c=>c.toUpperCase()),...(/₹/.test(page.text)?['INR']:[]),...(/€/.test(page.text)?['EUR']:[]),...(/£/.test(page.text)?['GBP']:[])])];
    const currencyHeaders=[...String(page.text).matchAll(/\b(?:currency|amounts\s+in)\s*[:=-]?\s*(USDT|USDC|USD|INR|EUR|GBP|CAD|AUD|SGD|AED|CHF|JPY|BTC|ETH)\b/gi)];
    const headerCodes=[...new Set(currencyHeaders.map(m=>m[1].toUpperCase()))];
    const pageAsset=headerCodes.length===1?headerCodes[0]:pageCodes.length===1?pageCodes[0]:'';
    const table=/\b(?:amount|debit|credit|balance)\b/i.test(page.text);
    for(let index=0;index<lines.length;index++){
      const line=lines[index];if(!line.trim())continue;
      const source={page:page.page,line:index+1,method:page.method,confidence:page.confidence??null,snippet:line.slice(0,300)};
      const rowDates=[...line.matchAll(datePattern)];
      for(const m of rowDates){
        if(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2}$/.test(m[0]))shortYears=true;
        const values=dateValues(m[0],dateOrder,century);for(const value of values)dates.push({...source,value,raw:m[0],ambiguous:values.length>1,matchesTarget:value===target.date});
      }
      for(const m of line.matchAll(hashPattern))txids.push({...source,value:m[0].toLowerCase(),raw:m[0],ambiguous:false,matchesTarget:m[0].toLowerCase()===String(target.txid||'').toLowerCase()});
      for(const m of line.matchAll(referencePattern))if(!/^(?:0x)?[a-f0-9]{64}$/i.test(m[1]))references.push({...source,value:m[1],raw:m[1],ambiguous:false,matchesTarget:false});
      const stripped=line.replace(datePattern,m=>' '.repeat(m.length)).replace(hashPattern,m=>' '.repeat(m.length)).replace(referencePattern,m=>' '.repeat(m.length)).replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g,m=>' '.repeat(m.length)).replace(currencies,m=>' '.repeat(m.length));
      const context=line+' '+(index?lines[index-1]:'');
      const codes=[...new Set((line.match(currencies)||[]).map(c=>c.toUpperCase()))];
      const asset=codes.length===1?codes[0]:/₹/.test(line)?'INR':/€/.test(line)?'EUR':/£/.test(line)?'GBP':pageAsset;
      const datedRow=table&&rowDates.length>0;
      if(!monetary.test(context)&&!codes.length&&!/[$₹€£]/.test(line)&&!datedRow)continue;
      // Exclude embedded IDs, times, hashes and account-like number strings without a money label/currency.
      for(const m of stripped.matchAll(/(?<![\w:/.,-])[-+]?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)(?![\w:/.,-])/g)){
        if(m[0].replace(/\D/g,'').length>78)continue;
        const raw=m[0],value=amountValue(raw.replace(/^[-+]/,''),numberFormat);if(!value)continue;
        if(!asset&&!/[.,]/.test(raw)&&!monetary.test(line)&&!datedRow&&!/^(?:amount|value|total|paid|received)\s*:?$/i.test((lines[index-1]||'').trim()))continue;
        let matchesTarget=false;try{matchesTarget=canonicalAmount(target.amount)===value&&(!target.asset||asset===target.asset);}catch{}
        const kind=/\b(?:balance|closing|opening)\b/i.test(line)?'balance':/\b(?:fee|commission|charge)\b/i.test(line)?'fee':datedRow?'table value':'amount';
        amounts.push({...source,value,raw,asset,kind,assetContext:!codes.length&&headerCodes.length===1?currencyHeaders[0][0]:'',negative:raw.startsWith('-'),matchesTarget,ambiguous:codes.length>1});
      }
      if((count=amounts.length+dates.length+txids.length+references.length)>500){warnings.push('Candidate limit reached. Narrow the page range and read again.');break;}
    }
    if(count>500)break;
  }
  if(dates.some(d=>d.ambiguous))warnings.push('Some numeric dates have two possible interpretations. Choose the document date order or inspect the source.');
  if(shortYears&&!century)warnings.push('Two-digit years were found. Choose the century explicitly to extract those dates.');
  if(pages.some(p=>p.method==='OCR'))warnings.push('OCR can misread digits and separators. Check the page before using a value; recognition score is not verification.');
  const unique=items=>items.filter((x,i,a)=>a.findIndex(y=>y.page===x.page&&y.line===x.line&&y.value===x.value&&y.asset===x.asset)===i).slice(0,250);
  return {amounts:unique(amounts),dates:unique(dates),txids:unique(txids),references:unique(references),warnings};
}

export function textLines(items){
  const rows=[];
  for(const item of items){if(typeof item.str!=='string'||!item.str.trim())continue;const y=item.transform?.[5]??0,x=item.transform?.[4]??0;let row=rows.find(r=>Math.abs(r.y-y)<2);if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,text:item.str,width:item.width,height:Math.abs(item.transform?.[3]||10)});}
  return rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map((item,index,all)=>{if(!index)return item.text;const previous=all[index-1],gap=item.x-previous.x-previous.width;return (!Number.isFinite(gap)?' ':gap<item.height*.15?'':gap>item.height*1.5?'\t':' ')+item.text;}).join('')).join('\n');
}
