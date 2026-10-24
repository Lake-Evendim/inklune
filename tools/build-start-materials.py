from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageFilter,ImageDraw,ImageFont

project=Path(__file__).resolve().parents[1]
dest=project/'public/start-materials';dest.mkdir(exist_ok=True)
n=2048
rng=np.random.default_rng(10222026)
def field(sx,sy=None):
    sy=sx if sy is None else sy
    source=rng.standard_normal((n,n)).astype('float32')
    fx=np.fft.rfftfreq(n)[None,:];fy=np.fft.fftfreq(n)[:,None]
    filt=np.exp(-2*np.pi**2*((fx*sx)**2+(fy*sy)**2))
    a=np.fft.irfft2(np.fft.rfft2(source)*filt,s=(n,n)).real
    return a/(a.std()+1e-6)

grain=field(1.25);body=field(5.2);pulp=field(18);cloud=field(110)
fibres=Image.new('F',(n,n));draw=ImageDraw.Draw(fibres)
for i in range(2900):
    x,y=rng.uniform(0,n,2);length=rng.uniform(7,38);angle=rng.uniform(0,np.pi)
    dx,dy=np.cos(angle)*length,np.sin(angle)*length
    for ox in [-n,0,n]:
        for oy in [-n,0,n]:
            draw.line((x+ox,y+oy,x+dx+ox,y+dy+oy),fill=float(rng.uniform(-1,1)),width=1)
# Periodic smoothing preserves a seamless tile without visible speckles.
f=np.array(fibres)
f=np.fft.irfft2(np.fft.rfft2(f)*np.exp(-2*np.pi**2*(np.fft.rfftfreq(n)[None,:]**2+np.fft.fftfreq(n)[:,None]**2)*.7**2),s=(n,n)).real
f=f/(f.std()+1e-6)
weave=field(1,25)*.55+field(25,1)*.45
specs=[
 ('snow','纯白细棉','#fafaf7',(.57,.38,.32,.16,.14,0)),
 ('milk','暖白纤维','#f7f5ed',(.68,.45,.43,.24,.35,0)),
 ('ivory','象牙纸浆','#f4efdf',(.58,.48,.61,.28,.23,0)),
 ('oat','米色手工纸','#eee7d9',(.70,.55,.62,.35,.38,0)),
 ('linen','细纹布纸','#f4f1e8',(.46,.33,.32,.19,.13,.38)),
 ('book','平滑书纸','#f9f7f0',(.37,.28,.23,.13,.10,0)),
 ('graphite','石墨黑','#202122',(.58,.52,.31,.25,.04,.20)),
]
stats={}
for id,title,hex,weights in specs:
    base=np.array([int(hex[i:i+2],16) for i in [1,3,5]])
    relief=sum(a*w for a,w in zip([grain,body,pulp,cloud,f,weave],weights))
    # Visible fibre relief at the actual display scale, without dark pores.
    relief=(2.7 if id=='graphite' else 4.6)*2.8*np.tanh(relief/2.8)
    rgb=np.clip(base[None,None,:]+relief[:,:,None],0,255).round().astype('uint8')
    image=Image.fromarray(rgb);image.save(dest/f'{id}-v2.webp',lossless=True,method=6)
    image.resize((600,600),Image.Resampling.LANCZOS).save(dest/f'{id}-v2-swatch.webp',lossless=True,method=6)
    css=np.array(image.resize((1024,1024),Image.Resampling.LANCZOS)).astype('float32')
    stats[id]={'size':list(image.size),'std':round(float(relief.std()),3),'displayStd':round(float(css[:,:,0].std()),3),'bytes':(dest/f'{id}-v2.webp').stat().st_size,'base':hex,'file':f'{id}-v2.webp'}

# Material proof sheet, not a browser screenshot. Samples show actual assets.
sheet=Image.new('RGB',(1800,1230),'#e7e5de');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
for i,(id,title,hex,weights) in enumerate(specs):
    x=(i%4)*450;y=(i//4)*615
    sample=Image.open(dest/f'{id}-v2.webp').crop((40,40,940,1120)).resize((430,540),Image.Resampling.LANCZOS)
    sheet.paste(sample,(x+10,y+10));draw.text((x+20,y+570),title,fill='#383b38',font=font)
sheet.save(dest/'material-v2-proof.png')
(dest/'manifest-v2.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
