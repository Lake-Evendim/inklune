// Exercise the production editor, with a white diagnostic stock so GPU pixels
// can be compared directly with the 2D light field rather than its metadata.
import React from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import App from '../src/App';
import {createNote,defaults} from '../src/storage';
import {lampAperture} from '../src/lamp';

const params=new URLSearchParams(location.search),fontLate=params.has('fontLate'),stockLate=params.has('stockLate');
const originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){
 if(!url.includes('paper-'))return originalLoad.call(this,url,onLoad,onProgress,onError);
 const pixels=new Uint8Array([255,255,255,255]);
 const texture=new THREE.DataTexture(pixels,1,1);texture.needsUpdate=true;
 setTimeout(()=>onLoad?.(texture),stockLate?900:0);
 return texture;
};
const face=new FontFace('Courier Prime','url(/node_modules/@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2)',{display:'swap'});
if(!fontLate){document.fonts.add(face);await face.load();}
let fontRequested=false;
const text=params.has('short')?'Let’s begin.':Array.from({length:20},(_,i)=>`${i+1}. A longer thought finds its way onto paper, one letter at a time.`).join('\n')+'\nji  ji\n\n\n';
const note=createNote(text);
createRoot(document.querySelector('#root')!).render(<React.StrictMode><App persist={false} initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,night:true,sound:false,warmth:100,paper:'cotton'}}}/></React.StrictMode>);

const samples:{pixelError:number;meanError:number;sourceError:number;apertureError:number;width:number;height:number;font:boolean;worst:unknown}[]=[];
let stopped=false,timer=0,frame=0;
let resizeStage=0;
const snapshot=document.createElement('canvas'),context=snapshot.getContext('2d',{willReadFrequently:true})!;
// Only sample real render opportunities. A timer fallback can inspect a new
// layout before ResizeObservers run, even though that state was never painted.
function schedule(){frame=requestAnimationFrame(()=>{if(!stopped)timer=window.setTimeout(sample,0);});}
function sample(){
 const paper=document.querySelector<HTMLElement>('.paper'),root=document.querySelector<HTMLElement>('.typewriter-assembly'),roll=document.querySelector<HTMLCanvasElement>('.paper-roll-canvas'),light=document.querySelector<HTMLCanvasElement>('.paper-illumination');
 if(paper&&root&&roll&&light&&paper.classList.contains('has-paper-roll')&&roll.dataset.stockReady==='true'){
  const scale=paper.clientWidth/430,x=parseFloat(root.style.getPropertyValue('--carriage-x')),y=parseFloat(root.style.getPropertyValue('--carriage-y')),origin=y+lampAperture.origin*scale;
  snapshot.width=roll.width;snapshot.height=roll.height;context.drawImage(roll,0,0);
  const gpu=context.getImageData(0,0,roll.width,roll.height).data,field=light.getContext('2d')!.getImageData(0,0,light.width,light.height).data;
  const rx=roll.width/paper.clientWidth,ry=roll.height/roll.clientHeight;
  const lw=Number(light.dataset.sheetWidth)||paper.clientWidth,lh=Number(light.dataset.sheetHeight)||paper.clientHeight;
  const at=(data:Uint8ClampedArray,width:number,px:number,py:number)=>data[(py*width+px)*4];
  const expected=(gx:number,gy:number)=>{
   // Pixel centers, independent x/y DPR rounding, and GL's linear filter.
   const fx=(gx+.5)/rx/lw*light.width-.5,fy=(gy+.5)/ry/lh*light.height-.5;
   const a=Math.floor(fx),b=Math.floor(fy),tx=fx-a,ty=fy-b;
   return (at(field,light.width,a,b)*(1-tx)+at(field,light.width,a+1,b)*tx)*(1-ty)+(at(field,light.width,a,b+1)*(1-tx)+at(field,light.width,a+1,b+1)*tx)*ty;
  };
  // Below the last baseline: no printed ink can hide a misplaced
  // cone. The diagnostic paper is white and this belt has no bend shading.
  let pixelError=0,totalError=0,pixelCount=0,worst:unknown=null;
  for(let py=Math.max(Number(paper.dataset.rollBand)+2,origin-12*scale);py<Math.min(roll.clientHeight-2,origin+70*scale);py+=2){
   for(let px=Math.max(2,x-38*scale);px<Math.min(paper.clientWidth-2,x+38*scale);px+=3){
    const gx=Math.round(px*rx),gy=Math.round(py*ry);
    const actual=at(gpu,roll.width,gx,gy),want=expected(gx,gy),error=Math.abs(actual-want);
    totalError+=error;pixelCount++;
    if(error>pixelError){pixelError=error;worst={gx,gy,px,py,origin,band:paper.dataset.rollBand,actual,want,rollSize:[roll.width,roll.height,roll.clientWidth,roll.clientHeight],lightSize:[light.width,light.height,lw,lh]};}
   }
  }
  const boundary=(gpuSample:boolean)=>{
   const gx=Math.round(x*rx),read=(py:number)=>gpuSample?at(gpu,roll.width,gx,Math.round(py*ry)):expected(gx,Math.round(py*ry));
   const ambient=read(Math.min(roll.clientHeight-3,origin+65*scale));
   const peak=read(origin-5*scale),threshold=ambient+(peak-ambient)*.5;
   for(let py=origin-3*scale;py<Math.min(roll.clientHeight-3,origin+65*scale);py+=1/ry)if(read(py)<threshold)return py;
   return NaN;
  };
  const aperture=document.querySelector('.capsule-emitter')!.getBoundingClientRect(),pb=paper.getBoundingClientRect();
  samples.push({pixelError,meanError:totalError/Math.max(1,pixelCount),sourceError:Math.abs(boundary(true)-boundary(false)),apertureError:Math.abs(aperture.top-pb.top-origin),width:paper.clientWidth,height:paper.clientHeight,font:face.status==='loaded',worst});
  if(fontLate&&!fontRequested&&samples.length>=8){fontRequested=true;setTimeout(()=>{document.fonts.add(face);void face.load();},100);}
  // Resize just after a sampled paint, avoiding a timer that changes DOM
  // dimensions between rAF/ResizeObserver and our pixel observation.
  if(!params.has('noResize')&&samples.length>=(resizeStage===0?4:resizeStage===1?24:Infinity)){
   const frame=parent.document.querySelector<HTMLIFrameElement>('#room');
   if(frame){const other=++resizeStage===1,phone=params.has('phone');frame.style.width=phone!==other?'390px':'1280px';frame.style.height=phone!==other?'844px':'720px';}
  }
 }
 if(!stopped)schedule();
}
schedule();
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
parent.postMessage({type:'light-startup-ready'},location.origin);
const start=performance.now();while(performance.now()-start<18000){await sleep(100);if(performance.now()-start>3500&&samples.length>=32&&samples.at(-1)?.font)break;}stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);
const checks=[
 ['GPU cone pixels match the committed light field',samples.length>5&&samples.every(s=>s.meanError<=3),`worst frame mean ${Math.max(...samples.map(s=>s.meanError)).toFixed(3)}/255, peak ${Math.max(...samples.map(s=>s.pixelError)).toFixed(3)}/255`],
 ['GPU cone source does not fall below the slit',samples.every(s=>s.sourceError<1.5),`max ${Math.max(...samples.map(s=>s.sourceError)).toFixed(2)}px`],
 ['light origin matches the physical slit',samples.every(s=>s.apertureError<.2),`max ${Math.max(...samples.map(s=>s.apertureError)).toFixed(3)}px`],
 ['sampled frames after stock and font completion',samples.length>5&&samples.at(-1)?.font,`${samples.length} frames`],
 ['delayed font completion was observed',!fontLate||samples.some(s=>!s.font)&&samples.some(s=>s.font)],
 ['sampled both resize directions',params.has('noResize')||new Set(samples.map(s=>s.width)).size===2&&resizeStage===2],
 ['text preserved',document.querySelector('textarea')!.value===text],
];
const result={type:'light-startup-result',checks,samples};document.body.dataset.result=JSON.stringify(result);parent.postMessage(result,location.origin);
