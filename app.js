import {parseCSV, match, checklist, report} from './core.js';
import {cleanTransaction, cleanEvidence, saveCase, openCase, validateStructure} from './casefile.js';
import {demoCase} from './demo.js';
import {fetchBTC,btcEvidence,btcAmount} from './btc.js';
import {createReportPDF} from './pdf.js';
import {fetchEVM,evmEvidence} from './evm.js';

let transaction = null, evidence = [], editingId = null;
let transactionDirty = false, evidenceDirty = false;
let pendingBTC=null, lookupGeneration=0;
let pendingEVM=null,evmGeneration=0;
const $ = id => document.getElementById(id);
const form = $('case-form'), evidenceForm = $('evidence-form');
const fields = ['label','role','amount','asset','date','txid','notes'];
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function data(f) { return Object.fromEntries(new FormData(f).entries()); }
function status(id, message) { $(id).textContent = message; }
form.addEventListener('input', () => { transactionDirty = true; status('case-status','Unsaved transaction changes. Save the transaction before exporting.'); });
form.addEventListener('change', () => { transactionDirty = true; });
evidenceForm.addEventListener('input', () => { evidenceDirty = true; });
evidenceForm.addEventListener('change', () => { evidenceDirty = true; });
function requireSaved() {
  if (!transaction) throw Error('Save a transaction first.');
  if (transactionDirty || evidenceDirty || editingId) throw Error('Save or cancel pending form changes before exporting.');
}
function action(parent, label, fn) {
  const b = el('button', label); b.type = 'button';
  b.addEventListener('click', fn); parent.append(b); return b;
}
function row(container, specs, values = {}) {
  const box = el('div', undefined, 'transfer-row grid');
  for (const [name, label, max] of specs) {
    const l = el('label', label), input = el('input');
    input.dataset.field = name; input.maxLength = max; input.value = values[name] ?? '';
    l.append(input); box.append(l);
  }
  action(box, 'Remove transfer row', () => { box.remove(); transactionDirty = true; });
  $(container).append(box);
}
const inputSpecs = [['txid','Previous transaction ID',64],['vout','Output index',10]];
const outputSpecs = [['address','BTC recipient address',120],['satoshis','Value (whole satoshis)',80]];
const tokenSpecs = [['contract','Token contract address',42],['from','Token sender',42],['to','Token recipient',42],['rawAmount','Raw token amount (whole units)',80],['decimals','Token decimals',3]];
function addRow(container, specs, values) {
  if ($(container).children.length >= 100) return status('case-status','Limit transfer details to 100 rows per group.');
  row(container, specs, values);
  transactionDirty = true;
}
$('add-input').onclick = () => addRow('btc-inputs', inputSpecs);
$('add-output').onclick = () => addRow('btc-outputs', outputSpecs);
$('add-token').onclick = () => addRow('evm-tokens', tokenSpecs);
function networkUI() {
  const network = form.elements.network.value;
  $('chain-details').hidden = network === 'none';
  $('chain-id-label').hidden = network !== 'EVM';
  $('token-contract-label').hidden = network !== 'EVM';
  $('btc-details').hidden = network !== 'BTC' || !$('include-details').checked;
  $('evm-details').hidden = network !== 'EVM' || !$('include-details').checked;
}
form.elements.network.onchange = networkUI;
$('include-details').onchange = networkUI;
function readRows(id) {
  return [...$(id).children].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.field, i.value.trim()])));
}
function chainStructure() {
  if (!$('include-details').checked || form.elements.network.value === 'none') return null;
  if (form.elements.network.value === 'BTC') {
    const inputs = readRows('btc-inputs').map(i => {
      if (!/^\d+$/.test(i.vout)) throw Error('BTC output index must be a whole number.');
      return {...i, vout: Number(i.vout)};
    });
    return validateStructure({inputs, outputs:readRows('btc-outputs')}, 'BTC');
  }
  const tokenTransfers = readRows('evm-tokens').map(t => {
    if (!/^\d+$/.test(t.decimals)) throw Error('Token decimals must be a whole number.');
    return {...t, decimals:Number(t.decimals)};
  });
  return validateStructure({from:$('evm-from').value.trim(), to:$('evm-to').value.trim(), valueWei:$('evm-value').value.trim(), tokenTransfers}, 'EVM');
}
form.onsubmit = event => {
  event.preventDefault();
  try {
    const raw = data(form);
    const next = cleanTransaction({...raw, amount:raw.amount.trim(), asset:raw.asset.trim().toUpperCase(), txid:raw.txid.trim(), structure:chainStructure()});
    if (transaction && JSON.stringify(transaction) !== JSON.stringify(next)) for (const e of evidence) { e.linked = false; e.linkReason = ''; }
    transaction = next; transactionDirty = false;
    status('case-status','Transaction saved. Changed transaction details clear prior evidence links.'); render();
  } catch (e) { status('case-status',e.message); }
};
function cancelEdit() {
  editingId = null; evidenceDirty = false; evidenceForm.reset();
  $('evidence-heading').textContent = 'Add evidence'; $('evidence-submit').textContent = 'Add evidence';
  $('cancel-edit').hidden = true; $('attachment-note').textContent = '';
}
$('cancel-edit').onclick = cancelEdit;
function edit(e) {
  cancelEdit(); editingId = e.id;
  for (const key of fields) evidenceForm.elements[key].value = e[key] || '';
  $('evidence-heading').textContent = 'Edit evidence'; $('evidence-submit').textContent = 'Save evidence changes';
  $('cancel-edit').hidden = false;
  $('attachment-note').textContent = e.file ? `Keeping ${e.fileName} unless a replacement is selected.` : e.originalRequired ? `Reattach original: ${e.fileName}. Its contents are absent from this saved case.` : '';
  evidenceForm.scrollIntoView({block:'start'}); evidenceForm.elements.label.focus();
}
evidenceForm.onsubmit = event => {
  event.preventDefault();
  try {
    const raw = data(evidenceForm), file = raw.attachment;
    const old = evidence.find(e => e.id === editingId);
    if (!old && evidence.length >= 5000) throw Error('Limit a case to 5,000 evidence records.');
    const cleaned = cleanEvidence({...raw, amount:raw.amount.trim(), asset:raw.asset.trim().toUpperCase(), txid:raw.txid.trim(),blockchain:old?.blockchain,selectedOutput:old?.selectedOutput,evm:old?.evm,selectedTransfer:old?.selectedTransfer});
    const next = {...old, ...cleaned, id:old?.id || crypto.randomUUID(), provenance:old?.provenance || 'Manual entry', review:'unreviewed', linked:false, linkReason:''};
    if (file.size) {
      if (file.size > 10 * 1024 * 1024) throw Error('Attachment exceeds 10 MB.');
      if (!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type)) throw Error('Choose PNG, JPEG, WebP or PDF.');
      if (old?.preview) URL.revokeObjectURL(old.preview);
      next.file = file; next.fileName = file.name; next.preview = URL.createObjectURL(file); next.originalRequired = false;
    } else if (old) { next.fileName = old.fileName || ''; }
    if (old) evidence = evidence.map(e => e.id === old.id ? next : e); else evidence.push(next);
    cancelEdit(); status('evidence-status','Evidence saved as unreviewed. Review the original and any changed fields.'); render();
  } catch (e) { status('evidence-status',e.message); }
};
$('csv').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 2_000_000) throw Error('CSV exceeds 2 MB.');
    const rows = parseCSV(await file.text()), role = $('csv-role').value;
    if (evidence.length + rows.length > 5000) throw Error('Limit a case to 5,000 evidence records.');
    evidence.push(...rows.map(r => ({...cleanEvidence({...r, role, label:r.reference || `${file.name} · row ${r.row}`, fileName:file.name, provenance:`CSV row ${r.row}`}), id:crypto.randomUUID(), review:'unreviewed', linked:false})));
    status('evidence-status',`Imported ${rows.length} unreviewed records. No links created.`); render();
  } catch (e) { status('evidence-status',e.message); }
  finally { event.target.value = ''; }
};
function render() {
  $('records').replaceChildren();
  for (const e of evidence) {
    const box = el('div', undefined, 'record');
    box.append(el('h3',e.label), el('p',`${e.role} · ${e.provenance} · ${e.review} · ${e.linked?'Linked':'Unlinked'}`), el('p',`${e.date || 'Date missing'} · ${e.amount || 'Amount missing'} ${e.asset || ''}`));
    if (e.notes) box.append(el('p',e.notes));
    if (e.txid) box.append(el('p',e.txid));
    if (e.blockchain) appendSnapshot(box,e.blockchain,e.selectedOutput);
    if(e.evm)appendEVMSnapshot(box,e.evm,e.selectedTransfer);
    if (e.originalRequired) box.append(el('p',`Original missing: ${e.fileName}. Edit this record to reattach before review.`, 'warning'));
    if (e.file) {
      if (e.file.type.startsWith('image/')) { const img = el('img'); img.src = e.preview; img.alt = e.fileName; box.append(img); }
      const a = el('a',`Open original: ${e.fileName}`); a.href = e.preview; a.target = '_blank'; a.rel = 'noopener'; box.append(a);
    }
    if (transaction) { const m = match(transaction,e); box.append(el('p',`${m.candidate?'Candidate only':'Matching note'}: ${m.reasons.join('; ')}`)); }
    action(box,'Edit evidence',() => edit(e));
    action(box,e.review==='reviewed'?'Return to unreviewed':'I reviewed this record',() => {
      if (e.originalRequired) return status('evidence-status','Reattach the missing original before reviewing this record.');
      e.review = e.review==='reviewed'?'unreviewed':'reviewed'; e.linked=false; e.linkReason=''; render();
    });
    const rationale = el('textarea'); rationale.value=e.linkReason || ''; rationale.maxLength=4000;
    const l = el('label','How does this support the transaction? Include mismatches and uncertainty.'); l.append(rationale); box.append(l);
    if (e.previousLinkReason) box.append(el('p',`Previous explanation (requires reassessment): ${e.previousLinkReason}`));
    action(box,e.linked?'Unlink':'Link to transaction',() => {
      if (!transaction) return status('evidence-status','Save a transaction first.');
      if (e.review!=='reviewed' || e.originalRequired) return status('evidence-status','Review this record and its original first.');
      if (!e.linked && !rationale.value.trim()) return status('evidence-status','Enter a link explanation, including uncertainty.');
      e.linkReason=e.linked?'':rationale.value.trim(); e.linked=!e.linked; render();
    });
    action(box,'Remove',() => {
      if (e.preview) URL.revokeObjectURL(e.preview);
      evidence=evidence.filter(x => x.id!==e.id); if (editingId===e.id) cancelEdit(); render();
    });
    $('records').append(box);
  }
  preview();
}
function preview() {
  if (!transaction) { $('gaps').replaceChildren(); $('report-preview').replaceChildren(el('p','Save a transaction to prepare your report.')); return; }
  $('gaps').replaceChildren(...checklist(transaction,evidence).map(c => el('span',`${c.complete?'Linked':'Missing'}: ${c.role}`,'badge'+(c.complete?' complete':''))));
  const r=report(transaction,evidence), target=$('report-preview');
  target.replaceChildren(el('h2',r.title), el('p',`Generated ${r.generatedAt} · ${transaction.title}`), el('p',`${transaction.kind.replaceAll('_',' ')} · ${transaction.amount} ${transaction.asset} · ${transaction.date}`), el('p',transaction.narrative || 'Source narrative has not been provided.'));
  for (const line of r.limitations) target.append(el('p',line));
  target.append(el('h3','Evidence and unresolved gaps'));
  for (const c of r.checklist) target.append(el('p',`${c.role}: ${c.complete?'Reviewed evidence manually linked':'Evidence missing'}${c.complete?' · '+c.evidenceIds.join(', '):''}`));
  target.append(el('h3','Evidence timeline — user supplied'));
  for (const e of [...r.evidence].sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999'))) {
    target.append(el('h4',e.label), el('p',`ID: ${e.id} · ${e.role} · ${e.review} · ${e.linked?'Linked':'Unlinked'} · ${e.provenance}`), el('p',`${e.amount || 'No amount'} ${e.asset || ''} · ${e.date || 'No date'}`), el('p',e.notes || 'No notes'), el('p',e.linkReason || 'No link rationale'), el('p',e.match.reasons.join('; ')));
    if (e.txid) target.append(el('p',`Transaction ID: ${e.txid}`));
    if (e.blockchain) appendSnapshot(target,e.blockchain,e.selectedOutput);
    if(e.evm)appendEVMSnapshot(target,e.evm,e.selectedTransfer);
    if (e.fileName) target.append(el('p',`Source file: ${e.fileName}${e.originalRequired?' — original missing':' — original bytes not included in report'}`));
  }
  target.append(el('h3','Transaction structure (user supplied)'), el('pre',JSON.stringify(transaction,null,2)));
}
function download(value, filename) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=el('a'); a.href=url; a.download=filename; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
function downloadBytes(bytes,filename,type) {
  const url=URL.createObjectURL(new Blob([bytes],{type}));const a=el('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function appendSnapshot(parent,b,selected) {
  const s=b.status;
  parent.append(el('h4','Bitcoin provider snapshot'),el('p',`Source: ${b.sourceUrl} | Retrieved ${b.retrievedAt} | ${b.acquisition}`),el('p',`Fee ${b.feeSatoshis} satoshis | ${s.confirmed?'Provider reports confirmed':'Unconfirmed'} | Confirmations at snapshot: ${s.confirmations ?? 'unavailable'}`),el('p',`Selected output ${selected}: ${btcAmount(b.outputs[selected].satoshis)} BTC to ${b.outputs[selected].address || '(no address)'}. Entered fields may differ after manual edits; the snapshot stays unchanged.`));
  const details=el('details');details.append(el('summary','All inputs, outputs and snapshot limitations'),el('pre',JSON.stringify(b,null,2)));parent.append(details);
}
function appendEVMSnapshot(parent,s,selected){
  const transfer=s.transfers.find(t=>t.id===selected);
  parent.append(el('h4','Ethereum provider snapshot'),el('p',`Source: ${s.sourceUrl} | Retrieved ${s.retrievedAt} | ${s.acquisition}`),el('p',`Ethereum mainnet (chain ${s.chainId}) | ${s.state} | Confirmations at snapshot: ${s.confirmations ?? 'unavailable'} | Canonical block check: ${s.canonicalChecked?'provider agrees':'unavailable'}`),el('p',`Execution fee: ${s.fees.executionWei ?? 'unknown'} wei | Blob fee: ${s.fees.blobWei ?? 'unknown'} wei | Total fee: ${s.fees.totalWei ?? 'unknown / incomplete'} wei`));
  parent.append(el('p',transfer?`Selected ${transfer.id}: ${transfer.rawAmount} raw units | Decimals ${transfer.decimals ?? 'unknown'} | Contract ${transfer.contract || 'native ETH'} | ${transfer.from} → ${transfer.to}. Entered fields may differ; the snapshot stays unchanged.`:'Status-only record. No completed transfer is claimed.'));
  const details=el('details');details.append(el('summary','Transaction, receipt logs, transfers and limitations'),el('pre',JSON.stringify(s,null,2)));parent.append(details);
}
function clearEVMLookup(){pendingEVM=null;evmGeneration++;$('evm-consent').checked=false;$('evm-result').replaceChildren();}
$('evm-lookup-id').oninput=clearEVMLookup;
$('evm-lookup-chain').onchange=clearEVMLookup;
$('evm-fetch').onclick=async()=>{
  const generation=++evmGeneration,id=$('evm-lookup-id').value.trim();
  pendingEVM=null;$('evm-result').replaceChildren();$('evm-fetch').disabled=true;status('evm-status','Retrieving Ethereum provider snapshot…');
  try{
    if($('evm-lookup-chain').value!=='1')throw Error('Only Ethereum mainnet is supported for lookup.');
    const snapshot=await fetchEVM(id,{consent:$('evm-consent').checked});
    if(generation!==evmGeneration)return;pendingEVM=snapshot;
    const result=$('evm-result');
    result.append(el('p',`Provider status: ${snapshot.state}. ${snapshot.transfers.length} supported top-level/native or ERC-20-shaped transfers. Total fee ${snapshot.fees.totalWei ?? 'unavailable/incomplete'} wei. No ownership or token-authenticity claim.`));
    const label=el('label','Transfer or status record to explain'),select=el('select');select.id='evm-transfer';
    const empty=el('option','Choose explicitly');empty.value='';select.append(empty);
    const statusOption=el('option',`Status only — ${snapshot.state}, no completed amount claimed`);statusOption.value='status';select.append(statusOption);
    for(const transfer of snapshot.transfers){
      const option=el('option',`${transfer.id}: ${transfer.amount ?? transfer.rawAmount+' raw (decimals unknown)'} ${transfer.kind==='native'?'ETH':'token '+transfer.contract} → ${transfer.to}`);
      option.value=transfer.id;option.disabled=BigInt(transfer.rawAmount)===0n;select.append(option);
    }
    label.append(select);result.append(label);
    action(result,'Add selected Ethereum evidence',()=>{
      try{if(!pendingEVM||!select.value)throw Error('Select a transfer or status record first.');if(evidence.length>=5000)throw Error('Limit a case to 5,000 evidence records.');evidence.push({...evmEvidence(pendingEVM,select.value),id:crypto.randomUUID()});status('evm-status','Added as unreviewed evidence. Token ticker labels are manual; chain and contract identify the asset. The case transaction is unchanged.');render();}
      catch(e){status('evm-status',e.message);}
    });
    const details=el('details');details.append(el('summary','Inspect full Ethereum provider snapshot'),el('pre',JSON.stringify(snapshot,null,2)));result.append(details);
    status('evm-status',`Snapshot retrieved ${snapshot.retrievedAt}. Canonical block: ${snapshot.canonicalChecked?'provider agrees':'unavailable'}. Unknown decimals/fees remain unknown. Review before linking.`);
  }catch(e){if(generation===evmGeneration)status('evm-status',e.message);}
  finally{$('evm-fetch').disabled=false;}
};
$('btc-lookup-id').oninput=()=>{pendingBTC=null;lookupGeneration++;$('btc-consent').checked=false;$('btc-result').replaceChildren();};
$('btc-fetch').onclick=async()=>{
  const generation=++lookupGeneration,id=$('btc-lookup-id').value.trim();
  pendingBTC=null;$('btc-result').replaceChildren();$('btc-fetch').disabled=true;status('btc-status','Retrieving provider snapshot…');
  try {
    const snapshot=await fetchBTC(id,{consent:$('btc-consent').checked});
    if(generation!==lookupGeneration)return;
    pendingBTC=snapshot;
    const result=$('btc-result');
    result.append(el('p',`Retrieved ${snapshot.inputs.length} inputs, ${snapshot.outputs.length} outputs; fee ${snapshot.feeSatoshis} satoshis. ${snapshot.status.confirmed?'Provider reports confirmed.':'Unconfirmed; block date unavailable.'} No ownership inference.`));
    const label=el('label','Output to explain'),select=el('select');select.id='btc-output';
    const empty=el('option','Choose an output explicitly');empty.value='';select.append(empty);
    for(const output of snapshot.outputs){const option=el('option',`${output.index}: ${btcAmount(output.satoshis)} BTC → ${output.address || '(no address; inspect script)'}`);option.value=String(output.index);option.disabled=BigInt(output.satoshis)===0n;select.append(option);}
    label.append(select);result.append(label);
    action(result,'Add selected output as evidence',()=>{
      try {
        if(!pendingBTC || select.value==='')throw Error('Choose a positive output first.');
        if(evidence.length>=5000)throw Error('Limit a case to 5,000 evidence records.');
        evidence.push({...btcEvidence(pendingBTC,Number(select.value)),id:crypto.randomUUID()});
        status('btc-status','Added as unreviewed evidence. The case transaction is unchanged; review the snapshot before linking.');render();
      }catch(e){status('btc-status',e.message);}
    });
    const details=el('details');details.append(el('summary','Inspect full provider snapshot'),el('pre',JSON.stringify(snapshot,null,2)));result.append(details);
    status('btc-status',`Snapshot retrieved at ${snapshot.retrievedAt}. Confirmations: ${snapshot.status.confirmations ?? 'unavailable (tip height missing or inconsistent)'}.`);
  }catch(e){if(generation===lookupGeneration)status('btc-status',e.message);}
  finally{$('btc-fetch').disabled=false;}
};
function load(value) {
  transaction=value.transaction; evidence=value.evidence; transactionDirty=false;
  for (const key of ['kind','title','amount','asset','date','network','txid','chainId','tokenContract','narrative']) form.elements[key].value=transaction[key] || '';
  for (const id of ['btc-inputs','btc-outputs','evm-tokens']) $(id).replaceChildren();
  const x=transaction.structure; $('include-details').checked=Boolean(x);
  if (x && transaction.network==='BTC') { for (const i of x.inputs) row('btc-inputs',inputSpecs,i); for (const o of x.outputs) row('btc-outputs',outputSpecs,o); }
  if (x && transaction.network==='EVM') { $('evm-from').value=x.from; $('evm-to').value=x.to; $('evm-value').value=x.valueWei; for (const t of x.tokenTransfers) row('evm-tokens',tokenSpecs,t); }
  networkUI(); cancelEdit(); render();
}
function requireEmpty() { if (transaction || evidence.length || transactionDirty || evidenceDirty) throw Error('Save your current case and clear the session before loading another.'); }
$('save-case').onclick = () => { try { requireSaved(); download(saveCase(transaction,evidence),'crypto-passport.case.json'); status('session-status','Case file saved without originals. Keep originals separately and store the file privately.'); } catch(e) { status('session-status',e.message); } };
$('open-case').onchange = async event => {
  try { requireEmpty(); const file=event.target.files[0]; if (!file) return; if(file.size>5_000_000) throw Error('Case file exceeds 5 MB.'); load(openCase(await file.text())); status('session-status','Case reopened. Review all records again and reattach missing originals before linking.'); }
  catch(e) { status('session-status',e.message); } finally { event.target.value=''; }
};
$('demo').onclick = () => { try { requireEmpty(); load(demoCase()); status('session-status','SYNTHETIC example loaded. Every record is fictional and unreviewed. Ownership, income and fee questions remain unresolved.'); } catch(e) { status('session-status',e.message); } };
$('preview').onclick=preview;
$('json').onclick=() => { try { requireSaved(); download(report(transaction,evidence),'crypto-passport.report.json'); } catch(e) { status('session-status',e.message); } };
$('print').onclick=() => { try { requireSaved(); preview(); window.print(); } catch(e) { status('session-status',e.message); } };
$('pdf').onclick=async()=>{
  try{requireSaved();$('pdf').disabled=true;status('session-status','Rendering report PDF locally…');const snapshot=report(transaction,evidence);const bytes=await createReportPDF(snapshot);downloadBytes(bytes,'crypto-passport.report.pdf','application/pdf');status('session-status','PDF prepared locally. Page images preserve displayed text; JSON remains the searchable record.');}
  catch(e){status('session-status',e.message);}finally{$('pdf').disabled=false;}
};
$('reset').onclick=() => {
  if (!confirm('Clear this local session? Save a case file first if you need to reopen it.')) return;
  for (const e of evidence) if (e.preview) URL.revokeObjectURL(e.preview);
  transaction=null; evidence=[]; transactionDirty=false; form.reset(); cancelEdit();
  pendingBTC=null;lookupGeneration++;$('btc-result').replaceChildren();$('btc-lookup-id').value='';$('btc-consent').checked=false;status('btc-status','');
  clearEVMLookup();$('evm-lookup-id').value='';status('evm-status','');
  for (const id of ['btc-inputs','btc-outputs','evm-tokens']) $(id).replaceChildren();
  for (const id of ['session-status','case-status','evidence-status']) status(id,'');
  networkUI(); render();
};
window.addEventListener('beforeunload',e => { if (transaction || evidence.length || transactionDirty || evidenceDirty) { e.preventDefault(); e.returnValue=''; } });
networkUI();
