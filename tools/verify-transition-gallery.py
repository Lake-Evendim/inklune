"""Exercise the actual eight-transition comparison iframe, including unfinished-logo snapshots."""
from pathlib import Path
import subprocess
project=Path(__file__).resolve().parents[1]
subprocess.run(['node',str(Path(__file__).with_name('build-k-pacing-probe.mjs'))],check=True)
probe=(project/'.inklune-logs/k-pacing-check/probe.js').read_text(encoding='utf-8')
base=Path(__file__).with_name('verify-logo-writing.py').read_text(encoding='utf-8')
exec(base.split("\ntry:\n call('Page.enable');")[0])
work=project/'.inklune-logs/transition-gallery-check';work.mkdir(parents=True,exist_ok=True)
def inside(js):return ev('document.querySelector(".experience-viewport iframe").contentWindow.eval('+json.dumps(js)+')')
seek_frame="""async t=>{__galleryClock.currentTime=t;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Number(document.querySelector('.wordmark-hd').dataset.time);}"""
pause="""function pauseLogo(){const c=document.querySelector('.wordmark-hd'),a=c?.getAnimations()[0];if(a){a.pause();window.__galleryClock=a;window.__galleryPaused=true;}else requestAnimationFrame(pauseLogo);}requestAnimationFrame(pauseLogo);"""
prepare="""(() => {
 const c=document.querySelector('.wordmark-hd'),image=c.getContext('2d').getImageData(0,0,c.width,c.height);window.__fullInk=image;window.__expectedReveal=__pacingProbe.buildWordmarkReveal(document.querySelector('.wordmark-surface svg'),image);
 return {renderer:c.dataset.renderer,coverage:c.dataset.coverage,unassigned:c.dataset.unassigned,canvas:[c.width,c.height],sourceWidth:Number(c.dataset.sourceWidth),sampling:c.dataset.sampling,bundle:[...document.scripts].map(s=>s.src),crossingMs:__arcClock(950)-__arcClock(935),crossingSpeedRatio:(40/(__arcClock(935)-__arcClock(895)))/(15/(__arcClock(950)-__arcClock(935)))};
})()"""
pixel_check="""(() => {const c=document.querySelector('.wordmark-hd'),p=c.getContext('2d').getImageData(0,0,c.width,c.height);window.__source970=p;let delta=0;for(const at of __expectedReveal.pixels){const expected=Math.round(__fullInk.data[at*4+3]*Math.min(1,Math.max(0,(970-__expectedReveal.start[at])/(__expectedReveal.end[at]-__expectedReveal.start[at]))));delta=Math.max(delta,Math.abs(p.data[at*4+3]-expected));}return delta;})()"""
freeze="""(() => {window.__moving=document.getAnimations().filter(a=>a!==__galleryClock&&Number.isFinite(a.effect.getComputedTiming().endTime));for(const a of __moving){a.pause();a.currentTime=Number(a.effect.getTiming().duration)*.45;}const copies=[...document.querySelectorAll('.wordmark-frozen')];return {copies:copies.length,deltas:copies.map(c=>{const p=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let d=0;for(let i=0;i<p.length;i++)d=Math.max(d,Math.abs(p[i]-__source970.data[i]));return d;}),emptyCloneCanvases:document.querySelectorAll('.motion-cover .wordmark-hd').length};})()"""
transitions=['aperture','signature','contour','inkflow','gates','canopy','focus','lightpass']
checks=[];report=[]
try:
 call('Page.enable');call('Runtime.enable')
 dim(1.25,1536,900);call('Page.navigate',{'url':'http://127.0.0.1:5174/?experiences&transition-verification'})
 wait(lambda:ev("document.querySelectorAll('.experience-motions button').length===8&&document.querySelector('.experience-viewport iframe')?.contentDocument?.querySelector('.wordmark-hd')?.getAnimations().length>0"),20)
 inside("window.__galleryClock=document.querySelector('.wordmark-hd').getAnimations()[0];__galleryClock.pause()")
 for device in ['desktop','phone']:
  if device=='phone':ev("[...document.querySelectorAll('.experience-segment button')].find(b=>b.textContent==='手机').click()")
  for night in [False,True]:
   wanted='预览夜晚' if night else '预览白天'
   if ev("document.querySelector('.experience-gallery').classList.contains('experience-dark')")!=night:
    ev(f"document.querySelector('[aria-label={wanted}]').click()")
   wait(lambda:inside(f"document.querySelector('.app').classList.contains('night')==={str(night).lower()}&&document.querySelector('.app').dataset.editorPrepared==='true'"),20)
   inside(f'({seek_frame})(2310)');inside(probe);metadata=inside(prepare)
   check(device+('-night' if night else '-day')+' uses latest high resolution logo and arc pacing',metadata['renderer']=='continuous-coverage' and metadata['coverage']=='area-average' and metadata['unassigned']=='0' and metadata['crossingMs']>=15 and abs(metadata['crossingSpeedRatio']-1)<.1,**metadata)
   for i,transition in enumerate(transitions):
    name=f'{device}-'+('night' if night else 'day')+'-'+transition
    ev(f"document.querySelectorAll('.experience-motions button')[{i}].click()")
    wait(lambda:inside(f"document.querySelector('.app').classList.contains('motion-{transition}')&&document.querySelector('.app').dataset.roomPhase==='idle'&&document.querySelector('.app').dataset.screen==='start'"))
    inside(f'({seek_frame})(970)');delta=inside(pixel_check)
    check(name+' displays the fixed k at 970ms',delta==0,maxAlphaDelta=delta)
    inside("document.querySelector('.start-primary').click()")
    wait(lambda:inside("document.querySelector('.app').dataset.roomPhase==='moving'"))
    frozen=inside(freeze);expected=2 if transition=='gates' else 1 if transition=='signature' else 0
    check(name+' preserves the actual unfinished logo',frozen['copies']==expected and all(d==0 for d in frozen['deltas']) and frozen['emptyCloneCanvases']==0,**frozen)
    shot(name+'-moving.png')
    inside('__moving.forEach(a=>a.finish())')
    wait(lambda:inside("document.querySelector('.app').dataset.screen==='writer'&&document.querySelector('.app').dataset.roomPhase==='idle'"))
    check(name+' completes and cleans up',inside("document.querySelectorAll('.wordmark-frozen,.motion-overlay,.motion-light').length===0"))
    ev("[...document.querySelectorAll('.experience-stage-footer button')].find(b=>b.textContent.includes('返回开始页')).click()")
    wait(lambda:inside("document.querySelector('.app').dataset.roomPhase==='moving'"))
    inside("document.getAnimations().filter(a=>a!==__galleryClock&&Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>a.finish())")
    wait(lambda:inside("document.querySelector('.app').dataset.screen==='start'&&document.querySelector('.app').dataset.roomPhase==='idle'"))
    report.append({'name':name,'renderer':metadata['renderer'],'crossingMs':metadata['crossingMs'],'pixelAlphaDelta':delta,'snapshot':frozen,'pass':True})
 check('no browser exceptions',not [e for e in events if e.get('method')=='Runtime.exceptionThrown'])
 (work/'transition-checks.json').write_text(json.dumps({'pass':all(c['pass'] for c in checks),'checks':checks,'transitions':report},indent=2),encoding='utf-8')
except Exception:
 print(json.dumps(ev("(() => {const f=document.querySelector('.experience-viewport iframe');return {url:location.href,options:document.querySelectorAll('.experience-motions button').length,frame:f?.src,body:document.body.innerText.slice(0,700),inner:f?.contentDocument?.body.innerText.slice(0,300),paused:f?.contentWindow?.__galleryPaused,canvas:f?.contentDocument?.querySelector('.wordmark-hd')?.dataset};})()")),flush=True)
 shot('failure.png');raise
finally:
 ws.close();proc.terminate()
 try:proc.wait(timeout=10)
 except subprocess.TimeoutExpired:proc.kill()
