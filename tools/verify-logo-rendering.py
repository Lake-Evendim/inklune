"""Verify the built localhost app in an isolated Chrome profile, with real rendering."""
import base64
import json
import subprocess
import time
from pathlib import Path

import requests
import websocket
import numpy as np
from PIL import Image

work = Path(__file__).resolve().parents[1] / '.inklune-logs' / 'logo-render-check'
work.mkdir(parents=True, exist_ok=True)
profile = work / ('chrome-logo-fix-test-profile-'+str(time.time_ns()))
profile.mkdir(exist_ok=True)
chrome = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
proc = subprocess.Popen([str(chrome), '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--disable-extensions', '--disable-background-networking',
    '--user-data-dir='+str(profile), 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    creationflags=subprocess.CREATE_NO_WINDOW)

def wait_for(fn, seconds=12):
    until = time.monotonic()+seconds
    while time.monotonic()<until:
        value=fn()
        if value: return value
        time.sleep(.05)
    raise TimeoutError('Browser condition did not become ready')

portfile=profile/'DevToolsActivePort'
wait_for(portfile.exists)
port=int(portfile.read_text().splitlines()[0])
target=wait_for(lambda: next((x for x in requests.get(f'http://127.0.0.1:{port}/json/list').json() if x['type']=='page'),None))
try:
    ws=websocket.create_connection(target['webSocketDebuggerUrl'],suppress_origin=True,timeout=15)
except Exception:
    proc.terminate()
    raise
counter=0
events=[]

def command(method,params=None):
    global counter
    counter+=1
    ws.send(json.dumps({'id':counter,'method':method,'params':params or {}}))
    while True:
        result=json.loads(ws.recv())
        if result.get('id')==counter:
            if 'error' in result: raise RuntimeError(result['error'])
            return result.get('result',{})
        events.append(result)

def evaluate(js):
    result=command('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True})
    if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
    return result.get('result',{}).get('value')

def screenshot(name):
    evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))")
    data=command('Page.captureScreenshot',{'format':'png','fromSurface':True})['data']
    (work/name).write_bytes(base64.b64decode(data))

metrics_js='''(() => {
 const s=document.querySelector('.wordmark-surface'),c=s?.querySelector('canvas');if(!s||!c)return null;
 const r=s.getBoundingClientRect(),p=[r.x*devicePixelRatio,r.y*devicePixelRatio,r.width*devicePixelRatio,r.height*devicePixelRatio];
 return {dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],box:{x:r.x,y:r.y,w:r.width,h:r.height},physical:p,
   maxPixelError:Math.max(...p.map(v=>Math.abs(v-Math.round(v)))),canvas:[c.width,c.height],
   ready:s.parentElement.getAttribute('data-hd-ready'),samples:Number(c.getAttribute('data-sampling')),
   sourceWidth:Number(c.getAttribute('data-source-width')),raster:c.getAttribute('data-raster'),
   svgOpacity:getComputedStyle(s.querySelector('svg')).opacity,
   color:getComputedStyle(s).color,bundle:[...document.scripts].map(s=>s.src)};
})()'''

checks=[]
command('Page.enable');command('Runtime.enable')
command('Page.addScriptToEvaluateOnNewDocument',{'source':'''window.__logoHandoff=[];
let logoStarted=false;function recordLogo(){
 const s=document.querySelector('.wordmark-surface');
 if(s){const r=s.getBoundingClientRect();window.__logoHandoff.push({time:performance.now(),hd:s.parentElement.getAttribute('data-hd-ready'),box:[r.x,r.y,r.width,r.height]});logoStarted=true;}
 if(!logoStarted||window.__logoHandoff.length<210)requestAnimationFrame(recordLogo);
}requestAnimationFrame(recordLogo);'''})

def dimensions(width,height,dpr):
    command('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':dpr,'mobile':False})

def check(name):
    def painted():
        report=evaluate(metrics_js)
        if report and report['ready']=='true' and report['maxPixelError']<.04 and all(abs(a-b)<.04 for a,b in zip(report['canvas'],report['physical'][2:])):
            return report
        return None
    report=wait_for(painted)
    report['name']=name
    report['pass']=report['ready']=='true' and report['maxPixelError']<.04 and all(abs(a-b)<.04 for a,b in zip(report['canvas'],report['physical'][2:]))
    checks.append(report)
    print(json.dumps({'name':name,'pass':report['pass'],'dpr':report['dpr'],'canvas':report['canvas'],'pixelError':report['maxPixelError']}),flush=True)
    assert report['pass'],report
    return report

try:
    dimensions(1536,639,1.25)
    command('Page.navigate',{'url':'http://127.0.0.1:5174/?experience-preview&material=milk&transition=aperture'})
    wait_for(lambda:evaluate("document.querySelector('.crisp-wordmark')?.getAttribute('data-hd-ready')==='true'"))
    check('desktop-1.25-day')
    screenshot('logo-fixed-desktop-125.png')
    handoff=wait_for(lambda:evaluate("window.__logoHandoff.length>=210&&window.__logoHandoff"))
    transitions=[(a,b) for a,b in zip(handoff,handoff[1:]) if a['hd']=='false' and b['hd']=='true']
    assert len(transitions)==1,transitions
    jump=max(abs(a-b) for a,b in zip(transitions[0][0]['box'],transitions[0][1]['box']))
    checks.append({'name':'natural-svg-canvas-handoff','frames':len(handoff),'positionOrSizeJump':jump,'pass':jump<.01,'boundary':transitions[0]})
    assert jump<.01

    # Same CSS viewport, changed physical density: the resolution listener must repaint.
    for dpr in [1,1.5,2,1.25]:
        dimensions(1536,639,dpr)
        wait_for(lambda:evaluate(f"Number(document.querySelector('.wordmark-hd').getAttribute('data-pixel-ratio'))==={dpr}"))
        check('desktop-dpr-change-'+str(dpr));screenshot('logo-fixed-desktop-'+str(dpr).replace('.','')+'.png')

    dimensions(1536,900,1.25)
    wait_for(lambda:evaluate("document.querySelector('.wordmark-surface').getBoundingClientRect().y>250"))
    check('height-only-resize')
    dimensions(390,844,3)
    wait_for(lambda:evaluate("document.querySelector('.wordmark-hd').width<1100"))
    check('phone-3-day');screenshot('logo-fixed-phone-day.png')
    evaluate("document.querySelector('.start-theme').click()")
    wait_for(lambda:evaluate("document.querySelector('.app').classList.contains('night')"))
    check('phone-3-night');screenshot('logo-fixed-phone-night.png')

    # Real production code on a flat diagnostic background for edge sampling.
    dimensions(1536,639,1.25)
    command('Page.navigate',{'url':'http://127.0.0.1:5174/?experience-preview&material=milk&transition=aperture'})
    wait_for(lambda:evaluate("document.querySelector('.crisp-wordmark')?.getAttribute('data-hd-ready')==='true'"))
    evaluate("(() => {const s=document.createElement('style');s.textContent='.room-material{display:none!important}.app{background:#f7f5ed!important}';document.head.append(s);})()")
    check('production-flat-background');screenshot('logo-fixed-flat.png')
    raw=evaluate("document.querySelector('.wordmark-hd').toDataURL('image/png').split(',')[1]")
    (work/'logo-fixed-native-canvas.png').write_bytes(base64.b64decode(raw))
    canvasPixels=np.asarray(Image.open(work/'logo-fixed-native-canvas.png').convert('RGBA'),dtype=float)
    screenPixels=np.asarray(Image.open(work/'logo-fixed-flat.png').convert('RGB'),dtype=float)
    box=evaluate(metrics_js)['physical'];px,py,pw,ph=[round(v) for v in box]
    bg=np.array([247,245,237]);alpha=canvasPixels[:,:,3:4]/255
    expected=canvasPixels[:,:,:3]*alpha+bg*(1-alpha)
    error=np.abs(expected-screenPixels[py:py+ph,px:px+pw]);edge=(canvasPixels[:,:,3]>0)&(canvasPixels[:,:,3]<255)
    composite={'name':'precomputed-edge-coverage-preserved-on-screen','rgbMae':float(error.mean()),'edgeRgbMae':float(error[edge].mean()),'maxRgbDelta':float(error.max()),'pass':bool(error.max()<1.1)}
    checks.append(composite);assert composite['pass'],composite
    curve=evaluate('''(() => {
      const c=document.querySelector('.wordmark-hd'),w=c.width,h=c.height,x0=428,y0=28,cw=52,ch=61,ss=32;
      const reference=document.createElement('canvas');reference.width=cw*ss;reference.height=ch*ss;
      const ctx=reference.getContext('2d',{willReadFrequently:true}),scale=Math.min(w/1040,h/283.788);
      ctx.setTransform(scale*ss,0,0,scale*ss,((w-1040*scale)/2-x0)*ss,((h-283.788*scale)/2-y0)*ss);
      ctx.fillStyle='#303832';for(const path of document.querySelectorAll('.wordmark-ink'))ctx.fill(new Path2D(path.getAttribute('d')));
      const source=ctx.getImageData(0,0,reference.width,reference.height).data,actual=c.getContext('2d').getImageData(x0,y0,cw,ch).data;
      const left=[],ideal=[];let edgeError=0,edgeCount=0,maxError=0;
      for(let y=0;y<ch;y++){let a=0,b=0;for(let x=0;x<cw;x++){
        let sum=0;for(let j=0;j<ss;j++){let at=((y*ss+j)*reference.width+x*ss)*4+3;for(let i=0;i<ss;i++,at+=4)sum+=source[at];}
        const expected=Math.round(sum/(ss*ss)),value=actual[(y*cw+x)*4+3],error=Math.abs(value-expected);
        if(expected>0&&expected<255){edgeError+=error;edgeCount++;}maxError=Math.max(maxError,error);a+=value/255;b+=expected/255;
      }left.push(cw-a);ideal.push(cw-b);}
      let curvatureError=0;for(let y=1;y<ch-1;y++)curvatureError=Math.max(curvatureError,Math.abs((left[y+1]-2*left[y]+left[y-1])-(ideal[y+1]-2*ideal[y]+ideal[y-1])));
      const edgeAlphaMae=edgeError/edgeCount;
      return {name:'curve-to-straight-area-coverage',roi:[x0,y0,cw,ch],referenceSamples:ss,edgeAlphaMae,maxAlphaError:maxError,maxCurvatureCoverageError:curvatureError,pass:edgeAlphaMae<3&&maxError<10&&curvatureError<.03};
    })()''')
    checks.append(curve);assert curve['pass'],curve
    ancestors=evaluate("(() => {let el=document.querySelector('.wordmark-hd'),rows=[];while(el){const s=getComputedStyle(el);rows.push({tag:el.tagName,cls:el.className,opacity:s.opacity,transform:s.transform,filter:s.filter,willChange:s.willChange});el=el.parentElement;}return rows;})()")
    (work/'logo-fixed-layer-styles.json').write_text(json.dumps(ancestors,indent=2),encoding='utf-8')

    # Reduced motion shows the completed layer from the first rendered frame.
    command('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})
    command('Page.navigate',{'url':'http://127.0.0.1:5174/?experience-preview&material=milk&transition=aperture'})
    wait_for(lambda:evaluate("document.querySelector('.crisp-wordmark')?.getAttribute('data-hd-ready')==='true'"))
    reduced=evaluate('window.__logoHandoff')
    checks.append({'name':'reduced-motion-first-render','firstFrame':reduced[0],'pass':reduced[0]['hd']=='true'})
    assert reduced[0]['hd']=='true'
    check('reduced-motion-final')
    command('Emulation.setEmulatedMedia',{'features':[]})

    # Inspect the actual scaled gallery iframe in the outer physical pixel space.
    command('Page.navigate',{'url':'http://127.0.0.1:5174/?experiences'})
    wait_for(lambda:evaluate("document.querySelector('iframe')?.contentDocument?.querySelector('.crisp-wordmark')?.getAttribute('data-hd-ready')==='true'"))
    gallery=evaluate('''(() => {const f=document.querySelector('iframe'),c=f.contentDocument.querySelector('.wordmark-hd'),s=c.parentElement,r=s.getBoundingClientRect(),b=f.getBoundingClientRect(),sx=b.width/f.offsetWidth,sy=b.height/f.offsetHeight;const p=[(b.x+f.clientLeft*sx+r.x*sx)*devicePixelRatio,(b.y+f.clientTop*sy+r.y*sy)*devicePixelRatio,r.width*sx*devicePixelRatio,r.height*sy*devicePixelRatio];return {name:'scaled-gallery',physical:p,canvas:[c.width,c.height],maxPixelError:Math.max(...p.map(x=>Math.abs(x-Math.round(x)))),scale:[sx,sy]};})()''')
    gallery['pass']=gallery['maxPixelError']<.04 and all(abs(a-b)<.04 for a,b in zip(gallery['canvas'],gallery['physical'][2:]))
    checks.append(gallery);assert gallery['pass'],gallery
    screenshot('logo-fixed-gallery.png')
    # A parent-only scale change must be handled without resizing the iframe document.
    evaluate("document.querySelector('iframe').style.transform='scale(.61)'")
    wait_for(lambda:evaluate("(() => {const f=document.querySelector('iframe'),c=f.contentDocument.querySelector('.wordmark-hd'),r=c.parentElement.getBoundingClientRect(),b=f.getBoundingClientRect();return Math.abs(c.width-r.width*b.width/f.offsetWidth*devicePixelRatio)<.04;})()"))
    changed=evaluate('''(() => {const f=document.querySelector('iframe'),c=f.contentDocument.querySelector('.wordmark-hd'),r=c.parentElement.getBoundingClientRect(),b=f.getBoundingClientRect(),sx=b.width/f.offsetWidth,sy=b.height/f.offsetHeight;return {name:'parent-only-scale-change',physical:[(b.x+f.clientLeft*sx+r.x*sx)*devicePixelRatio,(b.y+f.clientTop*sy+r.y*sy)*devicePixelRatio,r.width*sx*devicePixelRatio,r.height*sy*devicePixelRatio],canvas:[c.width,c.height]};})()''')
    changed['pass']=all(abs(v-round(v))<.04 for v in changed['physical']) and all(abs(a-b)<.04 for a,b in zip(changed['canvas'],changed['physical'][2:]))
    checks.append(changed);assert changed['pass'],changed

    errors=[e for e in events if e.get('method')=='Runtime.exceptionThrown']
    assert not errors,errors
    report={'pass':all(c['pass'] for c in checks),'checks':checks,'naturalHandoffFrames':handoff,'pageErrors':errors,'browser':requests.get(f'http://127.0.0.1:{port}/json/version').json()['Browser']}
    (work/'logo-fix-checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'pass':report['pass'],'checks':len(checks),'browser':report['browser']}),flush=True)
finally:
    ws.close()
    proc.terminate()
    try: proc.wait(timeout=10)
    except subprocess.TimeoutExpired: proc.kill()

