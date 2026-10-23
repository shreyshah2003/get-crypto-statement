import {canonicalAmount} from './amount.js';

const currencies=/\b(?:USD|INR|EUR|GBP|CAD|AUD|SGD|AED|CHF|JPY|BTC|ETH|USDT|USDC)\b/gi;
const monetary=/\b(?:amount|paid|received|credit(?:ed)?|debit(?:ed)?|deposit|withdrawal|transfer|balance|fee|total|value|payment)\b/i;
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function date(y,m,d){const s=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return y>=1900&&y<=2199&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;}
export function dateValues(raw,order='ask'){
  let m=raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(m)return [date(+m[1],+m[2],+m[3])].filter(Boolean);
  m=raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if(m){const a=+m[1],b=+m[2],y=+m[3];return [...new Set((order==='dmy'?[date(y,b,a)]:order==='mdy'?[date(y,a,b)]:[date(y,b,a),date(y,a,b)]).filter(Boolean))];}
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
const datePattern=/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}[\s-]+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,-]+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s-]+\d{1,2},?[\s-]+\d{4})\b/gi;

// Suggestions are grounded only in extracted source strings. Targets compare; they never supply missing values.
export function suggestFields(pages,{dateOrder='ask',numberFormat='dot',target={}}={}){
  const amounts=[],dates=[],warnings=[];let count=0;
  for(const page of pages){
    const lines=String(page.text).slice(0,100000).split(/\r?\n/);
    for(let index=0;index<lines.length;index++){
      const line=lines[index];if(!line.trim())continue;
      const source={page:page.page,line:index+1,method:page.method,confidence:page.confidence??null,snippet:line.slice(0,300)};
      for(const m of line.matchAll(datePattern)){
        const values=dateValues(m[0],dateOrder);for(const value of values)dates.push({...source,value,raw:m[0],ambiguous:values.length>1,matchesTarget:value===target.date});
      }
      const stripped=line.replace(datePattern,m=>' '.repeat(m.length));
      const context=line+' '+(index?lines[index-1]:'');
      const codes=[...new Set((line.match(currencies)||[]).map(c=>c.toUpperCase()))];
      const asset=codes.length===1?codes[0]:/₹/.test(line)?'INR':/€/.test(line)?'EUR':/£/.test(line)?'GBP':'';
      if(!monetary.test(context)&&!asset&&!/[$₹€£]/.test(line))continue;
      // Exclude embedded IDs, times, hashes and account-like number strings without a money label/currency.
      for(const m of stripped.matchAll(/(?<![\w:/.,-])[-+]?\d+(?:[.,]\d+)*(?![\w:/.,-])/g)){
        if(m[0].replace(/\D/g,'').length>78)continue;
        const raw=m[0],value=amountValue(raw.replace(/^[-+]/,''),numberFormat);if(!value)continue;
        if(!asset&&!/[.,]/.test(raw)&&!monetary.test(line)&&!/^(?:amount|value|total|paid|received)\s*:?$/i.test((lines[index-1]||'').trim()))continue;
        let matchesTarget=false;try{matchesTarget=canonicalAmount(target.amount)===value&&(!target.asset||asset===target.asset);}catch{}
        amounts.push({...source,value,raw,asset,negative:raw.startsWith('-'),matchesTarget,ambiguous:codes.length>1});
      }
      if((count=amounts.length+dates.length)>500){warnings.push('Candidate limit reached. Narrow the page range and read again.');break;}
    }
    if(count>500)break;
  }
  if(dates.some(d=>d.ambiguous))warnings.push('Some numeric dates have two possible interpretations. Choose the document date order or inspect the source.');
  if(pages.some(p=>p.method==='OCR'))warnings.push('OCR can misread digits and separators. Check the page before using a value; recognition score is not verification.');
  const unique=items=>items.filter((x,i,a)=>a.findIndex(y=>y.page===x.page&&y.line===x.line&&y.value===x.value&&y.asset===x.asset)===i).slice(0,250);
  return {amounts:unique(amounts),dates:unique(dates),warnings};
}

export function textLines(items){
  const rows=[];
  for(const item of items){if(typeof item.str!=='string'||!item.str.trim())continue;const y=item.transform?.[5]??0,x=item.transform?.[4]??0;let row=rows.find(r=>Math.abs(r.y-y)<2);if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,text:item.str});}
  return rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');
}
