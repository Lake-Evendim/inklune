// Isolated visual comparison; edits never persist to personal notes.
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
import App from '../src/App';
import {createNote,defaults} from '../src/storage';
import {glyphsFor,hashInk} from '../src/typing';

const params=new URLSearchParams(location.search);
const note=createNote('清晰字迹 · 细节与质感\n重叠、颗粒、缩放、对比。\nInk detail 0123456789\nAa Mm Ww 你好世界');
note.inkSeeds=glyphsFor(note.text).map((_,i)=>hashInk(`clarity-${i}`));
const SampleApp=React.memo(App);
const workspace={notes:[note],activeId:note.id,settings:{...defaults,paper:'lined' as const,ink:83,brightness:165,spread:129,beam:149,night:!params.has('day'),sound:false}};
function Probe(){
 const [mode,setMode]=React.useState('current');
 return <div className={`text-clarity-${mode}`}>
  <style>{`
   .text-clarity-native .paper-roll-canvas,.text-clarity-clean .paper-roll-canvas,.text-clarity-solid .paper-roll-canvas{visibility:hidden!important}
   .text-clarity-native .paper-texture,.text-clarity-clean .paper-texture,.text-clarity-solid .paper-texture{display:block!important;opacity:1!important}
   .text-clarity-native .paper-illumination,.text-clarity-clean .paper-illumination,.text-clarity-solid .paper-illumination{visibility:visible!important}
   .text-clarity-native .paper-surface,.text-clarity-clean .paper-surface,.text-clarity-solid .paper-surface{--paper-feed:inherit}
   .text-clarity-native .paper-content,.text-clarity-clean .paper-content,.text-clarity-solid .paper-content{transform:translateY(calc(-1 * var(--paper-feed)))!important}
   .text-clarity-native .ink-text,.text-clarity-clean .ink-text{opacity:var(--ink-opacity)!important}
   .text-clarity-solid .ink-text{opacity:1!important}
   .text-clarity-clean .ink-glyph,.text-clarity-solid .ink-glyph{mask-image:none!important;opacity:1!important;top:0!important}
  `}</style>
  <SampleApp persist={false} initialScreen="writer" initialWorkspace={workspace}/>
  {!params.has('preview')&&<aside aria-label="字迹诊断" style={{position:'fixed',zIndex:1000,top:76,left:18,width:220,padding:12,background:'#202020',border:'1px solid #666',color:'#eee',font:'12px system-ui',display:'grid',gap:10}}>
   <output>诊断模式：{mode}</output>
   {[['current','A 当前纸页文字'],['native','B 原生文字保留缺墨'],['clean','C 原生文字去除缺墨'],['solid','D 原生文字纯色实墨']].map(([value,label])=><button key={value} style={{padding:8,border:'1px solid #666'}} onClick={()=>setMode(value)}>{label}</button>)}
   <small>同一字体、字号、纸张与光源；不保存数据。</small>
  </aside>}
 </div>;
}
const appRoot=createRoot(document.querySelector('#root')!);appRoot.render(<Probe/>);
if(import.meta.hot)import.meta.hot.dispose(()=>appRoot.unmount());
