// Isolated visual fixture: never reads or writes a user's notes or settings.
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import Editor from '../src/Editor';
import { createNote, defaults } from '../src/storage';
import type { Settings } from '../src/storage';
import { exportPaper } from '../src/export';
const phone=new URLSearchParams(location.search).has('phone');
const reference='给美好留一点空间。\n\n慢下来。\n找到你的下一句话。';
function Fixture() {
  const [note,setNote]=useState(()=>createNote(reference));
  const [settings,setSettings]=useState<Settings>({...defaults,sound:false,night:true,fontSize:21});
  const [width,setWidth]=useState(430);
  const [report,setReport]=useState('');
  const [working,setWorking]=useState(false);
  const maxima=useRef<number[]>([]);
  const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
  const run=async()=>{
    setWorking(true);setReport('');maxima.current=[];
    const input=document.querySelector('textarea')!;
    const root=document.querySelector<HTMLElement>('.typewriter-assembly')!;
    const rows:string[]=[];
    const change=(value:string,type:string)=>{
      input.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:type}));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,value);
      input.setSelectionRange(value.length,value.length);
      input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:type}));
    };
    change('','insertFromPaste');await wait(350);
    for(const prefix of ['', 'Dear ', 'Dear little moments,', 'ABCDEFGHIJKLMNOPQRSTUVW\nNext ', 'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nlast ']){
      change(prefix,'insertFromPaste');await wait(320);
      let max=0;const observer=new MutationObserver(()=>{max=Math.max(max,parseFloat(root.style.getPropertyValue('--hammer-extension'))||0);});
      observer.observe(root,{attributes:true,attributeFilter:['style']});
      change(prefix+'X','insertText');await wait(600);observer.disconnect();maxima.current.push(max);
      const head=document.querySelector('.type-hammer b')!.getBoundingClientRect();
      const point=document.querySelector('.print-point')!.getBoundingClientRect();
      rows.push(`${prefix.length} chars → travel ${max.toFixed(2)}px, planned ${parseFloat(root.style.getPropertyValue('--impact-travel')).toFixed(2)}px, idle ${root.dataset.motion}, point/head gap ${(head.bottom-(point.top+point.height/2)).toFixed(2)}px`);
    }
    const expected=parseFloat(root.style.getPropertyValue('--impact-travel'));
    rows.push(maxima.current.every(v=>v>expected*.8&&v<=expected+.1)?'PASS strokes reach the same glyph target across short, wrapped and fed pages':'FAIL inconsistent stroke');
    rows.push(getComputedStyle(document.querySelector('.print-point')!).backgroundColor==='rgb(140, 205, 93)'?'PASS green impact point':'FAIL impact color');
    setReport(rows.join('\n'));setWorking(false);
  };
  return <div className={`app ${settings.night?'night':''}`} style={{padding:phone?'16px':'20px',minHeight:phone?932:1050}}>
    <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
      <button onClick={()=>setSettings(s=>({...s,night:!s.night}))}>Day / night</button>
      <button onClick={()=>setSettings(s=>({...s,paper:'cotton',capsule:'ivory'}))}>Cotton / ivory</button>
      <button onClick={()=>setSettings(s=>({...s,paper:'blue',capsule:'blue'}))}>Blue / blue</button>
      <button onClick={()=>setSettings(s=>({...s,curved:!s.curved}))}>Flat / curved</button>
      <button onClick={()=>setWidth(430)}>430px</button><button onClick={()=>setWidth(360)}>360px</button>
      <button onClick={()=>setNote(createNote(reference))}>Reference text</button>
      <button onClick={()=>setSettings({...defaults,sound:false,night:true,fontSize:21})}>Reset light</button>
      <button onClick={()=>document.querySelector<HTMLCanvasElement>('.mechanism-canvas')?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext()}>Test CSS fallback</button>
      <button onClick={()=>void exportPaper(note,settings)}>Export reference PNG</button>
      <button disabled={working} onClick={run}>Check stroke geometry</button>
    </div>
    <div style={{width:phone?'100%':width,margin:'0 auto'}}>
      <Editor note={note} settings={settings} onChange={(text,traces,inkSeeds)=>setNote(n=>({...n,text,traces,inkSeeds}))} onNight={()=>setSettings(s=>({...s,night:!s.night}))} onLightChange={patch=>setSettings(s=>({...s,...patch}))} onBookmark={()=>{}} focusVersion={0} onFocusChange={()=>{}} />
    </div><pre style={{color:'#aaa',whiteSpace:'pre-wrap',fontSize:12}}>{report}</pre>
    <style>{`.typewriter-assembly{width:100%}.app .paper.curved{height:752px}.night-light-controls{left:23px;right:70px;gap:15px}`}</style>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);




