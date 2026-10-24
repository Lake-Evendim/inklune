"""Capture all eight real start designs and check the gallery uses the shared renderer."""
from pathlib import Path
import re,shutil,subprocess,sys
project=Path(__file__).resolve().parents[1]
subprocess.run(['node',str(Path(__file__).with_name('build-k-pacing-probe.mjs'))],check=True)
probe=(project/'.inklune-logs/k-pacing-check/probe.js').read_text(encoding='utf-8')
base=Path(__file__).with_name('verify-logo-writing.py').read_text(encoding='utf-8')
exec(base.split("\ntry:\n call('Page.enable');")[0])
work=project/'.inklune-logs/start-preview-check';work.mkdir(parents=True,exist_ok=True)
designs=re.findall(r"id:'([^']+)'",(project/'src/startDesigns.ts').read_text(encoding='utf-8'))
preview=project/'public/start-previews';report=[]
metrics="""(() => {const c=document.querySelector('.wordmark-hd'),root=document.querySelector('.crisp-wordmark');return {design:document.querySelector('.start-page').dataset.design,night:document.querySelector('.app').classList.contains('night'),renderer:c.dataset.renderer,coverage:c.dataset.coverage,unassigned:c.dataset.unassigned,complete:root.dataset.hdReady,time:Number(c.dataset.time),canvas:[c.width,c.height],bundle:[...document.scripts].map(s=>s.src)};})()"""
timing="""(() => {const c=document.querySelector('.wordmark-hd'),image=c.getContext('2d').getImageData(0,0,c.width,c.height);__pacingProbe.buildWordmarkReveal(document.querySelector('.wordmark-surface svg'),image);const map=__arcClock,ratio=(40/(map(935)-map(895)))/(15/(map(950)-map(935)));return {crossingMs:map(950)-map(935),crossingSpeedRatio:ratio};})()"""
try:
 call('Page.enable');call('Runtime.enable')
 for design in ([] if '--gallery-only' in sys.argv else designs):
  for device,width,height in [('desktop',1280,720),('phone',390,844)]:
   dim(2,width,height)
   for theme in ['day','night']:
    name=f'{design}-{device}-{theme}'
    call('Page.navigate',{'url':f'http://127.0.0.1:5174/?preview-start={design}'+('&night' if theme=='night' else '')+'&thumbnail='+name})
    wait(lambda:ev(f"location.href.includes('thumbnail={name}')&&document.querySelector('.crisp-wordmark')?.dataset.hdReady==='true'"),20)
    ev('document.fonts.ready.then(()=>true)');state=ev(metrics);ev(probe);state.update(ev(timing));state['name']=name
    state['pass']=state['design']==design and state['night']==(theme=='night') and state['renderer']=='continuous-coverage' and state['coverage']=='area-average' and state['unassigned']=='0' and state['time']==2310 and state['crossingMs']>=15 and abs(state['crossingSpeedRatio']-1)<.1
    assert state['pass'],state
    shot(name+'.png')
    im=Image.open(work/(name+'.png')).convert('RGB').resize((width,height),Image.Resampling.LANCZOS)
    im.save(preview/(name+'.webp'),'WEBP',quality=95,method=6)
    shutil.copyfile(preview/(name+'.webp'),project/'dist/start-previews'/(name+'.webp'))
    report.append(state);print(json.dumps({k:state[k] for k in ['name','pass','crossingMs','canvas']}),flush=True)
 # Actual expanded gallery embeds, including its scaling and replay controls.
 dim(1.25,1536,900);call('Page.navigate',{'url':'http://127.0.0.1:5174/?designs&preview-verification'})
 wait(lambda:ev("document.querySelectorAll('[data-open]').length===8"))
 if '--gallery-only' in sys.argv:
  for design in designs:
   ev(f"document.querySelector('[data-open={design}]').scrollIntoView()")
   wait(lambda:ev(f"document.querySelector('[data-open={design}] img').complete&&document.querySelector('[data-open={design}] img').naturalWidth>0"))
 thumbs=ev("[...document.querySelectorAll('.design-thumbnail img')].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0}))")
 if '--gallery-only' in sys.argv:assert all('v=logo-20261023-arc' in t['src'] and t['loaded'] for t in thumbs),thumbs
 for design in designs:
  ev(f"document.querySelector('[data-open={design}]').click()")
  wait(lambda:ev(f"document.querySelector('iframe')?.src.includes('preview-start={design}')&&document.querySelector('iframe')?.contentDocument?.querySelector('.crisp-wordmark')?.dataset.hdReady==='true'"),20)
  state=ev("(() => {const f=document.querySelector('iframe'),d=f.contentDocument,c=d.querySelector('.wordmark-hd');return {design:d.querySelector('.start-page').dataset.design,renderer:c.dataset.renderer,coverage:c.dataset.coverage,time:Number(c.dataset.time),bundle:[...d.scripts].map(s=>s.src),ready:f.parentElement.classList.contains('is-ready')};})()")
  ev('document.querySelector("iframe").contentWindow.eval('+json.dumps(probe)+')')
  state.update(ev('document.querySelector("iframe").contentWindow.eval('+json.dumps(timing)+')'))
  state.update({'name':'expanded-'+design,'pass':state['design']==design and state['renderer']=='continuous-coverage' and state['coverage']=='area-average' and state['time']==2310 and state['ready'] and state['crossingMs']>=15 and abs(state['crossingSpeedRatio']-1)<.1})
  assert state['pass'],state;report.append(state);shot('expanded-'+design+'.png')
  ev("document.querySelector('.design-back').click()")
 (work/('gallery-current-checks.json' if '--gallery-only' in sys.argv else 'preview-checks.json')).write_text(json.dumps({'pass':all(r['pass'] for r in report),'checks':report,'thumbnailUrls':thumbs},indent=2),encoding='utf-8')
finally:
 ws.close();proc.terminate()
 try:proc.wait(timeout=10)
 except subprocess.TimeoutExpired:proc.kill()
