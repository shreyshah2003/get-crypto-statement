import http from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const allowed=Object.fromEntries(['index.html','app.js','core.js','evidence-map.js','casefile.js','demo.js','btc.js','evm.js','amount.js','pdf.js','pdf-container.js','document-fields.js','document-reader.js','reader-ui.js','style.css'].map(name=>[name==='index.html'?'/':'/'+name,name]));
const vendor={
  '/vendor/pdfjs/pdf.mjs':'node_modules/pdfjs-dist/build/pdf.mjs',
  '/vendor/pdfjs/pdf.worker.mjs':'node_modules/pdfjs-dist/build/pdf.worker.mjs',
  '/vendor/tesseract/tesseract.esm.min.js':'node_modules/tesseract.js/dist/tesseract.esm.min.js',
  '/vendor/tesseract/worker.min.js':'node_modules/tesseract.js/dist/worker.min.js',
  '/vendor/tessdata/eng.traineddata.gz':'node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'
};
// Only known installed library assets are exposed, never arbitrary node_modules paths.
for(const [prefix,directory,pattern]of [
  ['/vendor/tesseract-core/','node_modules/tesseract.js-core/',/^tesseract-core(?:-(?:simd|relaxedsimd))?(?:-lstm)?\.(?:wasm\.js|wasm|js)$/],
  ['/vendor/pdfjs/cmaps/','node_modules/pdfjs-dist/cmaps/',/^[\w.-]+\.bcmap$/],
  ['/vendor/pdfjs/standard_fonts/','node_modules/pdfjs-dist/standard_fonts/',/^[\w.-]+\.(?:pfb|ttf)$/]
]){try{for(const entry of await readdir(new URL(directory,import.meta.url),{withFileTypes:true}))if(entry.isFile()&&pattern.test(entry.name))vendor[prefix+entry.name]=directory+entry.name;}catch{}}
const mime=path=>path.endsWith('.mjs')||path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.wasm')?'application/wasm':path.endsWith('.html')?'text/html':'application/octet-stream';
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed');}
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const route=new URL(req.url,'http://localhost').pathname,path=allowed[route]||vendor[route];
    if(!path){res.writeHead(404);return res.end('Not found');}
    res.setHeader('Content-Type',mime(path));
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https://mempool.space https://eth.drpc.org; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const body=await readFile(fileURLToPath(new URL(path,import.meta.url)));res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(500);res.end('Unable to load app asset. Run npm ci to install local PDF/OCR assets.');}
}).listen(5173,'127.0.0.1',()=>console.log('Crypto Passport: http://127.0.0.1:5173'));
