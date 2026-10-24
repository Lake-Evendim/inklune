from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

dest=Path(__file__).resolve().parents[1]/'public/night-materials'
dest.mkdir(exist_ok=True)
n=2048
rng=np.random.default_rng(20261023)
fx=np.fft.rfftfreq(n)[None,:]
fy=np.fft.fftfreq(n)[:,None]
def field(sx,sy=None):
    if sy is None: sy=sx
    a=rng.standard_normal((n,n)).astype('float32')
    a=np.fft.irfft2(np.fft.rfft2(a)*np.exp(-2*np.pi**2*((fx*sx)**2+(fy*sy)**2)),s=(n,n)).real
    return a/(a.std()+1e-8)
def smooth(a,s):
    return np.fft.irfft2(np.fft.rfft2(a)*np.exp(-2*np.pi**2*(fx**2+fy**2)*s*s),s=(n,n)).real
fine=field(.6)
grain=field(1.4)
body=field(5)
cloud=field(70)
fibres=Image.new('F',(n,n))
draw=ImageDraw.Draw(fibres)
for _ in range(7000):
    x,y=rng.uniform(0,n,2);a=rng.uniform(0,np.pi);length=rng.uniform(5,25)
    dx,dy=np.cos(a)*length,np.sin(a)*length
    for ox in [-n,0,n]:
        for oy in [-n,0,n]:
            draw.line((x+ox,y+oy,x+dx+ox,y+dy+oy),fill=float(rng.uniform(-1,1)),width=1)
fiber=smooth(np.array(fibres),.55)
fiber/=fiber.std()+1e-8
y,x=np.mgrid[0:n,0:n]
warp=field(1,32);weft=field(28,1)
# Yarn thickness and relief vary; the weaving is finer than a visible grid.
weave=(np.sin(2*np.pi*x/8+.20*cloud)+np.sin(2*np.pi*y/9+.15*body))*.4
weave+=warp*.48+weft*.48
slate=field(24,1.4)*.75+field(45,5)*.45+field(13)*.18
# Periodic rings run along the wood; narrow pores follow the same grain.
flow=field(65,160)*26+field(12,110)*5
rings=np.sin(2*np.pi*(x+flow)/105)*.7+np.sin(2*np.pi*(x+flow)/34)*.22
wood=rings+field(.8,42)*.72+field(4,90)*.55
specs=[
    ('midnight','午夜棉纸','#1b222d',fine*.45+grain*.9+body*.35+cloud*.13+fiber*.7,1.9),
    ('linen','暖灰亚麻','#292622',fine*.35+grain*.35+weave*1.1+body*.18,2.05),
    ('suede','炭黑麂皮','#201e1d',fine*.38+grain*.65+body*.6+cloud*.2+field(2,8)*.24,1.6),
    ('slate','蓝灰石板','#202932',fine*.4+grain*.5+slate+cloud*.15,1.7),
    ('walnut','烟熏胡桃','#281f1b',fine*.3+grain*.4+wood+cloud*.12,2.25),
]
stats={}
for key,title,color,relief,amplitude in specs:
    base=np.array([int(color[i:i+2],16) for i in (1,3,5)])
    relief=amplitude*3*np.tanh(relief/3)
    rgb=np.clip(base+relief[:,:,None],0,255).round().astype('uint8')
    image=Image.fromarray(rgb)
    image.save(dest/f'{key}.webp',lossless=True,method=6)
    # Swatches retain the same physical texture scale as the full-size room.
    image.resize((1024,1024),Image.Resampling.LANCZOS).crop((0,0,320,200)).save(dest/f'{key}-swatch.webp',lossless=True,method=6)
    stats[key]={'title':title,'color':color,'size':[n,n],'displayPixels':1024,'bytes':(dest/f'{key}.webp').stat().st_size}
(dest/'manifest.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False,indent=2))
