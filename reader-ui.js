import {readAttachment} from './document-reader.js';
import {suggestFields} from './document-fields.js';

export function attachmentReader({form,getExistingFile,getTarget,onDirty}){
  const $=id=>document.getElementById(id),input=form.elements.attachment;
  let generation=0,controller=null,result=null,readFile=null,busy=false;
  const currentFile=()=>input.files[0]||getExistingFile();
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const status=text=>{$('reader-status').textContent=text;};
  function reset(){generation++;controller?.abort();controller=null;busy=false;result=null;readFile=null;$('reader-result').replaceChildren();$('reader-read').disabled=false;$('reader-cancel').hidden=true;status('');}
  input.addEventListener('change',reset);
  function render(){
    const target=$('reader-result');target.replaceChildren();if(!result)return;
    const suggestions=suggestFields(result.pages,{dateOrder:$('reader-date-order').value,numberFormat:$('reader-number-format').value,target:getTarget()});
    target.append(node('p',`Read ${readFile.name}. Suggestions only: check the page before applying. Applying replaces only the selected evidence fields; it never changes the transaction, reviews evidence or links it.`));
    for(const warning of [...result.warnings,...suggestions.warnings]){const p=node('p',warning);p.className='warning';target.append(p);}
    const selections={};
    for(const [field,items]of [['amount',suggestions.amounts],['date',suggestions.dates]]){
      const label=node('label',field==='amount'?'Amount found in attachment':'Date found in attachment'),select=node('select');select.id='reader-'+field;
      const blank=node('option',`Choose ${field} explicitly (${items.length} suggestions)`);blank.value='';select.append(blank);
      items.forEach((item,index)=>{const option=node('option',`${item.value}${item.asset?' '+item.asset:''} | page ${item.page}, line ${item.line} | ${item.method}${item.confidence!==null?' (page OCR score '+item.confidence+'/100)':''}${item.matchesTarget?' | agrees with entered transaction':''}${item.ambiguous?' | ambiguous: inspect source':''}${item.negative?' | negative in source: check direction':''} | ${item.snippet}`);option.value=String(index);select.append(option);});
      label.append(select);target.append(label);selections[field]={select,items};
    }
    if(!suggestions.amounts.length&&!suggestions.dates.length)target.append(node('p','No supported amount/date found. Try OCR for all selected pages, a different page range, or manual entry. No value has been invented.'));
    const apply=node('button','Use selected values in evidence form');apply.type='button';
    apply.onclick=()=>{
      if(readFile!==currentFile())return reset();
      const selected=Object.entries(selections).flatMap(([field,{select,items}])=>select.value===''?[]:[{field,...items[Number(select.value)]}]);
      if(!selected.length)return status('Choose at least one source-backed value first.');
      const notes=selected.map(s=>`Local extraction suggestion (${readFile.name}, page ${s.page}, line ${s.line}, ${s.method}${s.confidence!==null?', page OCR score '+s.confidence+'/100':''}): ${s.field}=${s.value}${s.asset?' '+s.asset:''}; source: ${s.snippet}${s.ambiguous?' [ambiguous source; interpretation chosen manually]':''}${s.negative?' [negative in source; direction needs review]':''}. Not independently verified.`).join('\n');
      const combined=[form.elements.notes.value,notes].filter(Boolean).join('\n');
      if(combined.length>4000)return status('Notes would exceed 4,000 characters. Shorten existing notes before applying; no fields were changed.');
      for(const s of selected){form.elements[s.field].value=s.value;if(s.field==='amount'&&s.asset&&!s.ambiguous)form.elements.asset.value=s.asset;}
      if(!form.elements.label.value.trim())form.elements.label.value=readFile.name.slice(0,160);
      form.elements.notes.value=combined;onDirty();status('Selected values filled in the evidence form with page/source notes. Check them, then save as unreviewed evidence.');
    };
    target.append(apply);
    const details=node('details');details.append(node('summary','Inspect extracted page text and filled form values'));
    for(const page of result.pages){details.append(node('h4',`Page ${page.page} — ${page.method}${page.confidence!==null?' — OCR score '+page.confidence+'/100':''}`),node('pre',page.text||'(No text recognized)'));}
    target.append(details);
  }
  $('reader-date-order').onchange=render;$('reader-number-format').onchange=render;
  $('reader-cancel').onclick=()=>{reset();status('Reading cancelled. No suggestions applied.');};
  $('reader-read').onclick=async()=>{
    reset();const run=generation,attachment=currentFile();controller=new AbortController();busy=true;$('reader-read').disabled=true;$('reader-cancel').hidden=false;
    try{
      result=await readAttachment(attachment,{start:Number($('reader-start').value),end:Number($('reader-end').value),forceOCR:$('reader-force').checked,signal:controller.signal,onProgress:message=>{if(run===generation)status(message);}});
      if(run!==generation)return;readFile=attachment;render();status('Reading finished. Select the correct values below; nothing has been applied yet.');
    }catch(error){if(run===generation){result=null;status(error.message);}}
    finally{if(run===generation){busy=false;controller=null;$('reader-read').disabled=false;$('reader-cancel').hidden=true;}}
  };
  return {reset,isBusy:()=>busy};
}
