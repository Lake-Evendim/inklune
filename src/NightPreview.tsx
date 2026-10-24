import {useState} from 'react';
import {ArrowUpRight,Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {findNightMaterial,nightMaterials,nightMaterialUrl} from './nightMaterials';
import type {NightMaterial} from './nightMaterials';
import './night-preview.css';

export default function NightPreview(){
 const params=new URLSearchParams(location.search);
 const [id,setId]=useState<NightMaterial>(findNightMaterial(params.get('texture')).id);
 const [screen,setScreen]=useState<'start'|'writer'>(params.get('view')==='writer'?'writer':'start');
 const selected=findNightMaterial(id),index=nightMaterials.findIndex(m=>m.id===id);
 const sample=`${import.meta.env.BASE_URL}?night-sample=${id}&view=${screen}`;
 const choose=(next:NightMaterial)=>{setId(next);const url=new URL(location.href);url.searchParams.set('texture',next);url.searchParams.set('view',screen);history.replaceState(null,'',url.pathname+url.search);};
 const changeScreen=(next:'start'|'writer')=>{setScreen(next);const url=new URL(location.href);url.searchParams.set('texture',id);url.searchParams.set('view',next);history.replaceState(null,'',url.pathname+url.search);};
 return <main className="night-preview">
  <aside className="night-preview-sidebar">
   <header><a className="night-preview-brand" href={import.meta.env.BASE_URL}>inklune</a><h1>黑色深处的触感</h1><p>更深的黑，更轻的光。让颗粒、绒感与层理慢慢浮现。</p></header>
   <div className="night-material-list" role="group" aria-label="夜间背景材质">
    {nightMaterials.map((m,i)=><div key={m.id} className="night-material-row">{(i===0||m.id==='graphite')&&<p className="night-material-group">{i===0?'四种深黑质感':'原版背景参照'}</p>}<button className="night-material-option" aria-pressed={id===m.id} onClick={()=>choose(m.id)}>
     <span className="night-material-thumb" style={{backgroundColor:m.color,backgroundImage:`url("${nightMaterialUrl(m.id,true)}")`}}/>
     <span className="night-material-label"><strong>{m.title}</strong><small>{m.character}</small></span>{id===m.id&&<Check size={15} strokeWidth={1.6}/>}
    </button></div>)}
   </div>
   <footer><p>正式夜间背景已采用黑绒静夜。这里使用示例稿件预览。</p><a href={import.meta.env.BASE_URL}>返回书写</a></footer>
  </aside>
  <section className="night-preview-stage" aria-label={`${selected.title}预览`}>
   <header className="night-preview-toolbar">
    <div className="night-preview-location"><strong>{selected.title}</strong><span>{selected.description}</span></div>
    <div className="night-preview-actions"><div className="night-preview-views" role="group" aria-label="预览页面"><button aria-pressed={screen==='start'} onClick={()=>changeScreen('start')}>开始页</button><button aria-pressed={screen==='writer'} onClick={()=>changeScreen('writer')}>书写页</button></div><a className="night-preview-full" href={sample} target="_blank" rel="noreferrer">全屏预览<ArrowUpRight size={14}/></a></div>
   </header>
   <div className="night-preview-canvas" style={{background:selected.color}}><iframe key={sample} title={`${selected.title}${screen==='start'?'开始页':'书写页'}`} src={sample}/></div>
   <footer className="night-preview-bottom"><span>四种深黑质感 · 当前参照</span><div><button onClick={()=>choose(nightMaterials[(index+nightMaterials.length-1)%nightMaterials.length].id)} aria-label="上一种材质"><ChevronLeft size={16}/></button><span>{index+1} / {nightMaterials.length}</span><button onClick={()=>choose(nightMaterials[(index+1)%nightMaterials.length].id)} aria-label="下一种材质"><ChevronRight size={16}/></button></div></footer>
  </section>
 </main>;
}
