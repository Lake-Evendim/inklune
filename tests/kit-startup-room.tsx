import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/courier-prime/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import Editor from '../src/Editor';
import {createNote,defaults} from '../src/storage';
import type {Settings} from '../src/storage';
import {kits} from '../src/skins';
const params=new URLSearchParams(location.search),kit=kits.find(k=>k.id===params.get('kit'))??kits[0];
const note=createNote('The first view belongs to the kit you chose.\n第一次出现，就应该是你选的套件。');
let desired:Settings={...defaults,kit:kit.id,rail:kit.rail,endcap:kit.endcap,decoration:kit.decoration,capsule:'blue',night:params.has('night'),sound:false,paper:'cotton'};
const key=(s:Settings)=>JSON.stringify([s.kit,s.capsule,s.rail,s.endcap,s.night]);
function Fixture(){
 const [settings,setSettings]=useState(desired);
 const choose=(index:number)=>{const k=kits[index];desired={...desired,kit:k.id,rail:k.rail,endcap:k.endcap,decoration:k.decoration};setSettings(desired);};
 return <div className={`app${settings.night?' night':''}`}><header className="app-header"><span>套件首次绘制</span><button id="change" onClick={()=>choose((kits.findIndex(k=>k.id===desired.kit)+1)%kits.length)}>下一套件</button><button id="theme" onClick={()=>{desired={...desired,night:!desired.night};setSettings(desired);}}>昼夜</button></header><main className="desk"><Editor note={note} settings={settings} onChange={()=>{}} onNight={()=>{}} onLightChange={()=>{}} onBookmark={()=>{}} focusVersion={0} onFocusChange={()=>{}}/></main></div>;
}
const events:{phase:string;ready:boolean;fallback:boolean;model:string;expected:string;frames:number}[]=[];
let phase='initial',stopped=false,frame=0,timer=0;
const start=performance.now();
function sample(){
 const root=document.querySelector<HTMLElement>('.typewriter-assembly'),canvas=root?.querySelector<HTMLCanvasElement>('.mechanism-canvas');
 const body=root?.querySelector<HTMLElement>('.capsule');
 if(root&&body){const style=getComputedStyle(body);events.push({phase,ready:root.classList.contains('has-3d'),fallback:style.backgroundImage!=='none',model:canvas?.dataset.renderModel??'',expected:key(desired),frames:Number(canvas?.dataset.frames??0)});}
 if(!stopped)schedule();
}
function schedule(){let done=false;const run=()=>{if(done||stopped)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);timer=window.setTimeout(sample,0);};frame=requestAnimationFrame(run);timer=window.setTimeout(run,35);}
const app=createRoot(document.querySelector('#root')!);
app.render(<React.StrictMode><Fixture/></React.StrictMode>);schedule();
window.addEventListener('pagehide',()=>app.unmount(),{once:true});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
while(performance.now()-start<12000){await wait(60);if(events.filter(e=>e.ready).length>=4&&performance.now()-start>300)break;}
phase='switch';document.querySelector<HTMLButtonElement>('#change')!.click();await wait(240);
phase='theme';document.querySelector<HTMLButtonElement>('#theme')!.click();await wait(240);
phase='rapid';for(let i=0;i<4;i++){document.querySelector<HTMLButtonElement>('#change')!.click();await wait(30);}await wait(200);
stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);
const initial=events.filter(e=>e.phase==='initial'),first=initial[0],last=events.at(-1)!;
const checks=[
 ['first appearance is a completed 3D kit',!!first?.ready&&!first?.fallback],
 ['initial model uses selected kit, colour, rail, ends and theme',initial.every(e=>e.model===e.expected)],
 ['no generic shell during startup or selection',events.length>10&&events.every(e=>e.ready&&!e.fallback),`${events.length} painted samples`],
 ['kit and theme changes use current settings',events.filter(e=>e.phase!=='initial').every(e=>e.model===e.expected)],
 ['rapid selection leaves the latest kit visible',last.ready&&!last.fallback&&last.model===last.expected],
 ['note preserved',document.querySelector<HTMLTextAreaElement>('textarea')!.value===note.text],
 ];
if(params.has('context')){
 const canvas=document.querySelector<HTMLCanvasElement>('.mechanism-canvas')!,root=document.querySelector<HTMLElement>('.typewriter-assembly')!;
 const context=canvas.getContext('webgl2')!,extension=context.getExtension('WEBGL_lose_context')!;
 extension.loseContext();await wait(120);
 checks.push(['loss clears completed-frame marker',!root.classList.contains('has-3d')]);
 document.querySelector<HTMLButtonElement>('#change')!.click();document.querySelector<HTMLButtonElement>('#theme')!.click();await wait(80);
 extension.restoreContext();for(let i=0;i<80&&!root.classList.contains('has-3d');i++)await wait(60);
 checks.push(['restoration displays latest kit and theme',root.classList.contains('has-3d')&&canvas.dataset.renderModel===key(desired)]);
 checks.push(['restoration preserves note',document.querySelector<HTMLTextAreaElement>('textarea')!.value===note.text]);
}
const result={type:'kit-startup',checks,events};document.body.dataset.result=JSON.stringify(result);parent.postMessage(result,location.origin);
