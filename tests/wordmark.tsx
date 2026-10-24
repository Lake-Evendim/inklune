import {createRoot} from 'react-dom/client';
import Wordmark,{wordmarkTiming} from '../src/Wordmark';
import '../src/brand.css';
const shift=wordmarkTiming.bodyStart-120;
const times=[0,110,220,230,450,850,1350,1900,2150,2400];
const svgNow=()=>document.querySelector('svg')!;
function seek(t:number){
 for(const a of svgNow().getAnimations({subtree:true})){a.pause();a.currentTime=t;}
 document.querySelector('#time')!.textContent=String(t);
 const stage=document.querySelector<HTMLElement>('#stage')!;
 delete stage.dataset.frame;
 // Screenshot controls wait for the compositor to render the sought frame.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{stage.dataset.frame=String(t);}));
}
async function raster(mode:'full'|'final'|'current',letter?:number){
 const live=svgNow(),svg=live.cloneNode(true) as SVGSVGElement;
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1040');svg.setAttribute('height','284');svg.classList.remove('is-writing');svg.style.color='#26332f';svg.querySelector('.wordmark-finish')?.remove();
 const pens=[...live.querySelectorAll<SVGElement>('.wordmark-pen')],dots=[...live.querySelectorAll<SVGElement>('.wordmark-dot')];
 for(const [i,el]of [...svg.querySelectorAll<SVGElement>('.wordmark-pen')].entries()){el.style.animation='none';el.style.opacity=mode==='current'?getComputedStyle(pens[i]).opacity:'1';el.style.strokeDasharray=mode==='current'?getComputedStyle(pens[i]).strokeDasharray:'none';el.style.strokeDashoffset=mode==='current'?getComputedStyle(pens[i]).strokeDashoffset:'0';}
 for(const [i,el]of [...svg.querySelectorAll<SVGElement>('.wordmark-dot')].entries()){
  const actual=getComputedStyle(dots[i]);el.style.animation='none';el.style.opacity=mode==='current'?actual.opacity:'1';el.style.strokeWidth=mode==='current'?actual.strokeWidth:'36';el.style.strokeDasharray=mode==='current'?actual.strokeDasharray:'none';el.style.strokeDashoffset=mode==='current'?actual.strokeDashoffset:'0';
 }
 if(mode==='full')for(const el of svg.querySelectorAll('.wordmark-ink'))el.removeAttribute('mask');
 if(letter!==undefined)for(const [i,el]of [...svg.querySelectorAll('.wordmark-ink')].entries())if(i!==letter)el.remove();
 const image=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1040;canvas.height=284;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);URL.revokeObjectURL(url);return ctx.getImageData(0,0,1040,284).data;
}
function components(data:Uint8ClampedArray,missing?:Uint8ClampedArray){
 const width=1040,height=284,field=new Uint8Array(width*height),queue=new Int32Array(width*height),groups:{area:number,x:number,y:number,right:number,bottom:number}[]=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=y*width+x;field[at]=missing?+(missing[at*4+3]>240&&data[at*4+3]<230):+(data[at*4+3]>128&&!(x>40&&x<90&&y>70&&y<120));}
 for(let at=0;at<field.length;at++)if(field[at]){let head=0,tail=0;queue[tail++]=at;field[at]=0;let minX=width,minY=height,maxX=0,maxY=0;
  while(head<tail){const k=queue[head++],x=k%width,y=Math.floor(k/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&nx<width&&ny>=0&&ny<height){const next=ny*width+nx;if(field[next]){field[next]=0;queue[tail++]=next;}}}
  groups.push({area:tail,x:minX,y:minY,right:maxX,bottom:maxY});
 }
 return groups.sort((a,b)=>b.area-a.area);
}
async function coverage(){const full=await raster('full'),mask=await raster('final');let total=0,missing=0;for(let i=3;i<full.length;i+=4)if(full[i]>240){total++;if(mask[i]<230)missing++;}const ratio=1-missing/total;document.querySelector('#coverage')!.textContent=JSON.stringify({ratio,total,missing,pass:ratio>.995,regions:components(mask,full)});}
async function frameChecks(){
 const samples=[];
 for(let t=0;t<=wordmarkTiming.duration+20;t+=20){seek(t);const pixels=await raster('current'),groups=components(pixels).filter(g=>g.area>=8);samples.push({time:t,groups});}
 seek(wordmarkTiming.dot);const dotFrame=await raster('current'),dot=dotFrame[(94*1040+66)*4+3],dotFirst=dot>240&&components(dotFrame).every(g=>g.area<8);
 const faults=samples.filter(s=>s.groups.length>1);document.querySelector<HTMLElement>('#frames')!.textContent=JSON.stringify({pass:dotFirst&&faults.length===0,dotFirst,samples:samples.length,faults});document.querySelector<HTMLElement>('#frames')!.dataset.complete='true';seek(2400);
}
async function iChecks(){
 const edges=[];
 for(let t=140;t<=210;t+=2){
  seek(t+shift);const pixels=await raster('current'),right:number[]=[];
  for(let y=130;y<270;y++){let xRight=-1;for(let x=10;x<105;x++)if(pixels[(y*1040+x)*4+3]>128)xRight=x;if(xRight>=0)right.push(xRight);}
  const peak=right.indexOf(Math.max(...right));let maxJump=0;
  // Ignore the last four rows where a naturally rounded nib terminates.
  for(let i=peak;i<right.length-4;i++)maxJump=Math.max(maxJump,right[i]-right[i+1]);
  edges.push({time:t+shift,maxJump});
 }
 const progress=[];let previous=-1;
 for(let t=236;t<=278;t+=2){seek(t+shift);const pixels=await raster('current');let area=0;for(let y=130;y<270;y++)for(let x=10;x<105;x++)area+=+(pixels[(y*1040+x)*4+3]>128);progress.push({time:t+shift,area,growth:previous<0?null:area-previous});previous=area;}
 const spikes=edges.filter(e=>e.maxJump>3),plateaus=progress.filter(p=>p.growth!==null&&p.growth<=0);
 document.querySelector('#i-checks')!.textContent=JSON.stringify({pass:spikes.length===0&&plateaus.length===0,samples:edges.length+progress.length,spikes,plateaus,progress});seek(290+shift);
}
async function globalChecks(){
 const starts=[120,290,620,1030,1360,1620,1950].map(t=>t+shift),ends=[290,620,1030,1360,1620,1950,2200].map(t=>t+shift);
 const full=await raster('full'),final=await raster('final');
 const speeds=[...svgNow().querySelectorAll<SVGPathElement>('.wordmark-pen')].map(el=>({delay:parseFloat(el.style.getPropertyValue('--pen-delay')),time:parseFloat(el.style.getPropertyValue('--pen-time')),length:el.getTotalLength()}));
 const sampleTimes=new Set(Array.from({length:Math.floor((wordmarkTiming.duration+20)/5)+1},(_,i)=>i*5));
 // Exact dash boundaries need their own checks: normal frame steps can miss
 // a rounded dash repeating at the remote endpoint at a stroke's first instant.
 for(const p of speeds)for(const delta of [-.1,0,.1,1])sampleTimes.add(p.delay+delta);
 const faults:{time:number,kind:string,pixels:number}[]=[],completed=[];
 let previous:Uint8ClampedArray|undefined,samples=0,maxLost=0;
 // Five millisecond samples detect transient gaps and backward changes in ink.
 for(const t of [...sampleTimes].sort((a,b)=>a-b)){
  seek(t);const pixels=await raster('current');samples++;
  const groups=components(pixels).filter(g=>g.area>=8);
  if(groups.length>1)faults.push({time:t,kind:'disconnected ink',pixels:groups[1].area});
  let lost=0,outside=0;
  for(let i=3;i<pixels.length;i+=4){if(previous&&previous[i]>240&&pixels[i]<230)lost++;if(pixels[i]>128&&full[i]===0)outside++;}
  maxLost=Math.max(maxLost,lost);
  // A moving round cap can change one antialiased edge pixel. A larger loss
  // is a regression; preserve the raw maximum in the report.
  if(lost>1)faults.push({time:t,kind:'ink disappeared',pixels:lost});
  if(outside>0)faults.push({time:t,kind:'outside Borel outline',pixels:outside});
  previous=pixels;
 }
 for(let letter=0;letter<7;letter++){
  seek(starts[letter]-1);const future=await raster('current',letter);let early=0;
  for(let y=120;y<284;y++)for(let x=0;x<1040;x++)early+=+(future[(y*1040+x)*4+3]>128);
  if(early)faults.push({time:starts[letter]-1,kind:`letter ${letter} appeared early`,pixels:early});
  seek(ends[letter]);const atEnd=await raster('current',letter),expected=await raster('final',letter);let missing=0;
  for(let i=3;i<atEnd.length;i+=4)if(expected[i]>240&&atEnd[i]<230)missing++;
  completed.push({letter,time:ends[letter],missing});
  if(missing)faults.push({time:ends[letter],kind:`letter ${letter} incomplete`,pixels:missing});
 }
 // Regions belong to the later branch at the n/u reversals.
 const probes=[{name:'n first crest',from:380,to:452,x:195,y:140,w:16,h:35},{name:'n second crest',from:1710,to:1782,x:809,y:140,w:16,h:35},{name:'u first return',from:1400,to:1433,x:604,y:190,w:12,h:30},{name:'u second return',from:1510,to:1561,x:689,y:185,w:15,h:37}];
 for(const p of probes)for(let t=p.from;t<p.to;t+=2){seek(t+shift);const pixels=await raster('current');let early=0;for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++)early+=+(pixels[(y*1040+x)*4+3]>128);if(early)faults.push({time:t+shift,kind:p.name,pixels:early});}
 let total=0,missing=0;for(let i=3;i<full.length;i+=4)if(full[i]>240){total++;if(final[i]<230)missing++;}
 document.querySelector('#global-checks')!.textContent=JSON.stringify({pass:faults.length===0,samples,maxLost,completed,faults,speeds,coverage:{ratio:1-missing/total,total,missing,regions:components(final,full)}});
 document.querySelector<HTMLElement>('#global-checks')!.dataset.complete='true';seek(2400);
}
async function dotChecks(){
 const samples=[];let previous=0;
 for(let t=0;t<=wordmarkTiming.dot+5;t+=5){
  seek(t);const data=await raster('current');let area=0,xSum=0,ySum=0,opaque=0,body=0;
  for(let y=70;y<270;y++)for(let x=10;x<105;x++){
   const alpha=data[(y*1040+x)*4+3];
   if(y>=120){body+=+(alpha>128);continue;}
   if(alpha>128){area++;xSum+=x;ySum+=y;}opaque+=+(alpha>240);
  }
  const dot=getComputedStyle(svgNow().querySelector('.wordmark-dot')!);
  samples.push({time:t,area,growth:area-previous,x:area?xSum/area:0,y:area?ySum/area:0,opaque,opacity:dot.opacity,body});previous=area;
 }
 seek(wordmarkTiming.dot);const data=await raster('current'),expected=await raster('full');let total=0,missing=0;
 for(let y=70;y<120;y++)for(let x=40;x<90;x++){const at=(y*1040+x)*4+3;if(expected[at]>240){total++;missing+=+(data[at]<230);}}
 const first=samples[0],last=samples.at(-1)!;
 const pass=samples.every(s=>s.body===0&&s.opacity==='1'&&s.growth>=0)&&last.x<first.x-2&&last.y>first.y+5&&missing===0;
 document.querySelector('#dot-checks')!.textContent=JSON.stringify({pass,samples,completeCoverage:{total,missing},centroidTravel:{x:last.x-first.x,y:last.y-first.y}});
 document.querySelector<HTMLElement>('#dot-checks')!.dataset.complete='true';seek(wordmarkTiming.bodyStart);
}
createRoot(document.querySelector('#root')!).render(<><style>{`body{margin:0;background:#fbfbf8;color:#26332f;font:14px system-ui}nav{display:flex;flex-wrap:wrap;gap:5px;margin:20px 20px}button,select{min-height:44px;padding:0 10px}#stage{position:absolute;top:150px;left:40px;width:1040px;height:284px}#status{position:absolute;top:470px;left:40px;max-width:1150px;overflow-wrap:anywhere}#frames,#global-checks{max-height:100px;overflow:auto}`}</style><nav>{times.map(t=><button key={t} onClick={()=>seek(t)}>{t} ms</button>)}<select aria-label="检查时间" onChange={e=>seek(Number(e.target.value))}>{Array.from({length:481},(_,i)=><option key={i} value={i*5}>{i*5} ms</option>)}</select><button onClick={coverage}>检查笔画覆盖</button><button onClick={frameChecks}>运行逐帧检查</button><button onClick={iChecks}>检查 i 的上下行</button><button onClick={globalChecks}>检查全词转向</button><button onClick={dotChecks}>检查点写笔势</button></nav><div id="stage"><Wordmark animate/></div><div id="status"><p>时间 <span id="time">自然播放</span></p><p id="coverage"/><p id="frames"/><p id="i-checks"/><p id="global-checks"/><p id="dot-checks"/></div></>);
