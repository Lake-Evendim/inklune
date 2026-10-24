import {createRoot} from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '../src/styles.css';import '../src/motion.css';import '../src/lighting.css';import '../src/materials.css';import '../src/typing.css';import '../src/ui.css';import '../src/brand.css';
import App from '../src/App';
import {createNote,defaults,downloadFile} from '../src/storage';
import {glyphsFor,hashInk} from '../src/typing';
import {exportPaper} from '../src/export';
const params=new URLSearchParams(location.search),mode=params.get('mode')||'after';
const sample='田由甲申中 字迹清晰\nHHHH 1111 mmmm\n纸上有墨，笔画有骨。';
const note=createNote(params.has('long')?Array.from({length:50},(_,i)=>`${i+1}. ${sample.replaceAll('\n',' ')}`).join('\n'):sample,'2026-10-24T12:00:00Z');note.id='ink-audit';note.inkSeeds=glyphsFor(note.text).map((_,i)=>hashInk(`audit-${i}`));
const workspace={notes:[note],activeId:note.id,settings:{...defaults,paper:'lined' as const,ink:Number(params.get('ink')||83),fontSize:Number(params.get('size')||19),chineseFont:(params.get('font')||'serif') as 'serif',englishFont:'courier' as const,brightness:165,spread:129,beam:149,night:params.has('night'),curved:!params.has('flat'),sound:false}};
function capture(){const canvas=document.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,rect=canvas.getBoundingClientRect();downloadFile(`audit-${mode}${params.has('night')?'-night':''}.json`,JSON.stringify({mode,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],rect:rect.toJSON(),canvas:[canvas.width,canvas.height],font:getComputedStyle(document.querySelector('.ink-text')!).fontFamily,size:getComputedStyle(document.querySelector('.ink-text')!).fontSize,probe:(window as any).__auditProbe?.()}),'application/json');}
createRoot(document.querySelector('#root')!).render(<><App persist={false} initialScreen="writer" initialWorkspace={workspace}/><aside className="audit-tools"><span>固定纸墨 · {mode}</span><button onClick={capture}>导出诊断像素</button><button onClick={()=>exportPaper(note,workspace.settings)}>导出纸张 PNG</button>{['before','after'].map(id=><a href={`?${new URLSearchParams({...Object.fromEntries(params),mode:id,capture:''})}`} key={id}>{id==='before'?'本轮修改前':'本轮修改后'}</a>)}</aside><style>{`${params.has('no-scroll')?'html,body,.desk{overflow:hidden!important}':''}.audit-tools{position:fixed;left:10px;bottom:10px;z-index:1000;display:flex;gap:10px;padding:10px;background:#fff;color:#222;font:12px system-ui}.audit-tools a{color:inherit}@media(max-width:760px){.audit-tools{font-size:10px;gap:4px;padding:4px;bottom:55px}.audit-tools span,.audit-tools a{display:none}}`}</style></>);

