import React from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import '@fontsource/courier-prime/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import App from '../src/App';
import {createNote,defaults} from '../src/storage';
import type {Paper} from '../src/storage';
import {paperSkins} from '../src/skins';
import {projectPaper,unprojectPaper} from '../src/paperGeometry';
const params=new URLSearchParams(location.search),curved=!params.has('flat'),paperId=(params.get('paper')||'cotton') as Paper;
const original=THREE.TextureLoader.prototype.load;
let pending:(()=>void)[]=[],released=false;
THREE.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){return original.call(this,url,tex=>{if(url.includes('paper-')&&!released)pending.push(()=>onLoad?.(tex));else onLoad?.(tex);},onProgress,onError);};
const note=createNote('A first frame, already in the shape you chose.\n刷新后，纸页应直接保持所选形态。');
createRoot(document.querySelector('#root')!).render(<React.StrictMode><App persist={false} initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,paper:paperSkins[paperId]?paperId:'cotton',curved,night:params.has('night'),sound:false}}}/></React.StrictMode>);
const samples:{shown:boolean;stock:boolean;amount:number;edgeError:number;width:number}[]=[];
let stopped=false,frame=0,timer=0;
const snapshot=document.createElement('canvas'),context=snapshot.getContext('2d',{willReadFrequently:true})!;
function sample(){
 const paper=document.querySelector<HTMLElement>('.paper'),canvas=paper?.querySelector<HTMLCanvasElement>('.paper-roll-canvas');
 if(paper&&canvas){
  const shown=getComputedStyle(canvas).display!=='none',shape={width:paper.clientWidth,height:canvas.clientHeight,band:Number(paper.dataset.rollBand),amount:curved?1:0};
  let edgeError=Infinity;
  if(shown&&canvas.width&&canvas.height){
   snapshot.width=canvas.width;snapshot.height=canvas.height;context.drawImage(canvas,0,0);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
   const rx=canvas.width/paper.clientWidth,ry=canvas.height/canvas.clientHeight;
   edgeError=0;
   for(const y of [3,shape.band*.22,shape.band*.55,shape.band+3]){
    const row=Math.round(y*ry);let left=-1,right=-1;
    for(let x=0;x<canvas.width;x++)if(pixels[(row*canvas.width+x)*4+3]>32){if(left<0)left=x;right=x;}
    const projected=projectPaper(unprojectPaper(y,shape),shape),expected=shape.width*(1-projected.scale)/2;
    edgeError=Math.max(edgeError,Math.abs(left/rx-expected),Math.abs((canvas.width-right-1)/rx-expected));
   }
  }
  samples.push({shown,stock:canvas.dataset.stockReady==='true',amount:Number(paper.dataset.roll),edgeError,width:paper.clientWidth});
 }
 if(!released&&samples.length>=5&&pending.length){released=true;for(const deliver of pending.splice(0))deliver();}
 if(!stopped)frame=requestAnimationFrame(()=>{timer=window.setTimeout(sample,0);});
}
frame=requestAnimationFrame(()=>{timer=window.setTimeout(sample,0);});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const started=performance.now();while(performance.now()-started<18000){await sleep(100);if(samples.length>=25&&samples.some(s=>s.stock)&&performance.now()-started>1200)break;}
stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);
const checks=[
 ['first visible paper uses the GPU surface',samples.length>0&&samples.every(s=>s.shown)],
 ['startup never morphs away from the saved shape',samples.every(s=>Math.abs(s.amount-(curved?1:0))<.0001)],
 ['painted edges match the selected shape from the first frame',samples.every(s=>s.edgeError<1.5),`max ${Math.max(...samples.map(s=>s.edgeError)).toFixed(3)}px`],
 ['checked before and after the full stock arrived',samples.some(s=>!s.stock)&&samples.some(s=>s.stock),`${samples.length} frames`],
 ['note preserved',document.querySelector('textarea')!.value===note.text],
];
const result={type:'paper-startup-result',checks,samples};document.body.dataset.result=JSON.stringify(result);parent.postMessage(result,location.origin);
