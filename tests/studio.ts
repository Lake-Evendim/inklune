const frame=document.querySelector<HTMLIFrameElement>('#room')!,out=document.querySelector('#results')!;
const wait=(ms=80)=>new Promise(r=>setTimeout(r,ms));
const doc=()=>frame.contentDocument!,win=()=>frame.contentWindow!;
const click=(selector:string)=>doc().querySelector<HTMLElement>(selector)!.click();
const ready=async()=>{for(let i=0;i<100;i++){if(doc().querySelector('.has-3d'))return;await wait();}throw Error('WebGL not ready');};
document.querySelector('#phone')!.addEventListener('click',()=>{frame.style.width='360px';frame.style.height='640px';});
document.querySelector('#desktop')!.addEventListener('click',()=>{frame.style.width='1280px';frame.style.height='720px';});
document.querySelector('#long')!.addEventListener('click',()=>{frame.src='/tests/room.html?paper=lined&long';});
document.querySelector('#scroll')!.addEventListener('click',()=>{const desk=doc().querySelector('.desk')!;desk.scrollTop=Math.max(0,desk.scrollTop-170);});
document.querySelector('#flat')!.addEventListener('click',async()=>{click('[aria-label="打开书写设置"]');await wait();const curved=doc().querySelector('.paper')!.classList.contains('curved');[...doc().querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===(curved?'平面':'弯曲'))!.click();click('[aria-label="关闭设置"]');});
document.querySelector('#report')!.addEventListener('click',()=>{out.textContent='';});
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async()=>{
 const report:string[]=[];const check=(name:string,pass:boolean)=>{report.push(`${pass?'PASS':'FAIL'} ${name}`);out.textContent=report.join('\n');};
 await ready();await doc().fonts.ready;await wait(600);const root=doc().querySelector('.typewriter-assembly')!,canvas=doc().querySelector<HTMLCanvasElement>('.mechanism-canvas')!;
 const originalText=doc().querySelector('textarea')!.value;
 // First opening in a fresh App: real buttons, eager asset decode, next paint.
 click('[aria-label="打开书写设置"]');await wait();const started=performance.now();
 // Background browser frames can be throttled to 1fps. Measure the actual
 // React commit and decoded assets rather than that unrelated RAF delay.
 const committed=new Promise<void>(resolve=>{const observer=new MutationObserver(()=>{if(doc().querySelectorAll('.kit-preview').length===9){observer.disconnect();resolve();}});observer.observe(doc().body,{subtree:true,childList:true});});
 click('#tab-kit');await committed;
 const images=[...doc().querySelectorAll<HTMLImageElement>('.kit-preview')];
 check('first kit tab has nine decoded previews',images.length===9&&images.every(i=>i.complete&&i.naturalWidth===576));
 check(`first kit commit with decoded previews ${Math.round(performance.now()-started)}ms`,performance.now()-started<200);
 check('kit tab creates no extra WebGL canvas',doc().querySelectorAll('canvas').length===3);
 click('#tab-paper');await wait();[...doc().querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='横线纸')!.click();await wait();
 for(const id of ['ink','light','kit','paper']){click(`#tab-${id}`);await wait();check(`lined paper allows ${id} tab`,doc().querySelector(`#tab-${id}`)?.getAttribute('aria-selected')==='true');}
 click('[aria-label="关闭设置"]');await wait();
 let fallbackFrames=0,wrongTheme=0,samples=0;
 const observer=new MutationObserver(()=>{if(!root.classList.contains('has-3d'))fallbackFrames++;});observer.observe(root,{attributes:true,attributeFilter:['class']});
 const sample=()=>{samples++;if(!root.classList.contains('has-3d'))fallbackFrames++;if(canvas.dataset.renderTheme!==(doc().querySelector('.app')!.classList.contains('night')?'night':'day'))wrongTheme++;};
 for(let i=0;i<4;i++){
  click('.theme-toggle');sample();for(let j=0;j<4;j++){await new Promise<void>(r=>win().requestAnimationFrame(()=>r()));sample();}
  check(`theme ${i+1} preserves canvas and has matching render`,doc().querySelector('.mechanism-canvas')===canvas&&canvas.dataset.renderTheme===(doc().querySelector('.app')!.classList.contains('night')?'night':'day'));
 }
 observer.disconnect();check(`no fallback or wrong scheme in ${samples} samples`,fallbackFrames===0&&wrongTheme===0);
 check('theme switching preserves note text',doc().querySelector('textarea')!.value===originalText);
 const paper=doc().querySelector<HTMLElement>('.paper')!,belt=doc().querySelector<HTMLElement>('.writing-area')!,point=doc().querySelector('.print-point')!.getBoundingClientRect(),capsule=doc().querySelector('.capsule')!.getBoundingClientRect();
 const style=getComputedStyle(belt.querySelector('.ink-text')!),baseline=belt.querySelector('.baseline-marker')!.getBoundingClientRect().bottom;
 const renderedFeed=paper.classList.contains('has-paper-roll')?parseFloat((root as HTMLElement).style.getPropertyValue('--paper-feed')):0;
 const measure=doc().createElement('canvas').getContext('2d')!;measure.font=`${style.fontSize} ${style.fontFamily}`;const face=measure.measureText('.'),target=baseline-renderedFeed-(face.actualBoundingBoxAscent-face.actualBoundingBoxDescent)/2;
 check('period-height print point is preserved',Math.abs(point.top+point.height/2-target)<1);
 const s=paper.clientWidth/430,carriage=parseFloat((root as HTMLElement).style.getPropertyValue('--carriage-y'));
 check('capsule is raised four logical pixels',Math.abs(capsule.top-paper.getBoundingClientRect().top-(carriage-10.5*s))<1);
 check('lamp stays at the capsule edge',Math.abs(doc().querySelector('.capsule-emitter')!.getBoundingClientRect().top-capsule.top)<.2);
 check('paper and ink share one roll surface',!!doc().querySelector('.paper-surface>.paper-texture')&&!!doc().querySelector('.paper-surface>.paper-content'));
 check('curved mode applies a continuous GPU surface',Number(paper.dataset.roll)>.99&&paper.classList.contains('has-paper-roll')&&!doc().querySelector('feDisplacementMap'));
 check('active printing stays between roll edges',point.top-paper.getBoundingClientRect().top>Number(paper.dataset.rollBand));
 const assembly=root.getBoundingClientRect();check(`writing viewport ${Math.round(assembly.height)}px`,assembly.height>=win().innerHeight-(win().innerWidth>760?74:110));
 check('document has no second scroll bar',doc().documentElement.scrollHeight===win().innerHeight&&doc().documentElement.scrollWidth===win().innerWidth);
 click('[aria-label="新建纸页"]');await wait(400);
 check('empty-page first line stays outside the curled edge',Number(paper.dataset.rollBand)<doc().querySelector('.writing-area')!.getBoundingClientRect().top-paper.getBoundingClientRect().top);
});

document.querySelector('#demo')!.addEventListener('click',()=>{const desk=doc().querySelector('.desk')!,from=desk.scrollTop,start=performance.now();const tick=(now:number)=>{const t=Math.min(1,(now-start)/6000);desk.scrollTop=from-340*(t*t*(3-2*t));if(t<1)win().requestAnimationFrame(tick);};win().requestAnimationFrame(tick);});
