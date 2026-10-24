"""Measure actual k arc timing, compare source to production pixels, and save real frames."""
from pathlib import Path
import subprocess
base=Path(__file__).with_name('verify-logo-writing.py').read_text(encoding='utf-8')
exec(base.split("\ntry:\n call('Page.enable');")[0])
work=Path(__file__).resolve().parents[1]/'.inklune-logs'/'k-pacing-check'
subprocess.run(['node',str(Path(__file__).with_name('build-k-pacing-probe.mjs'))],check=True)
probe=(work/'probe.js').read_text(encoding='utf-8')
checks=[]
prepare="""(() => {
 const c=document.querySelector('.wordmark-hd'),image=c.getContext('2d').getImageData(0,0,c.width,c.height),svg=document.querySelector('.wordmark-surface svg');
 window.__image=image;window.__reveal=__pacingProbe.buildWordmarkReveal(svg,image);
 const parts=__pacingProbe.wordmarkStrokeGroups[2],offset=__pacingProbe.wordmarkStrokeGroups.slice(0,2).reduce((n,p)=>n+p.length,0),pens=[...svg.querySelectorAll('.wordmark-pen')].slice(offset,offset+parts.length),map=__arcClock;
 const ranges=[{name:'upper-loop',part:0,a:735,b:880},{name:'stem-before-crossing',part:1,a:895,b:935},{name:'stem-through-crossing',part:1,a:935,b:950},{name:'stem-after-crossing',part:1,a:950,b:970},{name:'right-loop',part:2,a:1025,b:1088},{name:'outgoing-leg',part:3,a:1105,b:1135}];
 const rows=ranges.map(r=>{const pen=parts[r.part],distance=(r.b-r.a)/pen.time*pens[r.part].getTotalLength(),elapsed=map(r.b)-map(r.a);return {...r,start:map(r.a),end:map(r.b),elapsed,distance,speed:distance/elapsed};});
 const curve=[];for(let t=730;t<=1140;t++)curve.push({original:t,displayed:map(t)});
 return {rows,curve,canvas:[c.width,c.height]};
})()"""
try:
 call('Page.enable');call('Runtime.enable')
 variants=[('desktop-1',1,1536,639),('desktop-1.25',1.25,1536,639),('desktop-2',2,1536,639),('phone-3',3,390,844)]
 results=[]
 for name,dpr,width,height in variants:
  dim(dpr,width,height);call('Page.navigate',{'url':url+'&pacing-regression='+name})
  wait(lambda:ev(f"location.href.includes('pacing-regression={name}')&&document.querySelector('.wordmark-hd')?.dataset.pixelRatio==='{dpr}'&&document.querySelector('.wordmark-hd')?.getAnimations().length>0"));info=ev(setup);ev(f'({seek})(2310)');ev(probe);result=ev(prepare)
  speeds=[r['speed'] for r in result['rows']];crossing=result['rows'][2]
  check(name+' crossing keeps normal arc speed',max(speeds)/min(speeds)<1.1 and crossing['elapsed']>=15,ratio=max(speeds)/min(speeds),crossingMs=crossing['elapsed'],rows=result['rows'])
  result['production']=info;result['variant']=name;results.append(result)
  if name=='desktop-1.25':
   # Every production pixel must match the independently rebuilt source schedule.
   scan="""(async()=>{const rows=[];let prev=null;for(let t=730;t<=1140;t++){
    await (SEEK)(t);const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let delta=0,area=0;
    for(const at of __reveal.pixels){const alpha=Math.round(__image.data[at*4+3]*Math.min(1,Math.max(0,(t-__reveal.start[at])/(__reveal.end[at]-__reveal.start[at]))));delta=Math.max(delta,Math.abs(p[at*4+3]-alpha));if(at%c.width>=c.width*275/1040&&at%c.width<c.width*450/1040)area+=p[at*4+3]/255;}
    rows.push({t,actual:Number(c.dataset.time),area,maxAlphaDelta:delta});prev=p;
   }return rows;})()"""
   samples=ev(scan.replace('SEEK',seek));result['samples']=samples
   (work/'production-samples.json').write_text(json.dumps(samples,indent=2),encoding='utf-8')
   check('production pixels match the tested pacing at every millisecond',all(abs(r['actual']-r['t'])<1e-6 and r['maxAlphaDelta']==0 for r in samples),samples=len(samples),maxAlphaDelta=max(r['maxAlphaDelta'] for r in samples),maxClockError=max(abs(r['actual']-r['t']) for r in samples))
   windows=[b['area']-a['area'] for a,b in zip(samples,samples[16:]) if 740<=a['t']<=1114]
   check('no full-frame visible stall at 60Hz',min(windows)>0,minInkGrowthPer16ms=min(windows))
   for t in [907,925,945,960,965,970,975,980,990,1000,1006,1015,1030,1050,1080,1100,1120,1140]:
    ev(f'({seek})({t})');shot(f'k-{t}.png')
   tiles=[]
   for t in [925,945,960,965,970,975,980,990,1000,1006,1015,1030]:
    im=Image.open(work/f'k-{t}.png').convert('RGB').crop((718,242,898,507)).resize((360,530),Image.Resampling.NEAREST);tiles.append((t,im))
   sheet=Image.new('RGB',(4*376,3*570),'#edece7');draw=ImageDraw.Draw(sheet)
   for i,(t,im) in enumerate(tiles):x=i%4*376+8;y=i//4*570+30;sheet.paste(im,(x,y));draw.text((x,y-20),str(t)+' ms',fill='#26332f')
   sheet.save(work/'k-pacing-actual-contact.png')
  # Keep the real paper/graphite background in the visual review as well.
  ev("document.querySelector('.app').classList.remove('night');document.querySelectorAll('style').forEach(s=>{if(s.textContent.includes('.room-material{display:none!important}'))s.remove();})")
  ev(f'({seek})(970)');shot(name+'-day-970.png')
  ev("document.querySelector('.start-theme').click()")
  wait(lambda:ev("document.querySelector('.app').classList.contains('night')"));shot(name+'-night-970.png')
  check(name+' theme keeps the same writing position',ev('Number(c.dataset.time)===970&&c.getAnimations()[0]===a'))
 check('no browser exceptions',not [e for e in events if e.get('method')=='Runtime.exceptionThrown'])
 (work/'pacing-checks.json').write_text(json.dumps({'pass':all(c['pass'] for c in checks),'checks':checks,'variants':results},indent=2),encoding='utf-8')
finally:
 ws.close();proc.terminate()
 try:proc.wait(timeout=10)
 except subprocess.TimeoutExpired:proc.kill()
