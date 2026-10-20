from PIL import Image, ImageDraw
for size, name in [(192,'icon-192.png'),(512,'icon-512.png'),(512,'icon-maskable.png'),(180,'apple-touch-icon.png')]:
 im=Image.new('RGB',(size,size),'#09090b');d=ImageDraw.Draw(im);s=size/512
 def pts(values):return [(round(x*s),round(y*s)) for x,y in values]
 d.rounded_rectangle((round(48*s),round(48*s),round(464*s),round(464*s)),radius=round(78*s),outline='#e52e3a',width=max(1,round(5*s)))
 d.polygon(pts([(125,151),(182,151),(256,323),(330,151),(387,151),(274,376),(238,376)]),fill='#ef3946')
 d.polygon(pts([(215,197),(215,286),(286,242)]),fill='white');im.save('public/'+name)
