import {createRoot} from 'react-dom/client';
import '@fontsource/special-elite';import '@fontsource/courier-prime/400.css';import '@fontsource/dm-sans/400.css';import '@fontsource/dm-sans/500.css';
import '../src/styles.css';import '../src/motion.css';import '../src/lighting.css';import '../src/materials.css';import '../src/typing.css';import '../src/ui.css';import '../src/brand.css';
import App from '../src/App';import {createNote,defaults} from '../src/storage';
const note=createNote();
const params=new URLSearchParams(location.search);
createRoot(document.querySelector('#root')!).render(<App persist={false} initialScreen="writer" initialWorkspace={{notes:[note],activeId:note.id,settings:{...defaults,night:params.has('night'),sound:false}}}/>);
const readings:Record<string,number|boolean>[]=[];
(window as any).__returnReadings=readings;
document.addEventListener('click',event=>{
 if(!(event.target as Element).closest('[aria-label="回到开始页"]'))return;
 const at=performance.now(),record:Record<string,number|boolean>={clicked:at,logoAlreadyPrepared:!!document.querySelector('.wordmark-hd[data-source-width]')};readings.push(record);
 const sample=()=>{
  const elapsed=performance.now()-at,root=document.querySelector<HTMLElement>('.app'),logo=document.querySelector<HTMLCanvasElement>('.wordmark-hd');
  if(root?.dataset.roomPhase==='moving'&&record.roomAnimationStartMs===undefined){record.roomAnimationStartMs=elapsed;const a=document.querySelector('.room-writer-layer')?.getAnimations()[0];record.roomDurationMs=Number(a?.effect?.getTiming().duration)||0;}
  if(logo&&record.logoMountedMs===undefined)record.logoMountedMs=elapsed;
  if(root?.dataset.screen==='start'&&root.dataset.roomPhase==='idle'&&record.homeReadyMs===undefined)record.homeReadyMs=elapsed;
  if(Number(logo?.dataset.time)>0&&record.logoInkStartMs===undefined)record.logoInkStartMs=elapsed;
  document.body.dataset.returnReadings=JSON.stringify(readings);
  if(elapsed<4000&&record.logoInkStartMs===undefined)requestAnimationFrame(sample);
 };
 requestAnimationFrame(sample);
},true);
