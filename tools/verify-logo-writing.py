"""Exercise the real production canvas and browser animation clock, including screenshots."""
import base64,json,subprocess,time
from pathlib import Path
import requests,websocket,numpy as np
from PIL import Image,ImageDraw

work=Path(__file__).resolve().parents[1]/'.inklune-logs'/'logo-writing-check';work.mkdir(parents=True,exist_ok=True)
profile=work/('chrome-'+str(time.time_ns()));profile.mkdir()
proc=subprocess.Popen(['C:/Program Files/Google/Chrome/Application/chrome.exe','--headless=new','--no-first-run','--disable-extensions','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
def wait(fn,seconds=15):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  value=fn()
  if value:return value
  time.sleep(.04)
 raise TimeoutError('Logo condition did not become ready')
def readport():
 try:return int((profile/'DevToolsActivePort').read_text().splitlines()[0])
 except (OSError,ValueError,IndexError):return None
port=wait(readport);target=wait(lambda:next((x for x in requests.get(f'http://127.0.0.1:{port}/json/list').json() if x['type']=='page'),None))
ws=websocket.create_connection(target['webSocketDebuggerUrl'],suppress_origin=True,timeout=55);idx=0;events=[]
def call(method,params=None):
 global idx
 idx+=1;ws.send(json.dumps({'id':idx,'method':method,'params':params or {}}))
 while True:
  r=json.loads(ws.recv())
  if r.get('id')==idx:
   if 'error'in r:raise RuntimeError(r['error'])
   return r.get('result',{})
  events.append(r)
def ev(js):
 r=call('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True})
 if 'exceptionDetails'in r:raise RuntimeError(r['exceptionDetails'])
 return r.get('result',{}).get('value')
def shot(name):
 ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))')
 (work/name).write_bytes(base64.b64decode(call('Page.captureScreenshot',{'format':'png','fromSurface':True})['data']))
def dim(dpr=1.25,width=1536,height=639):call('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':dpr,'mobile':False})
url='http://127.0.0.1:5174/?experience-preview&material=milk&transition=aperture'
checks=[]
def check(name,ok,**details):
 checks.append({'name':name,'pass':bool(ok),**details});print(json.dumps(checks[-1]),flush=True);assert ok,checks[-1]
setup="""(() => {window.c=document.querySelector('.wordmark-hd');window.a=c.getAnimations()[0];a.pause();const s=document.createElement('style');s.textContent='.room-material{display:none!important}.app{background:#f7f5ed!important}';document.head.append(s);return {renderer:c.dataset.renderer,unassigned:c.dataset.unassigned,canvas:[c.width,c.height],bundle:[...document.scripts].map(s=>s.src)};})()"""
seek="""async t=>{a.currentTime=t;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Number(c.dataset.time);}"""
scan="""(async()=>{
 const rows=[],w=c.width,h=c.height,x0=Math.floor(275*w/1040),x1=Math.ceil(450*w/1040);let prev=null;
 function groups(p){const field=new Uint8Array(w*h),queue=new Int32Array(w*h),out=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=y*w+x;field[at]=+(p[at*4+3]>128&&!(x>w*40/1040&&x<w*90/1040&&y>h*70/284&&y<h*120/284));}
  for(let i=0;i<field.length;i++)if(field[i]){let head=0,tail=0;queue[tail++]=i;field[i]=0;while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);for(const [px,py]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(px>=0&&px<w&&py>=0&&py<h){const n=py*w+px;if(field[n]){field[n]=0;queue[tail++]=n;}}}if(tail>=8)out.push(tail);}return out.sort((a,b)=>b-a);}
 for(let t=0;t<=2310;t+=5){await (SEEK)(t);const p=c.getContext('2d').getImageData(0,0,w,h).data;let area=0,kArea=0,lost=0,early=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4+3;area+=p[i]/255;if(x>=x0&&x<x1)kArea+=p[i]/255;if(prev&&prev[i]>p[i]+1)lost++;if(t<730&&x>w*310/1040&&p[i]>128)early++;}
  rows.push({t,actual:Number(c.dataset.time),area,kArea,lost,early,groups:groups(p)});prev=p;
 }return rows;
})()"""
recorder="""window.__finish=[];function record(){const c=document.querySelector('.wordmark-hd'),r=c?.parentElement.parentElement;if(c&&r){const a=c.getAnimations()[0];__finish.push({t:performance.now(),time:Number(c.dataset.time),clock:a?.currentTime,state:a?.playState,hd:r.dataset.hdReady,canvasDisplay:getComputedStyle(c).display});}if(__finish.length<230)requestAnimationFrame(record);}requestAnimationFrame(record);"""
try:
 call('Page.enable');call('Runtime.enable');dim()
 call('Page.navigate',{'url':url+'&writing-regression=frames'})
 wait(lambda:ev("document.querySelector('.wordmark-hd')?.getAnimations().length>0"));info=ev(setup)
 check('all ink samples have a writing time',info['unassigned']=='0',**info)
 frames=ev(scan.replace('SEEK',seek));(work/'writing-frames.json').write_text(json.dumps(frames,indent=2))
 k=[b['kArea']-a['kArea'] for a,b in zip(frames,frames[1:]) if 740<=b['t']<=1130]
 faults=[r for r in frames if r['lost'] or r['early'] or len(r['groups'])>1]
 check('k continues to reveal ink through returns',min(k)>0,minGrowthPer5ms=min(k),samples=len(k))
 check('no backwards ink, disconnected strokes or early next letter',not faults,samples=len(frames),faults=faults[:12])
 for t in [730,790,845,885,930,950,975,998,1020,1055,1085,1105,1130,1140,2295,2305,2310]:
  ev(f'({seek})({t})');shot(f'writing-{t}.png')
 before=ev('c.toDataURL().split(",")[1]');shot('before-finish.png')
 (work/'writing-completed-native.png').write_bytes(base64.b64decode(before))
 ev('a.finish()');wait(lambda:ev("document.querySelector('.crisp-wordmark').dataset.hdReady==='true'"));after=ev('c.toDataURL().split(",")[1]');shot('after-finish.png')
 check('finish event preserves every native ink pixel',before==after)
 p=np.asarray(Image.open(work/'before-finish.png'));q=np.asarray(Image.open(work/'after-finish.png'))
 check('finish event preserves actual screen pixels',np.array_equal(p,q),changedPixels=int((p!=q).any(2).sum()))
 # Repeat real, unpaused playbacks; the completed flag must never beat the canvas clock.
 call('Page.addScriptToEvaluateOnNewDocument',{'source':recorder})
 for i in range(3):
  call('Page.navigate',{'url':url+f'&writing-regression=natural-{i}'})
  wait(lambda:ev('window.__finish.length>=230'),20);rows=ev('__finish');completed=[r for r in rows if r['hd']=='true'];bad=[r for r in completed if r['time']<2310 or r['state']!='finished']
  check('natural playback finishes on its own clock '+str(i),bool(completed) and not bad,firstComplete=completed[0] if completed else None,early=bad)
  (work/f'natural-{i}.json').write_text(json.dumps(rows,indent=2))
 # Theme changes and resizing while writing retain the same live clock.
 call('Page.navigate',{'url':url+'&writing-regression=theme'})
 wait(lambda:ev("document.querySelector('.wordmark-hd')?.getAnimations().length>0"));ev(setup);ev(f'({seek})(960)')
 ev("document.querySelector('.start-theme').click()")
 wait(lambda:ev("document.querySelector('.app').classList.contains('night')"));same=ev("c.getAnimations()[0]===a&&Number(c.dataset.time)===960")
 check('theme change retains paused writing progress',same);shot('writing-night-960.png')
 dim(2);wait(lambda:ev("c.dataset.pixelRatio==='2'"));check('DPR change retains paused writing progress',ev("c.getAnimations()[0]===a&&Number(c.dataset.time)===960"));shot('writing-resized-960.png')
 # Transition snapshots must copy the bitmap, not an unfinished hidden SVG or an empty clone.
 dim();
 for transition in ['signature','gates']:
  call('Page.navigate',{'url':url.replace('transition=aperture','transition='+transition)+'&writing-regression=snapshot'})
  wait(lambda:ev("document.querySelector('.wordmark-hd')?.getAnimations().length>0"));ev(setup);ev(f'({seek})(960)')
  reference=ev('c.toDataURL().split(",")[1]');ev("document.querySelector('.start-primary').click()")
  wait(lambda:ev("document.querySelector('.wordmark-frozen')!==null"));snapshot=ev("document.querySelector('.wordmark-frozen').toDataURL().split(',')[1]")
  (work/('snapshot-'+transition+'-source.png')).write_bytes(base64.b64decode(reference));(work/('snapshot-'+transition+'-copy.png')).write_bytes(base64.b64decode(snapshot))
  original=np.asarray(Image.open(work/('snapshot-'+transition+'-source.png')).convert('RGBA'));copied=np.asarray(Image.open(work/('snapshot-'+transition+'-copy.png')).convert('RGBA'))
  check(transition+' captures the current bitmap',np.array_equal(original,copied),maxChannelDelta=int(np.abs(original.astype(int)-copied.astype(int)).max()));shot('transition-'+transition+'.png')
  wait(lambda:ev("document.querySelector('.app').dataset.screen==='writer'"));check(transition+' cleans up its snapshot',ev("document.querySelector('.wordmark-frozen')===null"))
 errors=[e for e in events if e.get('method')=='Runtime.exceptionThrown'];check('no browser exceptions',not errors,errors=errors)
 # Contact sheet uses real screen crops with nearest-neighbour enlargement.
 tiles=[]
 for t in [885,930,950,975,998,1020,1055,1085,1105,1130,1140]:
  im=Image.open(work/f'writing-{t}.png').convert('RGB').crop((718,242,898,507)).resize((360,530),Image.Resampling.NEAREST);tiles.append((t,im))
 sheet=Image.new('RGB',(4*376,3*570),'#edece7');draw=ImageDraw.Draw(sheet)
 for i,(t,im) in enumerate(tiles):x=i%4*376+8;y=i//4*570+30;sheet.paste(im,(x,y));draw.text((x,y-20),str(t)+' ms',fill='#26332f')
 sheet.save(work/'k-fixed-actual-contact.png')
 (work/'writing-checks.json').write_text(json.dumps({'pass':all(c['pass'] for c in checks),'checks':checks},indent=2),encoding='utf-8')
finally:
 ws.close();proc.terminate()
 try:proc.wait(timeout=10)
 except subprocess.TimeoutExpired:proc.kill()
