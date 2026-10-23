import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=new URL('../dist/',import.meta.url),manifest=JSON.parse(await readFile(new URL('asset-manifest.json',root),'utf8'));
for(const file of manifest.files){assert.ok(!/(?:^|\/)(?:\.env[^/]*|node_modules|examples|scripts|server\.mjs)|\.case\.json$|\.test\.js$/.test(file.path));const bytes=await readFile(new URL(file.path,root));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
for(const name of ['index.html','app.js','document-reader.js','reader-ui.js','vendor/pdfjs/pdf.worker.mjs','vendor/tesseract/worker.min.js','vendor/tessdata/eng.traineddata.gz'])assert.ok(manifest.files.some(f=>f.path===name),name);
const html=await readFile(new URL('index.html',root),'utf8');assert.ok(html.includes('Content-Security-Policy'));assert.ok(html.includes("'wasm-unsafe-eval'"));assert.ok(html.includes('no-referrer'));assert.ok(!html.includes('localhost'));
const allowed=new Set([...manifest.files.map(f=>f.path),'_headers','asset-manifest.json']);
async function inspect(url,prefix=''){for(const e of await readdir(url,{withFileTypes:true})){const path=prefix+e.name;if(e.isDirectory())await inspect(new URL(e.name+'/',url),path+'/');else assert.ok(allowed.has(path),'Unexpected build file '+path);}}
await inspect(root);console.log(`Verified all ${manifest.files.length} build assets, content hashes, local OCR paths, HTML policy and absence of unlisted files in ${fileURLToPath(root)}.`);
