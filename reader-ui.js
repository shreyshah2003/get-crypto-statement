import {readAttachment} from './document-reader.js';
import {suggestFields} from './document-fields.js';

export function attachmentReader({form,getExistingFile,getTarget,onDirty}){
  const $=id=>document.getElementById(id),input=form.elements.attachment;
  let generation=0,controller=null,result=null,readFile=null,busy=false;
  const currentFile=()=>input.files[0]||getExistingFile();
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const status=text=>{$('reader-status').textContent=text;};
  function reset(){generation++;controller?.abort();controller=null;busy=false;result=null;readFile=null;$('reader-result').replaceChildren();$('reader-read').disabled=false;$('reader-cancel').hidden=true;status('');}
  input.addEventListener('change',()=>{reset();if(currentFile()&&$('reader-auto').checked)void startReading();else status('Attachment selected. Click Read attachment locally to find its values.');});
  function render(){
    const target=$('reader-result');target.replaceChildren();if(!result)return;
    const suggestions=suggestFields(result.pages,{dateOrder:$('reader-date-order').value,numberFormat:$('reader-number-format').value,century:$('reader-century').value,target:getTarget()});
    const characters=result.pages.reduce((n,p)=>n+p.text.trim().length,0),found=suggestions.amounts.length+suggestions.dates.length+suggestions.txids.length+suggestions.references.length;
    status(!characters?'No readable text was found. Check the page errors below, try a clearer image, or enter a manual transcript.':!found?`Read ${characters} characters, but no supported fields were found. Inspect/correct the text below or change the date/number format.`:`Read ${characters} characters. Found ${suggestions.amounts.length} amounts, ${suggestions.dates.length} dates, ${suggestions.txids.length} hashes and ${suggestions.references.length} references. Choose values to apply; nothing is verified.`);
    target.append(node('p',`Read ${readFile.name}. Suggestions only: check the page before applying. Applying replaces only the selected evidence fields; it never changes the transaction, reviews evidence or links it.`));
    for(const warning of [...result.warnings,...suggestions.warnings]){const p=node('p',warning);p.className='warning';target.append(p);}
    const selections={};
    for(const [field,items]of [['amount',suggestions.amounts],['date',suggestions.dates],['txid',suggestions.txids],['reference',suggestions.references]]){
      if(!items.length&&!['amount','date'].includes(field))continue;
      const labels={amount:'Amount found in attachment',date:'Date found in attachment',txid:'Transaction hash found in attachment',reference:'Reference / UTR found in attachment'};
      const label=node('label',labels[field]),select=node('select');select.id='reader-'+field;
      const blank=node('option',`Choose ${field} explicitly (${items.length} suggestions)`);blank.value='';select.append(blank);
      items.forEach((item,index)=>{const option=node('option',`${item.value}${item.asset?' '+item.asset:''}${item.kind?' | '+item.kind:''} | page ${item.page}, line ${item.line} | ${item.method}${item.confidence!==null?' (page OCR score '+item.confidence+'/100)':''}${item.matchesTarget?' | agrees with entered transaction':''}${item.ambiguous?' | ambiguous: inspect source':''}${item.negative?' | negative in source: check direction':''} | ${item.snippet}`);option.value=String(index);select.append(option);});
      label.append(select);target.append(label);selections[field]={select,items};
    }
    if(!found)target.append(node('p','No supported fields found. Try another page range, correct the extracted text, or enter a manual transcript. No value has been invented.'));
    const apply=node('button','Use selected values in evidence form');apply.type='button';
    apply.onclick=()=>{
      if(readFile!==currentFile())return reset();
      const selected=Object.entries(selections).flatMap(([field,{select,items}])=>select.value===''?[]:[{field,...items[Number(select.value)]}]);
      if(!selected.length)return status('Choose at least one source-backed value first.');
      const notes=selected.map(s=>`Local extraction suggestion (${readFile.name}, page ${s.page}, line ${s.line}, ${s.method}${s.confidence!==null?', page OCR score '+s.confidence+'/100':''}): ${s.field}=${s.value}${s.asset?' '+s.asset:''}; source: ${s.snippet}${s.assetContext?' [currency context: '+s.assetContext+']':''}${s.ambiguous?' [ambiguous source; interpretation chosen manually]':''}${s.negative?' [negative in source; direction needs review]':''}. Not independently verified.`).join('\n');
      const combined=[form.elements.notes.value,notes].filter(Boolean).join('\n');
      if(combined.length>4000)return status('Notes would exceed 4,000 characters. Shorten existing notes before applying; no fields were changed.');
      for(const s of selected){form.elements[s.field].value=s.value;if(s.field==='amount'&&s.asset&&!s.ambiguous)form.elements.asset.value=s.asset;}
      if(!form.elements.label.value.trim())form.elements.label.value=readFile.name.slice(0,160);
      form.elements.notes.value=combined;onDirty();status('Selected values filled in the evidence form with page/source notes. Check them, then save as unreviewed evidence.');
    };
    target.append(apply);
    const details=node('details');details.open=!found;details.append(node('summary','Inspect page results and correct extracted text'));
    for(const diagnostic of result.diagnostics||[])details.append(node('p',`Page ${diagnostic.page}: ${diagnostic.textCharacters} PDF text characters; OCR: ${diagnostic.ocr}${diagnostic.error?' — '+diagnostic.error:''}`));
    result.pages.forEach((page,index)=>{
      details.append(node('h4',`Page ${page.page} — ${page.method}${page.confidence!==null?' — OCR score '+page.confidence+'/100':''}`));
      const label=node('label','Extracted text (you may correct it; corrections become a manual transcript)'),editor=node('textarea');editor.value=page.text;editor.maxLength=100000;label.append(editor);details.append(label);
      const rescan=node('button','Find values in corrected text');rescan.type='button';rescan.onclick=()=>{result.pages[index]={...page,text:editor.value,method:'Manual transcript',confidence:null};render();};details.append(rescan);
    });
    const manualLabel=node('label','Paste a manual transcript if a page could not be read'),manual=node('textarea');manual.maxLength=100000;manualLabel.append(manual);details.append(manualLabel);
    const parseManual=node('button','Find values in manual transcript');parseManual.type='button';parseManual.onclick=()=>{if(!manual.value.trim())return status('Enter the visible source text first.');result.pages.push({page:Number($('reader-start').value)||1,text:manual.value,method:'Manual transcript',confidence:null});render();};details.append(parseManual);
    target.append(details);
  }
  $('reader-date-order').onchange=render;$('reader-number-format').onchange=render;$('reader-century').onchange=render;
  $('reader-cancel').onclick=()=>{reset();status('Reading cancelled. No suggestions applied.');};
  async function startReading(){
    reset();const run=generation,attachment=currentFile();controller=new AbortController();busy=true;$('reader-read').disabled=true;$('reader-cancel').hidden=false;
    try{
      result=await readAttachment(attachment,{start:Number($('reader-start').value),end:Number($('reader-end').value),forceOCR:$('reader-force').checked,signal:controller.signal,fieldOptions:{dateOrder:$('reader-date-order').value,numberFormat:$('reader-number-format').value,century:$('reader-century').value},onProgress:message=>{if(run===generation)status(message);}});
      if(run!==generation)return;readFile=attachment;render();
    }catch(error){if(run===generation){result=null;status(error.message);}}
    finally{if(run===generation){busy=false;controller=null;$('reader-read').disabled=false;$('reader-cancel').hidden=true;}}
  }
  $('reader-read').onclick=startReading;
  return {reset,isBusy:()=>busy};
}
