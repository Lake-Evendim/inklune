import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import './styles.css';
import './motion.css';
import './lighting.css';
import './materials.css';
import './typing.css';
import './ui.css';
import './brand.css';
import App from './App';
import {createNote,defaults} from './storage';
import {findNightMaterial} from './nightMaterials';
import { findFlowerDesign, findSliderDesign } from './controlDesigns';
// Old comparison bookmarks now open the real workspace with its saved theme.
const url=new URL(location.href);
const comparisonKeys=['experiences','designs','experience-preview','preview-start','material','transition'];
if(comparisonKeys.some(key=>url.searchParams.has(key))){
 for(const key of [...comparisonKeys,'night'])url.searchParams.delete(key);
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
const root=ReactDOM.createRoot(document.getElementById('root')!);
if(url.searchParams.has('control-preview')){
 document.title='Inklune — 花朵书签与滑杆预览';
 void import('./ControlPreview').then(({default:ControlPreview})=>root.render(<React.StrictMode><ControlPreview/></React.StrictMode>));
}else if(url.searchParams.has('control-sample')){
 const note=createNote('Dear little moments,\n\n今晚，让思绪慢慢落在纸上。\n留住窗边的风，也留住此刻的安静。\n\n给未来的自己，\n一点留白。');note.bookmark='#b898a6';
 const second=createNote('窗边的风\n\n给今天留下一点温柔。');
 const removed=createNote('一封未寄出的信\n\n旧日的片刻，仍可以找回来。');removed.deleted=true;removed.deletedAt=removed.updated;
 const panel=url.searchParams.get('panel');
 root.render(<React.StrictMode><App persist={false} initialScreen="writer" initialPanel={panel==='settings'||panel==='library'?panel:null} flowerDesign={findFlowerDesign(url.searchParams.get('flower'))?.id} sliderDesign={findSliderDesign(url.searchParams.get('slider'))?.id} initialWorkspace={{notes:[note,second,removed],activeId:note.id,settings:{...defaults,night:url.searchParams.get('theme')!=='day',curved:url.searchParams.get('shape')!=='flat',sound:false}}}/></React.StrictMode>);
}else if(url.searchParams.has('night-preview')){
 document.title='Inklune — 夜间背景预览';
 void import('./NightPreview').then(({default:NightPreview})=>root.render(<React.StrictMode><NightPreview/></React.StrictMode>));
}else if(url.searchParams.has('night-sample')){
 const note=createNote('Dear little moments,\n\n今晚，让思绪慢慢落在纸上。\n留住窗边的风，也留住此刻的安静。\n\n给未来的自己，\n一点留白。');
 const texture=findNightMaterial(url.searchParams.get('night-sample'));
 root.render(<React.StrictMode><App persist={false} initialScreen={url.searchParams.get('view')==='writer'?'writer':'start'} nightMaterial={texture.id} initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,night:true,sound:false}}}/></React.StrictMode>);
}else root.render(<React.StrictMode><App /></React.StrictMode>);
