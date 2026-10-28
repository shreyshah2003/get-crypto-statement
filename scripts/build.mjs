import {readFile,writeFile,mkdir,copyFile,readdir,rm,lstat} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist');
// This build replaces only its own dist directory and refuses linked output directories.
if(dirname(out)!==root||relative(root,out)!=='dist')throw Error('Unsafe build output directory.');
try{if((await lstat(out)).isSymbolicLink())throw Error('Build output must not be a symbolic link.');}catch(e){if(e.code!=='ENOENT')throw e;}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const appFiles=['index.html','app.js','core.js','evidence-map.js','casefile.js','demo.js','btc.js','evm.js','amount.js','pdf.js','pdf-container.js','document-fields.js','document-reader.js','reader-ui.js','style.css'];
const copies=appFiles.map(name=>[name,name]);
copies.push(
 ['node_modules/pdfjs-dist/build/pdf.mjs','vendor/pdfjs/pdf.mjs'],
 ['node_modules/pdfjs-dist/build/pdf.worker.mjs','vendor/pdfjs/pdf.worker.mjs'],
 ['node_modules/tesseract.js/dist/tesseract.esm.min.js','vendor/tesseract/tesseract.esm.min.js'],
 ['node_modules/tesseract.js/dist/worker.min.js','vendor/tesseract/worker.min.js'],
 ['node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','vendor/tessdata/eng.traineddata.gz']
);
for(const [source,destination,pattern]of [
 ['node_modules/tesseract.js-core','vendor/tesseract-core',/^tesseract-core(?:-(?:simd|relaxedsimd))?(?:-lstm)?\.(?:wasm\.js|wasm|js)$/],
 ['node_modules/pdfjs-dist/cmaps','vendor/pdfjs/cmaps',/^[\w.-]+\.bcmap$/],
 ['node_modules/pdfjs-dist/standard_fonts','vendor/pdfjs/standard_fonts',/^[\w.-]+\.(?:pfb|ttf)$/]
]){
  for(const entry of await readdir(join(root,source),{withFileTypes:true}))if(entry.isFile()&&pattern.test(entry.name))copies.push([source+'/'+entry.name,destination+'/'+entry.name]);
}
for(const [name,source]of [
 ['pdfjs','node_modules/pdfjs-dist/LICENSE'],['tesseract','node_modules/tesseract.js/LICENSE.md'],['tesseract-core','node_modules/tesseract.js-core/LICENSE']
]){try{await readFile(join(root,source));copies.push([source,'licenses/'+name+'.txt']);}catch(e){if(e.code!=='ENOENT')throw e;}}
try{
  for(const [source,destination]of copies){const target=join(out,destination);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,source),target);}
}catch(error){throw Error('Build requires installed PDF/OCR assets. Run npm ci first. '+error.message);}
const policy="default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https://mempool.space https://eth.drpc.org; object-src 'none'; base-uri 'none'";
const html=(await readFile(join(out,'index.html'),'utf8')).replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+policy+'"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow">');
await writeFile(join(out,'index.html'),html);
await writeFile(join(out,'_headers'),'/*\n  Content-Security-Policy: '+policy+"; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n");
const manifest=[];for(const [,path]of copies){const bytes=await readFile(join(out,path));manifest.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(join(out,'asset-manifest.json'),JSON.stringify({version:1,files:manifest},null,2)+'\n');
console.log(`Built ${manifest.length} explicit app/reader assets in dist. No documents, case files, tests, server code or secrets are packaged.`);
