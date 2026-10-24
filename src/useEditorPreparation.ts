import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {Note,Settings} from './storage';
import {editorPreparationKey} from './startExperience';
import {paperSkins} from './skins';
import wear from './ink-wear.png';
import {loadWritingFonts} from './writingFonts';
import {decodeImage} from './imageResources';
export default function useEditorPreparation(root:RefObject<HTMLDivElement|null>,note:Note,settings:Settings,onReady?:(key:string)=>void){
 const key=editorPreparationKey(note,settings);
 const resourceRequest=useRef<{key:string;promise:Promise<unknown>}|null>(null);
 useEffect(()=>{
  if(!onReady||!root.current)return;const el=root.current;
  let disposed=false,resources=false,published=false,frame=0;
  const expectedModel=JSON.stringify([settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night]);
  const check=()=>{
   if(disposed||published||!resources)return;
   const machine=el.querySelector<HTMLCanvasElement>('.mechanism-canvas'),roll=el.querySelector<HTMLCanvasElement>('.paper-roll-canvas'),paper=el.querySelector<HTMLElement>('.paper');
   const mechanismReady=(machine?.dataset.renderModel===expectedModel&&el.classList.contains('has-3d'))||el.dataset.mechanismFallback==='true';
   const paperReady=(roll?.dataset.stockReady==='true'&&!!roll.dataset.draws)||roll?.dataset.renderFallback==='true';
   if(!paper?.clientWidth||!mechanismReady||!paperReady)return;
   // Wait for the prepared canvases to pass a browser paint boundary.
   if(frame)return;frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{frame=0;if(disposed)return;published=true;el.dataset.prepared=key;onReady(key);});});
  };
  const observer=new MutationObserver(check);observer.observe(el,{subtree:true,attributes:true,attributeFilter:['class','data-render-model','data-stock-ready','data-draws','data-mechanism-fallback','data-render-fallback']});
  const resourceKey=JSON.stringify([note.id,settings.paper,settings.fontSize,settings.chineseFont,settings.englishFont]);
  if(resourceRequest.current?.key!==resourceKey){
   const mirror=el.querySelector<HTMLElement>('.ink-text')!,font=getComputedStyle(mirror);
   resourceRequest.current={key:resourceKey,promise:Promise.allSettled([loadWritingFonts(settings,parseFloat(font.fontSize),note.text),decodeImage(paperSkins[settings.paper].url),decodeImage(wear)])};
   el.dataset.resourceLoads=String(Number(el.dataset.resourceLoads||0)+1);
  }
  void resourceRequest.current.promise.then(()=>{if(disposed)return;resources=true;check();});
  return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);};
 },[root,key,onReady,settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night,settings.paper,settings.chineseFont,settings.englishFont]);
}
