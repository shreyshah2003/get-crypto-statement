import {textLines} from './document-fields.js';

const MAX_PIXELS=8_000_000,MAX_TEXT=300_000;
export function validateRead(file,start,end){
  if(!file||!file.size)throw Error('Choose a PDF or screenshot first.');
  if(file.size>10*1024*1024)throw Error('Attachment exceeds 10 MB.');
  if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose PDF, PNG, JPEG or WebP.');
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=10)throw Error('Choose a range of up to 10 pages, starting at page 1 or later.');
}
export async function readAttachment(file,{start=1,end=3,forceOCR=false,onProgress=()=>{},signal}={}){
  validateRead(file,start,end);
  let pdf=null,task=null,worker=null,renderTask=null,cancelled=false,timedOut=false,rejectCancelled;
  const cancellation=new Promise((resolve,reject)=>{rejectCancelled=reject;});cancellation.catch(()=>{});
  const race=operation=>Promise.race([operation,cancellation]);
  const stop=()=>{cancelled=true;rejectCancelled(Error('Reading cancelled.'));renderTask?.cancel();task?.destroy()?.catch(()=>{});worker?.terminate();};
  const check=()=>{if(cancelled||signal?.aborted)throw Error(timedOut?'Reading exceeded three minutes. Try fewer pages.':'Reading cancelled.');};
  const timer=setTimeout(()=>{timedOut=true;stop();},180000);signal?.addEventListener('abort',stop,{once:true});
  async function recognize(canvas,page){
    check();
    if(!worker){
      onProgress('Loading local English OCR…');
      const {default:Tesseract}=await race(import('/vendor/tesseract/tesseract.esm.min.js'));check();
      let rejectOCR;const ocrFailure=new Promise((resolve,reject)=>{rejectOCR=reject;});ocrFailure.catch(()=>{});
      const creating=Tesseract.createWorker('eng',1,{workerPath:'/vendor/tesseract/worker.min.js',corePath:'/vendor/tesseract-core',langPath:'/vendor/tessdata',workerBlobURL:false,cacheMethod:'none',errorHandler:error=>rejectOCR(Error(String(error))),logger:m=>{if(!cancelled&&m.status==='recognizing text')onProgress(`Reading page ${page}: ${Math.round((m.progress||0)*100)}%`);}}).then(created=>{if(cancelled){created.terminate();check();}return created;});
      worker=await race(Promise.race([creating,ocrFailure]));
      if(cancelled){await worker.terminate();check();}
    }
    const result=await race(worker.recognize(canvas));check();
    return {page,method:'OCR',text:result.data.text,confidence:Number.isFinite(result.data.confidence)?Math.round(result.data.confidence):null};
  }
  try{
    check();const pages=[],warnings=[];
    if(file.type==='application/pdf'){
      onProgress('Reading PDF text and filled form fields…');
      const pdfjs=await race(import('/vendor/pdfjs/pdf.mjs'));check();
      pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.mjs';
      task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false,useSystemFonts:true,useWasm:false,isOffscreenCanvasSupported:false,fontExtraProperties:false,cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/pdfjs/standard_fonts/'});
      // Passwords are never requested or sent; users can attach an unlocked local copy.
      task.onPassword=()=>{stop();};
      pdf=await race(task.promise);check();
      if(start>pdf.numPages)throw Error(`This PDF has ${pdf.numPages} pages. Choose an earlier start page.`);
      const last=Math.min(end,pdf.numPages);
      if(start>1||last<pdf.numPages)warnings.push(`Only pages ${start}–${last} of ${pdf.numPages} were read. Other pages may contain relevant transactions.`);
      for(let number=start;number<=last;number++){
        check();onProgress(`Reading PDF page ${number} of ${pdf.numPages}…`);
        const page=await race(pdf.getPage(number)),content=await race(page.getTextContent()),annotations=await race(page.getAnnotations());check();
        const formText=annotations.filter(a=>a.subtype==='Widget'&&a.fieldValue!=null&&a.fieldType!=='Sig').map(a=>`${a.fieldName||'Form field'}: ${Array.isArray(a.fieldValue)?a.fieldValue.join(' '):String(a.fieldValue)}`).join('\n');
        const text=textLines(content.items);let result;
        if(forceOCR||(text+formText).replace(/\s/g,'').length<35){
          const view=page.getViewport({scale:1}),scale=Math.min(2.5,Math.sqrt(MAX_PIXELS/(view.width*view.height)));
          if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid PDF page dimensions.');
          const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));
          try{renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'});await race(renderTask.promise);result=await recognize(canvas,number);}finally{renderTask=null;canvas.width=canvas.height=0;}
          if(formText)pages.push({page:number,method:'PDF form fields',confidence:null,text:formText});
          if(text.trim())pages.push({page:number,method:'PDF text',confidence:null,text});
        }else result={page:number,method:'PDF text / form fields',confidence:null,text:[text,formText].filter(Boolean).join('\n')};
        pages.push(result);page.cleanup();
        if(pages.reduce((n,p)=>n+p.text.length,0)>MAX_TEXT)throw Error('Extracted text exceeds the reading limit. Try a smaller page range.');
      }
    }else{
      if(start!==1)throw Error('Screenshots have one page. Set the start page to 1.');
      const bitmap=await createImageBitmap(file);if(cancelled||signal?.aborted){bitmap.close();check();}
      const scale=Math.min(2,Math.sqrt(MAX_PIXELS/(bitmap.width*bitmap.height))),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(bitmap.width*scale));canvas.height=Math.max(1,Math.floor(bitmap.height*scale));
      try{const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();pages.push(await recognize(canvas,1));}finally{canvas.width=canvas.height=0;bitmap.close();}
    }
    check();return {pages,warnings};
  }catch(error){
    if(cancelled||signal?.aborted)throw Error(timedOut?'Reading exceeded three minutes. Try fewer pages.':'Reading cancelled or PDF is password-protected. Use an unlocked copy and try again.');
    if(error.name==='PasswordException')throw Error('PDF is password-protected. Attach an unlocked local copy.');
    throw Error('Unable to read this attachment: '+(error?.message||String(error)));
  }finally{cancelled=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);await worker?.terminate();await task?.destroy();}
}
