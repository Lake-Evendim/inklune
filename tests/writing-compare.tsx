import React,{useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '../src/styles.css';import '../src/motion.css';import '../src/lighting.css';import '../src/materials.css';import '../src/typing.css';import '../src/ui.css';
import App from '../src/App';
import {createNote,defaults,downloadFile} from '../src/storage';
import {paperInkColor} from '../src/inkRendering';
import {exportPaper} from '../src/export';
import {glyphsFor,hashInk} from '../src/typing';
const params=new URLSearchParams(location.search),mode=params.get('mode')||'current';
const sample='田由甲申中 字迹清晰\nHHHH 1111 mmmm';
const note=createNote(params.has('long')?Array.from({length:35},(_,i)=>`${i+1}. ${sample.replace('\n',' ')}`).join('\n'):sample);note.id='writing-comparison';note.inkSeeds=glyphsFor(note.text).map((_,i)=>hashInk(`pipeline-${i}`));
const workspace={notes:[note],activeId:note.id,settings:{...defaults,paper:'lined' as const,ink:83,chineseFont:'serif' as const,englishFont:'courier' as const,brightness:165,spread:129,beam:149,night:params.has('night'),sound:false}};
const choices=[['normal','普通输入框'],['matched','普通输入 · 同墨色'],['before','上一版 · 透明缺墨'],['dark-only','仅加深墨色'],['restored','本版 · 实墨颗粒'],['fallback','DOM 回退检查']];
function capture(){const canvas=document.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,rect=canvas.getBoundingClientRect();downloadFile(`writing-${mode}${params.has('night')?'-night':''}.json`,JSON.stringify({mode,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],rect:rect.toJSON(),canvas:[canvas.width,canvas.height],font:getComputedStyle(document.querySelector('.ink-text')!).fontFamily,size:getComputedStyle(document.querySelector('.ink-text')!).fontSize,data:canvas.toDataURL('image/png'),probe:(window as any).__inkProbe?.()}),'application/json');}
function Comparison(){
 const [target,setTarget]=useState<Element|null>(null);
 useLayoutEffect(()=>{setTarget(document.querySelector('.writing-area'));},[]);
 return <><style>{`
 .comparison-nav{position:fixed;left:12px;top:78px;width:210px;z-index:1000;background:#252525;color:#eee;padding:12px;display:grid;gap:9px;font:12px system-ui}
 .comparison-nav a{color:inherit;padding:8px;border:1px solid #666;text-decoration:none}
 @media(max-width:760px){.comparison-nav{display:none}}
 .normal-writing{position:absolute;inset:0 auto auto 0;width:100%;height:180px;resize:none;z-index:20;background:#fff;border:0;padding:0;margin:0;color:#080808;caret-color:#080808;font-family:var(--writing-font-family);font-size:max(16px,calc(var(--type-size)*var(--mechanism-scale,1)));font-weight:400;line-height:1.02;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;}
 `}</style><App persist={false} initialScreen="writer" initialWorkspace={workspace}/>{target&&['normal','matched'].includes(mode)&&createPortal(<textarea className="normal-writing" aria-label="普通输入对照" defaultValue={sample} spellCheck={false} style={{color:mode==='matched'?paperInkColor(83):'#080808',background:mode==='matched'?'transparent':'#fff'}}/>,target)}<aside className="comparison-nav"><span>同字体、同字号的真实输入对照</span>{choices.map(([id,label])=><a key={id} href={`?capture&mode=${id}${params.has('night')?'&night':''}`}>{label}</a>)}<button onClick={capture}>导出渲染像素</button><button onClick={()=>exportPaper(note,workspace.settings)}>导出纸张 PNG</button><small>隔离稿件，不保存个人内容。</small></aside></>;
}
const root=createRoot(document.querySelector('#root')!);root.render(<Comparison/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
