import {Archive,Moon,Plus,Sun} from 'lucide-react';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Note} from './storage';
import {titleOf} from './storage';
import CrispWordmark from './CrispWordmark';
import './start.css';
let introPlayed=false;
type Props={note?:Note;night:boolean;visible:boolean;returning:boolean;blocked:boolean;onContinue:()=>void;onNew:()=>void;onLibrary:()=>void;onTheme:()=>void;onAbout:()=>void;busy?:boolean};
export default function StartPage({note,night,visible,returning,blocked,onContinue,onNew,onLibrary,onTheme,onAbout,busy=false}:Props){
 const[animate]=useState(()=>!introPlayed);
 const logoVisible=visible&&!returning;
 const[logoPlayback,setLogoPlayback]=useState(0),wasVisible=useRef(logoVisible);
 // Prepare the logo while the writer is open, but leave its pixels at time
 // zero. Return replays the prepared writing without mounting/rasterizing it.
 useLayoutEffect(()=>{if(logoVisible&&!wasVisible.current)setLogoPlayback(value=>value+1);wasVisible.current=logoVisible;},[logoVisible]);
 useEffect(()=>{introPlayed=true;},[]);
 const hasDraft=Boolean(note?.text.trim());
 return <section className={`start-page start-quiet-design ${night?'start-night':''} ${animate?'start-arriving':''}`} data-design="quiet" inert={blocked} aria-label="Inklune 开始页">
  <header className="start-header"><p className="start-greeting">留一点时间给自己。</p><nav aria-label="开始页工具">
   <button className="start-library" onClick={onLibrary} aria-label="信盒"><Archive size={18} strokeWidth={1.4}/><span>信盒</span></button>
   <button className="start-theme" onClick={onTheme} aria-label={night?'切换日间模式':'切换夜间模式'}>{night?<Sun size={20} strokeWidth={1.4}/>:<Moon size={20} strokeWidth={1.4}/>}</button>
  </nav></header>
  <main className="start-main"><h1 className="start-logo" aria-label="inklune"><CrispWordmark animate={animate||logoPlayback>0} playing={logoVisible} tone={night?'night':'day'}/></h1>
   <div className="start-copy"><p className="start-intro">给思绪，一点留白。</p><div className="start-actions"><button id="start-continue" className="start-primary" onClick={onContinue} aria-busy={busy}>{hasDraft?'继续书写':'开始书写'}</button>{hasDraft&&<button className="start-new" onClick={onNew} aria-label="另起一页"><Plus size={17} strokeWidth={1.4}/><span>另起一页</span></button>}</div>
    {hasDraft&&note&&<div className="start-recent"><span>上次写到</span><p title={titleOf(note)}>{titleOf(note)}</p></div>}
   </div></main>
  <footer className="start-footer"><p>文字留在此处，也随你远行。</p><button onClick={onAbout}>关于 Inklune</button></footer>
 </section>;
}
