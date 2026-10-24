import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {writingExperience} from './startExperience';
import {insetClip} from './transitionGeometry';
import {roomMotionFrame} from './roomMotion';
type Screen='start'|'writer';
const motionProperties=['opacity','clipPath','left','top','width','height','borderRadius'] as const;
const snapshot=(el:Element):Keyframe=>{const css=getComputedStyle(el);return Object.fromEntries(motionProperties.map(key=>[key,css[key]]));};
export default function useRoomTransition(initial:Screen,prepared:boolean,persist:boolean){
 const [screen,setScreen]=useState(initial),[target,setTarget]=useState<Screen|null>(null),[phase,setPhase]=useState<'idle'|'waiting'|'moving'>('idle');
 const start=useRef<HTMLDivElement>(null),writer=useRef<HTMLDivElement>(null),state=useRef({screen,target,phase});state.current={screen,target,phase};
 const surface=useRef<HTMLDivElement>(null),label=useRef<HTMLSpanElement>(null);
 const motion=useRef<{animation:Animation;from:number;enter:boolean;duration:number}|null>(null),resume=useRef<number|null>(null);
 const interrupted=useRef(new Map<Element,Keyframe>());
 const reset=useCallback((next:Screen)=>{interrupted.current.clear();resume.current=null;setScreen(next);setTarget(null);setPhase('idle');},[]);
 const navigate=useCallback((next:Screen,historyUpdate=true)=>{
  if(next===state.current.screen&&state.current.phase==='idle')return;
  if(next===state.current.target&&state.current.phase!=='idle')return;
  interrupted.current.clear();
  if(state.current.phase==='moving'){
   for(const el of [start.current,writer.current,surface.current,label.current])if(el)interrupted.current.set(el,snapshot(el));
   const active=motion.current;if(active)resume.current=roomMotionFrame(Number(active.animation.currentTime??0)/active.duration,active.enter,active.from).progress;
  }
  if(persist&&historyUpdate){const hash=next==='writer'?'#write':'';if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);}
  if(next===state.current.screen&&state.current.phase==='waiting'){reset(next);return;}
  setTarget(next);setPhase(next==='writer'&&(state.current.phase!=='moving'||!prepared)?'waiting':'moving');
 },[persist,reset,prepared]);
 useEffect(()=>{if(phase==='waiting'&&prepared)setPhase('moving');},[phase,prepared]);
 useEffect(()=>{if(!persist)return;const restore=()=>navigate(location.hash==='#write'?'writer':'start',false);window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);return()=>{window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};},[persist,navigate]);
 useLayoutEffect(()=>{
  if(phase!=='moving'||!target||!start.current||!writer.current||!surface.current||!label.current)return;
  let cancelled=false;const animations:Animation[]=[];
  const finish=()=>{if(!cancelled){setScreen(target);setTarget(null);setPhase('idle');}};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!start.current.animate){finish();return;}
  const enter=target==='writer';
  const fromProgress=resume.current??(enter?0:1);resume.current=null;
  const fullDuration=enter?writingExperience.duration:writingExperience.returnDuration;
  const duration=Math.max(240,fullDuration*Math.abs((enter?1:0)-fromProgress));
  const options:KeyframeAnimationOptions={duration,fill:'both'};
  const animate=(el:HTMLElement,frames:Keyframe[],easing='linear')=>{
   const current=interrupted.current.get(el);
   // Each property has its own clock; an interrupted clip must not overwrite
   // the opacity animation (or vice versa).
   if(current)for(const key of motionProperties)if(frames.some(f=>key in f)&&current[key]!=null)frames[0]={...frames[0],[key]:current[key]};
   animations.push(el.animate(frames,{...options,easing}));
  };
  const s=start.current,w=writer.current,buttonEl=s.querySelector<HTMLButtonElement>('.start-primary')!,button=buttonEl.getBoundingClientRect(),bounds=w.getBoundingClientRect(),buttonCSS=getComputedStyle(buttonEl),veil=surface.current,text=label.current;
  const origin={left:button.left-bounds.left,top:button.top-bounds.top,width:button.width,height:button.height};
  // Use a native rounded box outside the room clip so the endpoint has the
  // same rasterized edge as the button, without overlapping the real button.
  veil.style.backgroundColor=buttonCSS.backgroundColor;
  Object.assign(text.style,{width:`${origin.width}px`,height:`${origin.height}px`,font:buttonCSS.font,color:buttonCSS.color,letterSpacing:buttonCSS.letterSpacing});
  text.textContent=buttonEl.textContent;
  const frames=Array.from({length:61},(_,i)=>{
   const frame=roomMotionFrame(i/60,enter,fromProgress),p=frame.progress;
   return {offset:i/60,...frame,box:{left:origin.left*(1-p),top:origin.top*(1-p),width:origin.width+(bounds.width-origin.width)*p,height:origin.height+(bounds.height-origin.height)*p},radius:(parseFloat(buttonCSS.borderRadius)+24*Math.sin(Math.PI*p))*(1-p)};
  });
  animate(w,frames.map(({offset,box,radius})=>({offset,clipPath:insetClip(box,bounds.width,bounds.height,radius)})));
  motion.current={animation:animations[0],from:fromProgress,enter,duration};
  // The opaque button surface owns the first pixels. Reveal the room only
  // as that surface fades, rather than blending another clipped edge below it.
  animate(w,frames.map(({offset,surface})=>({offset,opacity:1-surface})));
  // Keep the start room steady underneath the aperture rather than fading
  // the whole scene on a separate clock.
  animate(s,[{opacity:1},{opacity:1}]);
  animate(veil,frames.map(({offset,surface:opacity,box,radius})=>({offset,opacity,left:`${box.left}px`,top:`${box.top}px`,width:`${box.width}px`,height:`${box.height}px`,borderRadius:`${radius}px`})));
  animate(text,frames.map(({offset,label:opacity,box})=>({offset,opacity,left:`${origin.left-box.left}px`,top:`${origin.top-box.top}px`})));
  interrupted.current.clear();void Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(finish);
  const skip=()=>animations.forEach(a=>a.finish()),preference=matchMedia('(prefers-reduced-motion: reduce)');preference.addEventListener('change',skip);window.addEventListener('resize',skip);
  return()=>{cancelled=true;motion.current=null;animations.forEach(a=>a.cancel());preference.removeEventListener('change',skip);window.removeEventListener('resize',skip);};
 },[phase,target]);
 return {screen,target,phase,navigate,start,writer,surface,label};
}
