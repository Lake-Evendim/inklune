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
const p=new URLSearchParams(location.search);
const note=createNote(p.has('new')?'':'给未来的自己\n\n愿你依然有慢下来的勇气，\n也有重新开始的自由。\n\n从一封信开始。');
if(p.has('long'))note.title='把今天所有细小而美好的事情写成一封很长很长的信，留给未来的自己，也留给此刻最想念的那个人。'.repeat(3);
if(p.has('persist')){
 const root=document.querySelector<HTMLElement>('#root')!,samples:string[]=[];
 const observe=new MutationObserver(()=>{const page=root.querySelector<HTMLElement>('.start-page');if(page){samples.push(page.dataset.design!);root.dataset.firstDesigns=JSON.stringify(samples);}});observe.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-design']});
 let running=true;const sample=()=>{const page=root.querySelector<HTMLElement>('.start-page');if(page){samples.push(page.dataset.design!);root.dataset.firstDesigns=JSON.stringify(samples);}if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);setTimeout(()=>{running=false;observe.disconnect();root.dataset.sampleComplete='true';},700);
}
createRoot(document.querySelector('#root')!).render(<React.StrictMode><App persist={p.has('persist')} initialScreen="start" initialWorkspace={p.has('persist')?undefined:{notes:p.has('empty')?[]:[note],activeId:note.id,settings:{...defaults,sound:false,night:p.has('night'),paper:'lined'}}}/></React.StrictMode>);
