import React,{useLayoutEffect} from 'react';
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
import {createNote,defaults,downloadFile} from '../src/storage';
import {glyphsFor,hashInk} from '../src/typing';
import {probeVariant,captureInkProbe} from './ink-pipeline-roll';
const params=new URLSearchParams(location.search);
const note=createNote('田由甲申中 字迹清晰\nHHHH 1111 mmmm');note.id='isolated-ink-pipeline';
note.inkSeeds=glyphsFor(note.text).map((_,i)=>hashInk(`pipeline-${i}`));
const workspace={notes:[note],activeId:note.id,settings:{...defaults,paper:'lined' as const,ink:83,chineseFont:'serif' as const,englishFont:'courier' as const,brightness:165,spread:129,beam:149,night:params.has('night'),sound:false}};
const options=[['current','A 当前'],['no-wear','B 去除缺墨'],['solid','C 完全实墨'],['nearest','D 最近邻采样'],['double','E 双倍密度'],['aligned','F 对齐屏幕像素'],['canvas','G 直接2D画布'],['dom','H 原生文字']] as const;
function Probe(){
  useLayoutEffect(()=>{
    if(probeVariant!=='aligned')return;
    let frame=0;const snap=()=>{const root=document.querySelector<HTMLElement>('.typewriter-assembly');if(!root)return;root.style.translate='';const r=root.getBoundingClientRect(),d=devicePixelRatio;root.style.translate=`${(Math.round(r.x*d)-r.x*d)/d}px ${(Math.round(r.y*d)-r.y*d)/d}px`;};
    frame=requestAnimationFrame(snap);window.addEventListener('resize',snap);return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',snap);};
  },[]);
  return <div className={`probe-${probeVariant}`}><style>{`
    .probe-dom .ink-text{opacity:var(--ink-opacity)!important;text-shadow:none!important;color:#080808!important}
    .probe-dom .ink-glyph{mask-image:none!important}
    .probe-dom .paper-content{transform:translateY(calc(-1 * var(--paper-feed)))!important}
    .probe-dom .paper-surface{--paper-feed:inherit}
    .probe-dom .paper-content{z-index:6!important}
    .probe-nav{position:fixed;left:12px;top:78px;width:210px;z-index:1000;background:#202020;color:#eee;padding:12px;display:grid;gap:8px;font:12px system-ui}
    .probe-nav a,.probe-nav button{padding:6px;color:inherit;border:1px solid #666;text-decoration:none}
  `}</style><App persist={false} initialScreen="writer" initialWorkspace={workspace}/><aside className="probe-nav"><span>隔离诊断 · {probeVariant}</span>{options.map(([id,label])=><a key={id} href={`?capture&mode=${id}${params.has('night')?'&night':''}`}>{label}</a>)}<button onClick={()=>{if(captureInkProbe)downloadFile(`ink-pipeline-${probeVariant}${params.has('night')?'-night':''}.json`,JSON.stringify(captureInkProbe()),'application/json');}}>导出无损像素</button><small>固定文字与字体，不保存个人稿件。</small></aside></div>;
}
const root=createRoot(document.querySelector('#root')!);root.render(<Probe/>);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
