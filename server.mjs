import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const allowed = {'/':'index.html','/app.js':'app.js','/core.js':'core.js','/casefile.js':'casefile.js','/demo.js':'demo.js','/style.css':'style.css'};
http.createServer(async(req,res)=>{try {const path=allowed[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");res.end(await readFile(fileURLToPath(new URL(path,import.meta.url))));}catch{res.writeHead(500);res.end('Unable to load app');}}).listen(5173,'127.0.0.1',()=>console.log('Crypto Passport: http://127.0.0.1:5173'));
