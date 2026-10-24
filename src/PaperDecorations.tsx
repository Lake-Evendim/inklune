import type { Decoration } from './skins';
export default function PaperDecorations({decoration,night}:{decoration:Decoration;night:boolean}) {
 if(decoration==='none')return null;
 if(decoration==='garden')return <svg className="garden-decoration" viewBox="0 0 430 130" aria-hidden="true">
  <defs><linearGradient id="petal" x2=".7" y2="1"><stop stopColor="#eadacc"/><stop offset=".5" stopColor="#c0a094"/><stop offset="1" stopColor="#8e7773"/></linearGradient><linearGradient id="leaf" x2="1" y2=".5"><stop stopColor="#a9b190"/><stop offset="1" stopColor="#637956"/></linearGradient></defs>
  {[{x:27,y:123,a:-12},{x:389,y:121,a:13},{x:404,y:126,a:-16}].map(({x,y,a},i)=><g key={i} transform={`translate(${x} ${y}) rotate(${a})`}><path d="M0 0Q-7-30 2-68" fill="none" stroke="#72845f" strokeWidth="1.6"/><path d="M-1-24Q-28-43-19-24Q-8-15-1-24M0-38Q26-61 18-37Q6-27 0-38" fill="url(#leaf)" stroke="#72835d" strokeWidth=".4"/>{[0,60,120,180,240,300].map(t=><ellipse key={t} cx="2" cy="-79" rx="6" ry="11" transform={`rotate(${t} 2 -69)`} fill="url(#petal)" stroke="#ecddd1" strokeWidth=".5"/>)}<circle cx="2" cy="-69" r="5" fill="#bfa865"/><circle cx="1" cy="-70" r="2" fill="#dec482"/></g>)}
 </svg>;
 return <svg className={`cobweb-decoration ${night?'lit':''}`} viewBox="0 0 430 110" aria-hidden="true">
  {[false,true].map(right=><g key={String(right)} transform={right?'translate(430 0) scale(-1 1)':''} fill="none" stroke="currentColor" strokeWidth=".6"><path d="M10 0v49M10 0l16 40M10 0l33 25M10 0l46 10"/>{[12,24,36,48].map(n=><path key={n} d={`M10 ${n}Q${11+n*.14} ${n*.7} ${10+n*.32} ${n*.81}Q${10+n*.48} ${n*.53} ${10+n*.67} ${n*.50}Q${10+n*.82} ${n*.12} ${10+n*.93} ${n*.20}`}/>)}</g>)}
  <g className="paper-spider"><path d="M47 0v53" fill="none" stroke="currentColor" strokeWidth=".45"/><ellipse cx="47" cy="58" rx="3.2" ry="4" fill="currentColor"/><circle cx="47" cy="53" r="2" fill="currentColor"/><path d="m45 53-6-4m6 7-7-1m7 4-6 4m11-10 6-4m-6 7 7-1m-7 4 6 4" fill="none" stroke="currentColor" strokeWidth=".8" strokeLinecap="round"/></g>
 </svg>;
}
