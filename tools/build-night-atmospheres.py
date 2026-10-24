from pathlib import Path
import json
import numpy as np
from PIL import Image

dest=Path(__file__).resolve().parents[1]/'public/night-materials'
dest.mkdir(exist_ok=True)
rng=np.random.default_rng(2026102302)

def rgb(hex): return np.array([int(hex[i:i+2],16) for i in (1,3,5)],dtype='float32')
def render(key,width,height):
    y,x=np.mgrid[0:height,0:width].astype('float32')
    x/=width;y/=height
    # Gentle nonlinear displacement gives each blurred band a painted edge.
    bend=.025*np.sin(x*6.2+.5)+.022*np.sin(x*3.1+y*2.8)
    def band(center,spread,tilt=0):
        return np.exp(-.5*((y-center-bend-tilt*(x-.5))/spread)**2)
    def bloom(cx,cy,sx,sy):
        return np.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2))
    if key=='hazy':
        image=np.broadcast_to(rgb('#171519'),(height,width,3)).copy()
        fog=band(.28,.16,-.20)*(.65+.35*bloom(.15,.3,.65,.65))
        image+=(rgb('#42352f')-rgb('#171519'))*fog[:,:,None]
        image+=np.array([16,12,10])*band(.72,.105,.14)[:,:,None]*(.2+.8*bloom(.80,.75,.7,.6))[:,:,None]
        image-=np.array([8,7,6])*band(.51,.085,-.15)[:,:,None]
        image+=np.array([7,6,5])*bloom(.08,.10,.4,.2)[:,:,None]
    elif key=='ebony':
        image=np.broadcast_to(rgb('#111112'),(height,width,3)).copy()
        image+=np.array([25,17,12])*band(.35,.07,.11)[:,:,None]*(.45+.55*bloom(.65,.35,.65,.5))[:,:,None]
        image+=np.array([32,24,18])*band(.77,.15,-.15)[:,:,None]
        image-=np.array([10,8,6])*band(.67,.038,-.10)[:,:,None]
        image+=np.array([8,6,4])*bloom(.18,.56,.4,.27)[:,:,None]
    else:
        image=np.broadcast_to(rgb('#151311'),(height,width,3)).copy()
        # Warm light flows diagonally behind the room; no white/yellow core.
        image+=np.array([45,32,17])*band(.66,.13,-.30)[:,:,None]
        image+=np.array([18,13,8])*band(.92,.09,.11)[:,:,None]
        image-=np.array([12,9,5])*band(.80,.045,-.20)[:,:,None]
        image+=np.array([10,7,4])*bloom(.10,.32,.35,.28)[:,:,None]
    # Low contrast vignette preserves the light-field rather than a hard frame.
    vignette=((x-.5)**2*.7+(y-.45)**2*.4)
    image-=vignette[:,:,None]*np.array([4,3,3])
    image=np.clip(image,0,255).round().astype('uint8')
    return Image.fromarray(image)

stats={}
for key in ['hazy','ebony','golden']:
    landscape=render(key,2560,1600)
    landscape.save(dest/f'{key}.webp',lossless=True,method=6)
    render(key,1600,2400).save(dest/f'{key}-portrait.webp',lossless=True,method=6)
    sample=landscape.resize((320,200),Image.Resampling.LANCZOS)
    a=np.array(sample).astype('float32')
    grain=rng.standard_normal((200,320))*1.8
    Image.fromarray(np.clip(a+grain[:,:,None],0,255).round().astype('uint8')).save(dest/f'{key}-swatch.webp',lossless=True,method=6)
    arr=np.array(landscape)
    stats[key]={'landscape':[2560,1600],'portrait':[1600,2400],'rgbMax':int(arr.max()),'file':f'{key}.webp'}
# A separate native-scale grain surface stays sharp at every viewport.
grain=rng.standard_normal((1024,1024))
grain=(np.tanh(grain/2)*88+128).round().astype('uint8')
Image.fromarray(grain).convert('RGB').save(dest/'film-grain.webp',lossless=True,method=6)
(dest/'atmosphere-manifest.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
