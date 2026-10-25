// Real App, disposable workspace: no user notes or local storage are touched.
import {Profiler,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import '../src/brand.css';
import App from '../src/App';
import {createNote,defaults} from '../src/storage';
import type {Workspace} from '../src/storage';

const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const nextFrame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));
const percentile=(a:number[],p:number)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]||0;
const round=(n:number)=>Math.round(n*10)/10;
function Fixture(){
 const initial=()=>{const n=createNote('Writing on paper.');return {notes:[n],activeId:n.id,settings:{...defaults,sound:false}};};
 const [workspace,setWorkspace]=useState<Workspace>(initial),[version,setVersion]=useState(0),[running,setRunning]=useState(false),[report,setReport]=useState('');
 const run=async()=>{
  setRunning(true);setReport('Running');const results=[];
  for(const scenario of (location.search.includes('profile-input')?[{night:false,long:true,deletion:'erase'}] as const:[
   {night:false,long:false,deletion:'erase'}, {night:true,long:false,deletion:'erase'},
   {night:false,long:true,deletion:'erase'}, {night:true,long:true,deletion:'erase'},
   {night:true,long:true,deletion:'strike'},
  ] as const)){
   const text=scenario.long?'Paper, ink and a clear line of writing. 中文书写，字迹清晰。\n'.repeat(55):'Writing on paper. ';
   const note=createNote(text);
   flushSync(()=>{setWorkspace({notes:[note],activeId:note.id,settings:{...defaults,...scenario,sound:false}});setVersion(v=>v+1);});
   for(let i=0;i<150&&!document.querySelector<HTMLElement>('.typewriter-assembly')?.dataset.prepared;i++)await wait(30);
   await wait(650);
   const input=document.querySelector('textarea')!,root=document.querySelector<HTMLElement>('.typewriter-assembly')!,roll=document.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,light=document.querySelector<HTMLCanvasElement>('.paper-illumination')!;
   input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
   const counters=()=>({draws:Number(roll.dataset.draws||0),layouts:Number(roll.dataset.layouts||0),rasters:Number(roll.dataset.rasters||0),lighting:Number(light?.dataset.version||0)});
   const update=(value:string,type:string)=>{
    const begin=performance.now();
    flushSync(()=>{input.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:type}));Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,value);input.setSelectionRange(value.length,value.length);input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:type}));});
    return performance.now()-begin;
   };
   for(const kind of ['print','delete'] as const){
    const before=counters(),gaps:number[]=[],handlers:number[]=[],latencies:number[]=[],pending:{node:HTMLElement;at:number}[]=[];
    let frame=0,last=performance.now(),maxHidden=0;
    const sample=(time:number)=>{gaps.push(time-last);last=time;for(let i=pending.length-1;i>=0;i--){if(!pending[i].node.isConnected||pending[i].node.style.visibility!=='hidden'){latencies.push(time-pending[i].at);pending.splice(i,1);}}maxHidden=Math.max(maxHidden,pending.length);frame=requestAnimationFrame(sample);};frame=requestAnimationFrame(sample);
    const began=performance.now();const count=kind==='print'?40:60;let expected=input.value;
    for(let i=0;i<count;i++){
     const at=performance.now();expected=kind==='print'?expected+('Clear ink. 中'[i%12]||'A'):expected.slice(0,-1);
     handlers.push(update(expected,kind==='print'?'insertText':'deleteContentBackward'));
     if(kind==='print'){const node=document.querySelector<HTMLElement>(`.ink-glyph[data-start="${expected.length-1}"]`);if(node)pending.push({node,at});}
     await wait(20);
    }
    const end=performance.now();
    const mirrorCorrect=[...document.querySelectorAll<HTMLElement>('.ink-glyph[data-start]')].map(n=>n.textContent).join('')===expected;
    for(let i=0;i<200&&(root.dataset.motion!=='idle'||pending.length);i++)await wait(20);
    await nextFrame();cancelAnimationFrame(frame);const after=counters();
    results.push({...scenario,kind,count,visibility:document.visibilityState,length:input.value.length,textCorrect:input.value===expected,mirrorCorrect,idle:root.dataset.motion==='idle',hidden:pending.length,maxHidden,burstMs:round(end-began),settleMs:round(performance.now()-end),visibleP95:round(percentile(latencies,.95)),visibleMax:round(Math.max(0,...latencies)),frameP95:round(percentile(gaps,.95)),frameMax:round(Math.max(...gaps)),handlerP95:round(percentile(handlers,.95)),handlerMax:round(Math.max(...handlers)),...Object.fromEntries(Object.keys(before).map(k=>[k,after[k as keyof typeof after]-before[k as keyof typeof before]]))});
    setReport(JSON.stringify(results,null,2));await wait(200);
   }
  }
  setRunning(false);
 };
 return <><Profiler id="app" onRender={(_,phase,ms)=>{if(location.search.includes('profile-input'))console.info('input-profile',JSON.stringify({phase:'react-'+phase,ms}));}}><App key={version} persist={false} initialScreen="writer" initialWorkspace={workspace}/></Profiler><aside style={{position:'fixed',top:8,left:8,zIndex:9999,background:'#fff',color:'#222',padding:8,maxHeight:'90vh',overflow:'auto',fontSize:11,width:260}}><button disabled={running} onClick={()=>void run()}>Run input benchmark</button><pre data-performance-report>{report}</pre></aside></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
