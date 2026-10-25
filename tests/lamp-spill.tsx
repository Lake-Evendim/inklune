import {useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import usePaperLighting from '../src/usePaperLighting';
import {defaults} from '../src/storage';
import type {Settings} from '../src/storage';
import type {LampFrame} from '../src/lampIgnition';
import {lampAperture} from '../src/lamp';

function Fixture(){
 const width=new URLSearchParams(location.search).has('phone')?320:780;
 const root=useRef<HTMLDivElement>(null),paper=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const draw=useRef<(()=>void)|null>(null),drawPaper=useRef<(()=>void)|null>(null);
 const ignition=useRef<LampFrame>({sceneNight:true,amount:0,projection:0,phase:'off'});
 const [settings,setSettings]=useState<Settings>({...defaults,night:true,sound:false});
 const [report,setReport]=useState(''),[running,setRunning]=useState(false);
 usePaperLighting({root,paper,canvas,draw,drawPaper},settings,ignition);
 const run=async()=>{
  setRunning(true);
  const results:Record<string,unknown>[]=[];
  const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  for(const kit of ['classic','basalt'] as const){
   for(const patch of [{brightness:150,beam:120,spread:112},{brightness:200,beam:40,spread:160},{brightness:200,beam:200,spread:160}]){
    // Commit the new field before sampling; animation frames alone do not
    // guarantee that a concurrent React update has reached its layout effect.
    flushSync(()=>setSettings({...defaults,night:true,sound:false,kit,...patch}));await nextFrame();
    const c=canvas.current!,ctx=c.getContext('2d')!,ratio=c.width/width,scale=width/430;
    const origin=width*.7+lampAperture.origin*scale;
    const capture=(amount:number,projection:number)=>{
     ignition.current={sceneNight:true,amount,projection,phase:projection===1?'on':'projecting'};draw.current?.();
     return ctx.getImageData(0,0,c.width,c.height).data;
    };
    const off=capture(0,0),lens=capture(1,0),on=capture(1,1);
    const sample=(pixels:Uint8ClampedArray,x:number,y:number)=>{
     const i=(Math.min(c.height-1,Math.max(0,Math.round(y*ratio)))*c.width+Math.min(c.width-1,Math.max(0,Math.round(x*ratio))))*4;
     return [pixels[i],pixels[i+1],pixels[i+2]];
    };
    const delta=(a:number[],b:number[])=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
    let lensDelta=0;for(let i=0;i<off.length;i+=4)for(let ch=0;ch<3;ch++)lensDelta=Math.max(lensDelta,Math.abs(lens[i+ch]-off[i+ch]));
    const belowOff=sample(off,width*.8,origin+52*scale),belowOn=sample(on,width*.8,origin+52*scale);
    const litDelta=delta(sample(off,width*.8,origin-50*scale),sample(on,width*.8,origin-50*scale));
    const leftOff=sample(off,width*.1,origin-55*scale),leftOn=sample(on,width*.1,origin-55*scale);
    const leftCheck=patch.beam===120;
    results.push({kit,...patch,width,lensDelta,belowOff,belowOn,belowDelta:delta(belowOff,belowOn),leftOff,leftOn,leftDelta:leftCheck?delta(leftOff,leftOn):null,litDelta,
     pass:lensDelta===0&&delta(belowOff,belowOn)===0&&(!leftCheck||delta(leftOff,leftOn)===0)&&litDelta>20});
   }
  }
  const data={pass:results.every(r=>r.pass),results};
  document.body.dataset.lightAudit=JSON.stringify(data);setReport(JSON.stringify(data,null,2));setRunning(false);
 };
 return <><button disabled={running} onClick={run}>运行灯光范围检查</button><div ref={root} style={{'--carriage-x':`${width*.8}px`,'--carriage-y':`${width*.7}px`} as CSSProperties}><div ref={paper} style={{width,height:width*1.3,position:'relative'}}><canvas ref={canvas} style={{width:'100%',height:'100%'}}/></div></div><pre>{report}</pre></>;
}
createRoot(document.querySelector('#root')!).render(<Fixture/>);
