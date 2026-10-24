// Verify the rendered canvas at parameter extremes, using isolated notes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/courier-prime/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import Editor from '../src/Editor';
import { createNote, defaults } from '../src/storage';
import type { Settings } from '../src/storage';
import { lampAperture } from '../src/lamp';
function Fixture() {
 const [settings,setSettings]=useState<Settings>({...defaults,night:true,sound:false});
 const [note,setNote]=useState(()=>createNote('给美好留一点空间。\n\n慢下来。\n找到你的下一句话。'));
 const [report,setReport]=useState(''),[running,setRunning]=useState(false);
 const run=async()=>{
  setRunning(true);const results:string[]=[],wait=()=>new Promise(r=>setTimeout(r,350));
  const read=()=>{
   const c=document.querySelector<HTMLCanvasElement>('.paper-illumination')!,root=document.querySelector<HTMLElement>('.typewriter-assembly')!;
   const s=parseFloat(root.style.getPropertyValue('--mechanism-scale')),ratio=c.width/c.clientWidth,x=parseFloat(root.style.getPropertyValue('--carriage-x')),origin=parseFloat(root.style.getPropertyValue('--carriage-y'))+lampAperture.origin*s;
   const pixels=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
   const sample=(px:number,py:number)=>{
    // Interpolate at CSS coordinates. Nearest-pixel rounding at fractional
    // DPR can make a one-pixel step span two physical pixels and falsely
    // classify a smooth falloff as a cutoff.
    const x=Math.max(0,Math.min(c.width-1,px*ratio)),y=Math.max(0,Math.min(c.height-1,py*ratio));
    const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy;
    const at=(xx:number,yy:number,ch:number)=>pixels[(Math.min(c.height-1,yy)*c.width+Math.min(c.width-1,xx))*4+ch];
    return [0,1,2].map(ch=>(at(ix,iy,ch)*(1-tx)+at(ix+1,iy,ch)*tx)*(1-ty)+(at(ix,iy+1,ch)*(1-tx)+at(ix+1,iy+1,ch)*tx)*ty);
   };
   let maxStep=0,seamFraction=0;
   // A finite aperture has a steep diagonal launch close to its ends. A
   // horizontal sprite cutoff changes a broad part of the same row instead.
   for(let y=origin-75*s;y<origin+25*s;y++){
    let changed=0,count=0;
    for(let px=20;px<c.clientWidth-20;px+=4){
     if(Math.abs(px-x)<30*s)continue;
     const a=sample(px,y),b=sample(px,y+1),delta=Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
     count++;if(delta*s>18)changed++;
     if(y<origin-30*s||y>origin+8*s)maxStep=Math.max(maxStep,delta);
    }
    seamFraction=Math.max(seamFraction,changed/Math.max(count,1));
   }
   const ambient=sample(x,origin+20*s)[0];
   const sourceWidth=(height:number)=>{
    const center=sample(x,origin-height*s)[0],threshold=ambient+(center-ambient)/2;
    let width=0;for(let px=x-100*s;px<=x+100*s;px+=1/ratio)if(sample(px,origin-height*s)[0]>threshold)width+=1/ratio;
    return width/s;
   };
   return {maxStep,seamFraction,lit:sample(x,origin-70*s),below:sample(x,origin+52*s),origin,s,x,source:sourceWidth(0),opening:sourceWidth(10),three:root.classList.contains('has-3d')};
  };
  const check=(label:string,pass:boolean,detail='')=>results.push(`${pass?'PASS':'FAIL'} ${label}${detail?' · '+detail:''}`);
  const fixture={...defaults,night:true,sound:false,brightness:200,spread:160,beam:200};
  setSettings({...fixture,warmth:100});await wait();const warm=read();
  check('max warm field has no horizontal cutoff',warm.maxStep*warm.s<=18&&warm.seamFraction<.6,`far RGB Δ ${(warm.maxStep*warm.s).toFixed(2)}/255 per logical px · abrupt row fraction ${warm.seamFraction.toFixed(3)}`);
  setSettings({...fixture,warmth:0});await wait();const cold=read();
  check('max cold field has no horizontal cutoff',cold.maxStep*cold.s<=18&&cold.seamFraction<.6,`far RGB Δ ${(cold.maxStep*cold.s).toFixed(2)}/255 per logical px · abrupt row fraction ${cold.seamFraction.toFixed(3)}`);
  check('temperature endpoints visibly differ',warm.lit[0]>warm.lit[2]+60&&cold.lit[2]>cold.lit[0]+25,`warm ${warm.lit.join('/')} · cold ${cold.lit.join('/')}`);
  check('classic kit has no independent orange pool',Math.max(...cold.below)-Math.min(...cold.below)<8,`below ${cold.below.join('/')}`);
  for(const patch of [{brightness:20,beam:40,spread:50},{brightness:200,beam:40,spread:160},{brightness:200,beam:200,spread:50}]){
   setSettings({...fixture,...patch});await wait();const m=read();
   check(`finite light field ${patch.brightness}%/${patch.beam}%/${patch.spread}°`,m.lit.every(Number.isFinite)&&m.three);
   check(`finite slit at ${patch.beam}%/${patch.spread}°`,Math.abs(m.source-lampAperture.length)<3.5&&m.opening>m.source,`source ${m.source.toFixed(2)} · width 10px above ${m.opening.toFixed(2)}`);
  }
  setSettings({...fixture});await wait();const before=read();
  setNote(createNote('Short.'));await wait();const after=read();
  check('aperture and field follow text navigation',Math.abs(after.x-before.x)>10&&Math.abs(after.origin-before.origin)>5);
  const capsule=document.querySelector('.capsule')!.getBoundingClientRect(),aperture=document.querySelector('.capsule-emitter')!.getBoundingClientRect();
  check('light slit forms capsule top edge',Math.abs(aperture.top-capsule.top)<.1&&Math.abs(aperture.width-lampAperture.length*after.s)<.1);
  check('maximum field starts at finite slit',Math.abs(before.source-lampAperture.length)<3.5&&before.opening>before.source,`source ${before.source.toFixed(2)} · width 10px above ${before.opening.toFixed(2)}`);
  setReport(results.join('\n'));setRunning(false);
 };
 return <div className="app night"><header className="app-header"><span>灯光极值回归</span><button disabled={running} onClick={run}>运行灯光检查</button></header><main className="desk"><Editor note={note} settings={settings} onChange={(text,traces,inkSeeds)=>setNote(n=>({...n,text,traces,inkSeeds}))} onNight={()=>{}} onLightChange={()=>{}} onBookmark={()=>{}} focusVersion={0} onFocusChange={()=>{}}/></main><pre style={{position:'fixed',left:16,top:88,zIndex:30,fontSize:11,whiteSpace:'pre-wrap',maxWidth:260}}>{report}</pre></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture/></React.StrictMode>);
