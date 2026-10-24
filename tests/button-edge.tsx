// Render the production app with isolated data and pause its real room clocks.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import '../src/brand.css';
import App from '../src/App';
import {createNote,defaults} from '../src/storage';

const roomClocks:Animation[]=[];
const originalAnimate=Element.prototype.animate;
Element.prototype.animate=function(...args:Parameters<Element['animate']>){
 const animation=originalAnimate.apply(this,args);
 if(!new URLSearchParams(location.search).has('live')&&this.matches('.room-layer,.room-transition-surface,.room-transition-label')){
  animation.pause();animation.currentTime=0;roomClocks.push(animation);
 }
 return animation;
};
const note=createNote();
const appRoot=createRoot(document.querySelector('#root')!);
appRoot.render(<React.StrictMode><App persist={false} initialScreen="start" initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,sound:false,night:!new URLSearchParams(location.search).has('day')}}}/></React.StrictMode>);

function Probe(){
 const[time,setTime]=React.useState(0),[buttonOff,setButtonOff]=React.useState(false),[veilOff,setVeilOff]=React.useState(false),[roomOff,setRoomOff]=React.useState(false);
 const seek=(next:number)=>{for(const clock of roomClocks)if(clock.playState==='paused'||clock.playState==='running'){clock.pause();clock.currentTime=next;}setTime(next);};
 return <aside style={{position:'fixed',top:68,left:18,zIndex:1000,maxWidth:390,padding:12,background:'#272727',border:'1px solid #777',color:'#eee',font:'12px system-ui',display:'flex',gap:8,flexWrap:'wrap'}} aria-label="按钮边缘诊断">
  <style>{`${buttonOff?'.start-primary{visibility:hidden!important}':''}${veilOff?'.room-transition-surface{visibility:hidden!important}':''}${roomOff?'.room-writer-layer{visibility:hidden!important}':''}`}</style>
  <output style={{width:'100%'}}>实际过渡：{time} 毫秒</output>
  {[0,1,8,16,24,33,44,55,66,88,110,330,605,616,627,636,644,652,659,660].map(ms=><button key={ms} onClick={()=>seek(ms)} style={{padding:5,border:'1px solid #666',borderRadius:4}}>{ms} 毫秒</button>)}
  <button onClick={()=>{for(const clock of roomClocks)if(clock.playState==='paused')clock.finish();}}>完成过渡</button>
  <label><input type="checkbox" checked={buttonOff} onChange={e=>setButtonOff(e.target.checked)}/>隐藏真实按钮</label>
  <label><input type="checkbox" checked={veilOff} onChange={e=>setVeilOff(e.target.checked)}/>隐藏过渡色层</label>
  <label><input type="checkbox" checked={roomOff} onChange={e=>setRoomOff(e.target.checked)}/>隐藏书写室</label>
 </aside>;
}
const probeRoot=createRoot(document.querySelector('#probe')!);
probeRoot.render(<Probe/>);
if(import.meta.hot)import.meta.hot.dispose(()=>{appRoot.unmount();probeRoot.unmount();Element.prototype.animate=originalAnimate;});
