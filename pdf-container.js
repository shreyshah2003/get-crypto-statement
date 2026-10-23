// Minimal PDF 1.4 image-page container. Report text is rasterized locally so browser
// fonts render Unicode without sending names or financial data to a font service.
export function imagePDF(pages) {
  if (!Array.isArray(pages) || !pages.length || pages.length>150) throw Error('PDF supports 1–150 pages.');
  const encoder=new TextEncoder(), chunks=[], offsets=[0];let length=0;
  function put(v){const b=typeof v==='string'?encoder.encode(v):v;chunks.push(b);length+=b.length;}
  function object(id,content){offsets[id]=length;put(`${id} 0 obj\n`);if(Array.isArray(content))for(const c of content)put(c);else put(content);put('\nendobj\n');}
  put('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  pages.forEach((p,i)=>{
    if (!(p.bytes instanceof Uint8Array) || p.bytes[0]!==255 || p.bytes[1]!==216 || !Number.isSafeInteger(p.width) || p.width<1 || !Number.isSafeInteger(p.height) || p.height<1) throw Error('Invalid PDF page image.');
    const id=3+i*3, stream='q 595 0 0 842 0 0 cm /PageImage Do Q';
    object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /PageImage ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
    object(id+1,[`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`,p.bytes,'\nendstream']);
    object(id+2,`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  const xref=length;put(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(const offset of offsets.slice(1))put(`${String(offset).padStart(10,'0')} 00000 n \n`);
  put(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result=new Uint8Array(length);let pos=0;for(const b of chunks){result.set(b,pos);pos+=b.length;}return result;
}
