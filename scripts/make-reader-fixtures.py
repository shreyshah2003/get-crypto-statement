from pathlib import Path
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter

root=Path(__file__).parent/'reader-fixtures'
root.mkdir(exist_ok=True)
pdf=canvas.Canvas(str(root/'digital.pdf'),pagesize=(612,792))
for lines in [
 ['SYNTHETIC BANK STATEMENT - READER TEST','No real account, funds or identity','Transaction date: 2026-10-21','Amount received: USD 50,000.00','Fee: USD 15.00','Closing balance: USD 62,500.00'],
 ['SYNTHETIC SECOND PAGE','Transaction date: 03/04/2026','Amount: EUR 1.234,56','This numeric date needs document date order review.']
]:
 for i,line in enumerate(lines): pdf.drawString(50,735-i*35,line)
 pdf.showPage()
pdf.save()
image=Image.new('RGB',(1600,1200),'white');draw=ImageDraw.Draw(image)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf' if Path('C:/Windows/Fonts/arial.ttf').exists() else 'DejaVuSans.ttf',42)
for i,line in enumerate(['SYNTHETIC SCANNED RECEIPT','No real transaction','Transaction date: 23/10/2026','Amount received: INR 1,250.75','Fee: INR 10.00']):draw.text((80,100+i*120),line,font=font,fill='black')
image.save(root/'receipt.png')
pdf=canvas.Canvas(str(root/'scanned.pdf'),pagesize=(800,600));pdf.drawImage(str(root/'receipt.png'),0,0,width=800,height=600);pdf.showPage();pdf.save()
pdf=canvas.Canvas(str(root/'filled-form.pdf'),pagesize=(612,792));pdf.drawString(50,735,'SYNTHETIC FILLED PAYMENT FORM - no real funds')
pdf.acroForm.textfield(name='Amount received',value='750.25 USD',x=60,y=640,width=300,height=30)
pdf.acroForm.textfield(name='Transaction date',value='2026-10-22',x=60,y=580,width=300,height=30)
pdf.showPage();pdf.save()
writer=PdfWriter();writer.append(PdfReader(root/'digital.pdf'));writer.encrypt('synthetic-test-password');writer.write(root/'encrypted.pdf')
print('Created digital, scanned, filled-form and encrypted fixtures; screenshot PNG.')
