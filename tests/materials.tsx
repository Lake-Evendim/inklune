// Isolated review fixture: all notes and settings remain in React memory.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import Editor from '../src/Editor';
import SettingsPanel from '../src/SettingsPanel';
import { createNote, defaults } from '../src/storage';
import type { Settings } from '../src/storage';
import { kits } from '../src/skins';
import { exportPaper } from '../src/export';
import { runMenuRegression } from './menuRegression';
function Fixture() {
 const [note,setNote]=useState(()=>createNote('Let’s\njn'));
 const [settings,setSettings]=useState<Settings>({...defaults,sound:false});
 const [panel,setPanel]=useState(false),[report,setReport]=useState(''),[running,setRunning]=useState(false);
 const runMenu=async()=>{const before=settings;setRunning(true);setPanel(true);try{setReport(await runMenuRegression());}finally{setSettings(before);setRunning(false);}};
 const run=async()=>{
  setRunning(true);const results:string[]=[],wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
  const input=document.querySelector('textarea')!,root=document.querySelector<HTMLElement>('.typewriter-assembly')!;
  const update=(text:string,type:string)=>{input.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:type}));Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,text);input.setSelectionRange(text.length,text.length);input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:type}));};
  for(const fontSize of [15,19,25]){setSettings(s=>({...s,fontSize}));await wait(400);
   for(const prefix of ['','Let’s\njn','ABCDEFG '.repeat(8),'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nlast ']){
    update(prefix,'insertFromPaste');await wait(350);let contactError=1000,max=0;
    const measure=()=>{const head=document.querySelector('.type-hammer b')!.getBoundingClientRect(),point=document.querySelector('.print-point')!.getBoundingClientRect();max=Math.max(max,parseFloat(root.style.getPropertyValue('--hammer-extension'))||0);contactError=Math.min(contactError,Math.abs(head.bottom-(point.top+point.height/2)));};
    const observer=new MutationObserver(measure);observer.observe(root,{attributes:true,attributeFilter:['style']});update(prefix+'X','insertText');await wait(600);observer.disconnect();
    const r=document.querySelector('.rail')!.getBoundingClientRect(),c=document.querySelector('.capsule')!.getBoundingClientRect();const alignment=Math.abs(r.top+r.height/2-c.top-c.height/2);
    const expectedTravel=parseFloat(root.style.getPropertyValue('--impact-travel'));
    const point=document.querySelector('.print-point')!.getBoundingClientRect(),baseline=document.querySelector('.baseline-marker')!.getBoundingClientRect().bottom;
    const style=getComputedStyle(document.querySelector('.ink-text')!),ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`${style.fontSize} ${style.fontFamily}`;const period=ctx.measureText('.');
    const periodError=Math.abs(point.top+point.height/2-(baseline-(period.actualBoundingBoxAscent-period.actualBoundingBoxDescent)/2));
    results.push(`${alignment<.1&&contactError<.15&&Math.abs(max-expectedTravel)<.15&&periodError<.15?'PASS':'FAIL'} ${fontSize}px / ${prefix.length} chars: center Δ ${alignment.toFixed(3)}px, contact Δ ${contactError.toFixed(3)}px, period Δ ${periodError.toFixed(3)}px`);
   }
  }
  setSettings(s=>({...s,fontSize:19}));setNote(createNote('Let’s\njn'));setReport(results.join('\n'));setRunning(false);
 };
 return <div className={`app ${settings.night?'night':''}`}>
  <header className="app-header"><span className="brand-word">inklune</span><span style={{fontSize:12}}>材质与定位</span><button onClick={()=>setPanel(!panel)}>书写设置</button></header>
  <div className="fixture-controls"><button onClick={()=>setSettings(s=>({...s,night:!s.night}))}>日夜切换</button><button onClick={()=>setSettings(s=>({...s,curved:!s.curved}))}>纸张曲面</button><button onClick={()=>setNote(createNote('Let’s\njn'))}>短句</button><button onClick={()=>setNote(createNote('给美好留一点空间。\n\n慢下来。\n找到你的下一句话。'))}>中文参考</button><button onClick={()=>setNote(createNote())}>空白纸页</button><button disabled={running} onClick={run}>运行定位检查</button><button disabled={running} onClick={runMenu}>运行菜单检查</button><button onClick={()=>void exportPaper(note,settings)}>导出图片</button></div>
  <div className="fixture-kits">{kits.map(k=><button key={k.id} aria-pressed={settings.kit===k.id} onClick={()=>setSettings(s=>({...s,kit:k.id,rail:k.rail,endcap:k.endcap,decoration:k.decoration,paper:k.seasonal?'parchment':'cotton'}))}>{k.title}</button>)}</div>
  <main className="desk"><Editor note={note} settings={settings} onChange={(text,traces,inkSeeds)=>setNote(n=>({...n,text,traces,inkSeeds}))} onNight={()=>setSettings(s=>({...s,night:!s.night}))} onLightChange={patch=>setSettings(s=>({...s,...patch}))} onBookmark={()=>{}} focusVersion={0} onFocusChange={()=>{}}/></main>
  <pre className="fixture-report">{report}</pre>
  {panel&&<SettingsPanel settings={settings} onUpdate={patch=>setSettings(s=>({...s,...patch}))} onClose={()=>setPanel(false)}/>}
  <style>{`.fixture-controls,.fixture-kits{display:flex;gap:15px;flex-wrap:wrap;justify-content:center;margin:20px auto;max-width:900px;padding:0 20px;font-size:11px}.fixture-kits button[aria-pressed=true]{text-decoration:underline;text-underline-offset:5px}.fixture-report{color:#ccc;white-space:pre-wrap;margin:20px;font-size:12px}.fixture-controls button:disabled{opacity:.4}`}</style>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture/></React.StrictMode>);
