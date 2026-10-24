from pathlib import Path
import json
import numpy as np
from PIL import Image

dest=Path(__file__).resolve().parents[1]/'public/night-materials'
dest.mkdir(exist_ok=True)
def render(key,width,height):
    rng=np.random.default_rng(2026102303+['black-fog','obsidian','velvet','inkstone'].index(key))
    y,x=np.mgrid[0:height,0:width].astype('float32');x/=width;y/=height
    fx=np.fft.rfftfreq(width)[None,:];fy=np.fft.fftfreq(height)[:,None]
    def field(sx,sy=None):
        sy=sx if sy is None else sy
        a=rng.standard_normal((height,width)).astype('float32')
        a=np.fft.irfft2(np.fft.rfft2(a)*np.exp(-2*np.pi**2*((fx*sx)**2+(fy*sy)**2)),s=(height,width)).real.astype('float32')
        return a/(a.std()+1e-7)
    def band(center,spread,tilt=0,curve=.025):
        bend=curve*np.sin(x*4.5+.7)+curve*.45*np.sin(x*8+y*2)
        return np.exp(-.5*((y-center-bend-tilt*(x-.5))/spread)**2)
    def bloom(cx,cy,sx,sy):
        return np.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2))
    fine=field(.58);grain=field(1.55);body=field(4.5);cloud=field(52)
    if key=='black-fog':
        # Distant fog is sculpted from black, without warm or cool hues.
        light=6+13*band(.30,.135,-.23)+8*band(.79,.10,.12)
        light-=3*band(.55,.07,-.13)
        relief=.60*fine+.75*grain+.30*body+.24*cloud
    elif key=='obsidian':
        # Polished folds have a restrained reflection and a soft shoulder.
        light=4+6*band(.56,.25,-.40)
        light+=17*band(.44,.035,-.40,.055)*(.25+.75*bloom(.65,.40,.6,.6))
        light+=7*band(.47,.085,-.40,.055)
        light-=4*band(.59,.06,-.40,.045)
        light+=6*band(.87,.06,.17)
        relief=.32*fine+.34*grain+.15*body
    elif key=='velvet':
        # Velvet nap has softly directional relief rather than pores.
        nap=field(1.2,6)*.5+field(2.2,14)*.22
        light=8+5*bloom(.25,.25,.4,.4)+4*bloom(.78,.8,.5,.27)
        light-=3*band(.48,.17,-.27)
        relief=.50*fine+.68*grain+.40*body+.24*cloud+nap
    else:
        mineral=field(15,1.8)*.50+field(35,4)*.35
        light=9+6*bloom(.72,.25,.7,.4)+3*band(.77,.15,-.13)
        relief=.65*fine+.78*grain+.38*body+.2*cloud+mineral
    edge=((x-.5)**2*.65+(y-.48)**2*.55)*4
    value=np.clip(light-edge+2.5*np.tanh(relief/2.5),2,34)
    return Image.fromarray(value.round().astype('uint8')).convert('RGB')

stats={}
for key in ['black-fog','obsidian','velvet','inkstone']:
    landscape=render(key,2560,1600)
    landscape.save(dest/f'{key}.webp',lossless=True,method=6)
    render(key,1600,2400).save(dest/f'{key}-portrait.webp',lossless=True,method=6)
    landscape.resize((320,200),Image.Resampling.LANCZOS).save(dest/f'{key}-swatch.webp',lossless=True,method=6)
    arr=np.array(landscape)[:,:,0]
    stats[key]={'landscape':[2560,1600],'portrait':[1600,2400],'rgbMin':int(arr.min()),'rgbMax':int(arr.max()),'median':float(np.median(arr)),'p95':float(np.percentile(arr,95)),'neutralRGB':True}
(dest/'deep-black-manifest.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
