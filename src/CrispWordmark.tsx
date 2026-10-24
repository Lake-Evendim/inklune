import {useLayoutEffect,useRef,useState} from 'react';
import Wordmark,{borelOutlines,wordmarkTiming} from './Wordmark';
import {downsampleWordmark} from './wordmarkCoverage';
import {buildWordmarkReveal,paintWordmarkReveal} from './wordmarkReveal';
import type {WordmarkReveal} from './wordmarkReveal';

const viewWidth=1040,viewHeight=283.788;
// Measure in the outer page as well: gallery iframes scale their whole document.
// Local SVG and canvas pixels must end up on that page's physical pixel grid.
function screenSpace(el:HTMLElement){
 const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
 let x=rect.x,y=rect.y,width=rect.width,height=rect.height;
 let scaleX=width/parseFloat(style.width),scaleY=height/parseFloat(style.height);
 let win:Window=el.ownerDocument.defaultView!;
 const frames:HTMLElement[]=[],windows:Window[]=[win];
 try{
  while(win!==win.parent){
   const frame=win.frameElement as HTMLElement|null;if(!frame)break;
   const box=frame.getBoundingClientRect(),sx=box.width/frame.offsetWidth,sy=box.height/frame.offsetHeight;
   x=box.x+frame.clientLeft*sx+x*sx;y=box.y+frame.clientTop*sy+y*sy;
   width*=sx;height*=sy;scaleX*=sx;scaleY*=sy;
   frames.push(frame);win=win.parent;windows.push(win);
  }
 }catch{/* Cross-origin embeds retain their own viewport's pixel mapping. */}
 return {x,y,width,height,scaleX,scaleY,dpr:win.devicePixelRatio||1,frames,windows};
}

export default function CrispWordmark({animate=false,playing=true,tone='day'}:{animate?:boolean;playing?:boolean;tone?:'day'|'night'}){
 const root=useRef<HTMLSpanElement>(null),surface=useRef<HTMLSpanElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [settled,setSettled]=useState(!animate),[ready,setReady]=useState(false);
 const clock=useRef<Animation|null>(null),geometry=useRef<{key:string;reveal:WordmarkReveal}|null>(null);
 const live=useRef({animate,playing});live.current={animate,playing};
 const playback=useRef<(()=>void)|null>(null);
 useLayoutEffect(()=>{
  setSettled(!animate);clock.current?.cancel();clock.current=null;
  playback.current?.();
  return()=>{clock.current?.cancel();clock.current=null;};
 },[animate,playing]);
 useLayoutEffect(()=>{
  if(!root.current||!surface.current||!canvas.current||typeof Path2D==='undefined')return;
  const el=root.current,layer=surface.current,c=canvas.current,paths=borelOutlines.map(d=>new Path2D(d));
  const high=document.createElement('canvas'),motion=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,tick=0,lastPaint='',disposed=false;
  let image:ImageData,frame:ImageData,reveal:WordmarkReveal;
  const paint=(time:number)=>{
   const ctx=c.getContext('2d')!;paintWordmarkReveal(ctx,image,reveal,time,frame);c.dataset.time=String(time);
  };
  const complete=()=>{if(disposed)return;paint(wordmarkTiming.duration);setSettled(true);};
  const run=()=>{
   tick=0;if(disposed||!image||!reveal)return;
   if(!live.current.playing){paint(0);return;}
   if(!live.current.animate||motion.matches){complete();return;}
   if(!clock.current){
    // The displayed image has one real animation clock, started only after
    // its coverage and writing schedule are ready. No component timeout.
    clock.current=c.animate([{opacity:1},{opacity:1}],{duration:wordmarkTiming.duration,fill:'forwards'});
   }
   clock.current.onfinish=complete;
   paint(Number(clock.current.currentTime??0));
   if(clock.current.playState==='finished')complete();else tick=requestAnimationFrame(run);
  };
  playback.current=()=>{cancelAnimationFrame(tick);run();};
  const draw=()=>{
   const box=screenSpace(el),{dpr,scaleX,scaleY}=box;
   if(!(box.width>0&&box.height>0&&scaleX>0&&scaleY>0))return;
   const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));
   // A transform preserves the fractional CSS offset through paint. Absolute
   // layout offsets can be rounded before the compositor applies device scale.
   const dx=(Math.round(box.x*dpr)/dpr-box.x)/scaleX,dy=(Math.round(box.y*dpr)/dpr-box.y)/scaleY;
   layer.style.transform=`translate(${dx}px,${dy}px)`;
   layer.style.width=`${width/(dpr*scaleX)}px`;layer.style.height=`${height/(dpr*scaleY)}px`;
   c.dataset.pixelRatio=String(dpr);
   const color=getComputedStyle(el).color,paint=`${width}:${height}:${color}`;
   // Position changes do not reallocate the working canvas. Keep high-DPR
   // work bounded to 16 million pixels, and release it after downsampling.
   if(paint===lastPaint)return;
   const samples=Math.max(1,Math.min(4,Math.floor(Math.sqrt(16_000_000/(width*height)))));
   high.width=width*samples;high.height=height*samples;
   const src=high.getContext('2d',{willReadFrequently:true}),ctx=c.getContext('2d',{willReadFrequently:true});if(!src||!ctx)return;
   const scale=Math.min(high.width/viewWidth,high.height/viewHeight);
   src.setTransform(scale,0,0,scale,(high.width-viewWidth*scale)/2,(high.height-viewHeight*scale)/2);
   src.fillStyle=color;for(const path of paths)src.fill(path);
   c.width=width;c.height=height;downsampleWordmark(high,ctx,samples,color);
   image=ctx.getImageData(0,0,width,height);frame=ctx.createImageData(width,height);
   const key=`${width}:${height}`;
   if(geometry.current?.key!==key)geometry.current={key,reveal:buildWordmarkReveal(layer.querySelector('svg')!,image)};
   reveal=geometry.current.reveal;
   c.dataset.sourceWidth=String(high.width);
   c.dataset.sampling=String(samples);c.dataset.raster='screen-aligned';
   c.dataset.coverage='area-average';c.dataset.renderer='continuous-coverage';c.dataset.unassigned=String(reveal.unassigned);
   high.width=0;high.height=0;lastPaint=paint;setReady(true);
   // A resize or color update preserves the current writing time.
   cancelAnimationFrame(tick);run();
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});};
  draw();
  const observer=new ResizeObserver(schedule);observer.observe(el);
  const space=screenSpace(el),mutations=new MutationObserver(schedule);
  for(const frame of space.frames){observer.observe(frame);if(frame.parentElement)observer.observe(frame.parentElement);mutations.observe(frame,{attributes:true,attributeFilter:['style','class']});}
  for(const win of space.windows){win.addEventListener('resize',schedule);win.addEventListener('scroll',schedule,{passive:true});win.visualViewport?.addEventListener('resize',schedule);}
  // Zoom or moving between monitors can change DPR without changing CSS size.
  let resolution:MediaQueryList;
  const watchDpr=()=>{resolution?.removeEventListener('change',onDpr);resolution=matchMedia(`(resolution: ${devicePixelRatio}dppx)`);resolution.addEventListener('change',onDpr);};
  const onDpr=()=>{watchDpr();schedule();};watchDpr();
  const onMotion=()=>{if(motion.matches)clock.current?.finish();cancelAnimationFrame(tick);run();};motion.addEventListener('change',onMotion);
  return()=>{
   disposed=true;playback.current=null;cancelAnimationFrame(raf);cancelAnimationFrame(tick);if(clock.current)clock.current.onfinish=null;
   observer.disconnect();mutations.disconnect();resolution.removeEventListener('change',onDpr);motion.removeEventListener('change',onMotion);
   for(const win of space.windows){win.removeEventListener('resize',schedule);win.removeEventListener('scroll',schedule);win.visualViewport?.removeEventListener('resize',schedule);}
   high.width=0;high.height=0;
  };
 },[tone]);
 return <span ref={root} className={`crisp-wordmark ${ready?'crisp-rendered':''} ${ready&&settled?'crisp-ready':''}`} data-hd-ready={ready&&settled}>
  <span ref={surface} className="wordmark-surface"><Wordmark animate={animate}/><canvas ref={canvas} className="wordmark-hd" aria-hidden="true"/></span>
 </span>;
}
