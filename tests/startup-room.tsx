// Deliberately delay real resource completion. Each frame is checked; this
// fixture never reads or writes the user's persisted notebook.
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import App from '../src/App';
import {createNote,defaults} from '../src/storage';
const params=new URLSearchParams(location.search),fontLate=params.get('font')==='late',stockLate=params.get('stock')==='late';
const load=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){
 return load.call(this,url,texture=>{if(stockLate&&url.includes('paper-'))setTimeout(()=>onLoad?.(texture),900);else onLoad?.(texture);},onProgress,onError);
};
const text=Array.from({length:16},(_,i)=>`${i+1}. A longer thought finds its way onto paper, one letter at a time.`).join('\n')+'\nji\nji\njj\nnj\nji  ji';
const note=createNote(text);
const face=new FontFace('Courier Prime','url(/node_modules/@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2)',{display:'swap'});
if(!fontLate){document.fonts.add(face);await face.load();}
createRoot(document.querySelector('#root')!).render(<React.StrictMode><App persist={false} initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,paper:'lined',night:params.has('night'),sound:false}}}/></React.StrictMode>);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let fontRequested=false;
const samples:{error:number;xError:number;roll:boolean;stock:boolean;font:boolean;feed:number;lightError:number}[]=[];
let paintedReference:{target:number;x:number}|null=null;
const start=performance.now();let stopped=false,frame=0,timer=0;
// Capture after the frame's ResizeObservers, which run between rAF and paint.
// Sampling inside rAF would inspect pre-layout state never shown on screen.
function schedule(){let done=false;const run=()=>{if(done||stopped)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);timer=window.setTimeout(sample,0);};frame=requestAnimationFrame(run);timer=window.setTimeout(run,40);}
function sample(){
 const root=document.querySelector<HTMLElement>('.typewriter-assembly'),paper=document.querySelector<HTMLElement>('.paper'),mirror=document.querySelector<HTMLElement>('.ink-text');
 if(root&&paper&&mirror){
  const feed=Number.parseFloat(root.style.getPropertyValue('--paper-feed'))||0,scale=paper.clientWidth/430,style=getComputedStyle(mirror),size=Number.parseFloat(style.fontSize);
  const end=mirror.querySelector<HTMLElement>('.end-marker')!,marker=mirror.querySelector<HTMLElement>('.rule-baseline-marker')!;
  const eb=end.getBoundingClientRect(),area=mirror.getBoundingClientRect(),pb=paper.getBoundingClientRect();
  // Independent baseline comes from the last inline marker, whose bottom is
  // on that last line's baseline, even after a font changes line wrapping.
  const last=mirror.querySelector<HTMLElement>('.baseline-marker')!;
  const ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`${size}px ${style.fontFamily}`;const dot=ctx.measureText('.');
  const target=last.getBoundingClientRect().bottom-pb.top+(paper.classList.contains('has-paper-roll')?0:feed)-(dot.actualBoundingBoxAscent-dot.actualBoundingBoxDescent)/2;
  const y=Number.parseFloat(root.style.getPropertyValue('--carriage-y'))||0,travel=Number.parseFloat(root.style.getPropertyValue('--impact-travel'))||0;
  const x=Number.parseFloat(root.style.getPropertyValue('--carriage-x'))||0;
  const expectedX=Math.max(52*scale,Math.min(paper.clientWidth-52*scale,eb.left-pb.left+2*scale));
  const roll=paper.classList.contains('has-paper-roll');
  // A font may have changed the invisible DOM mirror while the displayed
  // canvas still holds its previous, correctly aligned ink. Use that last
  // independently measured reference until the new raster is committed.
  const rollCanvas=paper.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!;
  if(!roll||Math.abs(Number(rollCanvas.dataset.fontMeasure)-ctx.measureText('Mwj.宽').width)<.01)paintedReference={target,x:expectedX};
  const reference=paintedReference??{target,x:expectedX};
  const error=Math.abs(y+feed-29.5*scale-travel-reference.target);
  const light=paper.querySelector<HTMLCanvasElement>('.paper-illumination')!,lc=light.getContext('2d')!,ratio=light.width/paper.clientWidth;
  const origin=y-10.5*scale;
  const lightError=Math.max(Math.abs(Number(light.dataset.carriageX)-x),Math.abs(Number(light.dataset.carriageY)-y));
  samples.push({error,xError:Math.abs(x-reference.x),roll,stock:rollCanvas.dataset.stockReady==='true',font:face.status==='loaded',feed,lightError});
  // Cold shader compilation can take longer than an absolute timeout. Keep
  // the face pending until the loading state has actually been observed.
  if(fontLate&&!fontRequested&&samples.length>=5){fontRequested=true;setTimeout(()=>{document.fonts.add(face);void face.load();},100);}
 }
 if(!stopped)schedule();
}
schedule();
while(performance.now()-start<20000){await sleep(100);if(samples.filter(s=>s.font&&s.roll&&s.stock).length>=20&&performance.now()-start>1600)break;}
stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);
const before=samples.filter(s=>!s.font),after=samples.filter(s=>s.font),final=samples.at(-1)!;
const checks=[
 ['sampled both loading phases',(stockLate?samples.some(s=>!s.stock):before.length>0)&&samples.some(s=>s.stock)&&after.length>0,`${samples.length} samples`],
 ['no baseline drift during startup',samples.every(s=>s.error<1.2),`max ${Math.max(...samples.map(s=>s.error)).toFixed(3)}px`],
 ['no lateral drift during startup',samples.every(s=>s.xError<1.2),`max ${Math.max(...samples.map(s=>s.xError)).toFixed(3)}px`],
 ['settled automatically without reload',final.error<1.2&&final.xError<1.2&&final.roll&&final.stock&&final.font,JSON.stringify(final)],
 ['note preserved',document.querySelector<HTMLTextAreaElement>('textarea')!.value===text],
 ['paper feed synchronized',Math.abs(Number(document.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!.dataset.feed)-final.feed)<.01],
 ['lamp and carriage synchronized',samples.every(s=>s.lightError<1.2),`max ${Math.max(...samples.map(s=>s.lightError)).toFixed(3)}px`],
 ];
const result={type:'startup-result',checks,samples,phases:{before:before.length,after:after.length}};
document.body.dataset.startup=JSON.stringify(result);parent.postMessage(result,location.origin);
