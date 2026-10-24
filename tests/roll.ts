import {projectPaper,unprojectPaper} from '../src/paperGeometry';
const iframe=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector('#report')!,film=document.querySelector('#film')!;
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const performanceOnly=new URLSearchParams(location.search).has('perf');if(performanceOnly)iframe.src='/tests/room.html?long&paper=lined';
document.querySelector('#phone')!.addEventListener('click',()=>{iframe.style.width='360px';iframe.style.height='640px';});
document.querySelector('#desktop')!.addEventListener('click',()=>{iframe.style.width='1280px';iframe.style.height='720px';});
document.querySelector('#run')!.addEventListener('click',async()=>{
 const doc=iframe.contentDocument!,win=iframe.contentWindow!,desk=doc.querySelector<HTMLElement>('.desk')!,paper=doc.querySelector<HTMLElement>('.paper')!,root=doc.querySelector<HTMLElement>('.typewriter-assembly')!,canvas=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,input=doc.querySelector('textarea')!;
 await doc.fonts.ready;for(let i=0;i<100&&canvas.dataset.stockReady!=='true';i++)await delay(50);await delay(400);film.replaceChildren();const results:string[]=[];
 const check=(name:string,pass:boolean)=>{results.push(`${pass?'PASS':'FAIL'} ${name}`);report.textContent=results.join('\n');};
 check('paper canvas matches its visible viewport',Math.abs(canvas.getBoundingClientRect().height-root.clientHeight)<1);
 check('replaced displacement filter',!doc.querySelector('feDisplacementMap')&&paper.classList.contains('has-paper-roll'));
 const original=input.value,from=desk.scrollTop;check('one native scroll surface',doc.documentElement.scrollHeight===win.innerHeight&&input.scrollTop===0);
 const settled=async()=>{for(let i=0;i<160&&Math.abs(Number(canvas.dataset.feed)-desk.scrollTop)>.01;i++)await delay(25);if(Math.abs(Number(canvas.dataset.feed)-desk.scrollTop)>.01)throw Error('painted feed failed to settle');};
 const output=doc.createElement('canvas');output.width=canvas.width;output.height=canvas.height;const ctx=output.getContext('2d')!;
 const composite=()=>{ctx.fillStyle='#1b1b1b';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(canvas,0,0,output.width,output.height);const m=doc.querySelector<HTMLCanvasElement>('.mechanism-canvas')!;ctx.drawImage(m,0,0,output.width,m.height*output.width/m.width);};
 const capture=(label:string)=>{composite();const f=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=output.toDataURL();caption.textContent=label;f.append(img,caption);film.append(f);};
 const baseline:number[]=[];let baselineLast=0;
 await new Promise<void>(resolve=>{let start=0;const tick=(now:number)=>{if(!start)start=now;if(baselineLast)baseline.push(now-baselineLast);baselineLast=now;if(now-start<800)win.requestAnimationFrame(tick);else resolve();};win.requestAnimationFrame(tick);});
 const idle=baseline.sort((a,b)=>a-b),idleMedian=idle[Math.floor(idle.length/2)],idle95=idle[Math.floor(idle.length*.95)];
 results.push(`INFO idle browser frame baseline: median ${idleMedian.toFixed(1)}ms, p95 ${idle95.toFixed(1)}ms`);
 const counts=[Number(canvas.dataset.draws),Number(canvas.dataset.rasters),Number(canvas.dataset.layouts),Number(doc.querySelector<HTMLCanvasElement>('.mechanism-canvas')!.dataset.frames)];
 const timing:number[]=[];let timingLast=0;
 await new Promise<void>(resolve=>{let start=0;const tick=(now:number)=>{if(!start)start=now;const t=Math.min(1,(now-start)/1800);if(timingLast)timing.push(now-timingLast);timingLast=now;desk.scrollTop=from-260*Math.sin(t*Math.PI);if(t<1)win.requestAnimationFrame(tick);else resolve();};win.requestAnimationFrame(tick);});
 await delay(100);const ordered=timing.sort((a,b)=>a-b),median=ordered[Math.floor(ordered.length/2)],p95=ordered[Math.floor(ordered.length*.95)];
 results.push(`INFO normal scroll work: ${Number(canvas.dataset.draws)-counts[0]} paper paints, ${Number(canvas.dataset.rasters)-counts[1]} raster tiles, ${Number(canvas.dataset.layouts)-counts[2]} layouts, ${Number(doc.querySelector<HTMLCanvasElement>('.mechanism-canvas')!.dataset.frames)-counts[3]} mechanism paints`);
 if(idleMedian>100)results.push(`SKIP scroll performance: browser background throttling (${idleMedian.toFixed(1)}ms idle frames)`);
 else check(`normal scroll: median ${median.toFixed(1)}ms, p95 ${p95.toFixed(1)}ms (${ordered.length} frames)`,median<idleMedian+6&&p95<Math.max(55,idle95+12));
 await settled();
 if(performanceOnly){check('normal scrolling preserves text',input.value===original);check('native and visual feed agree',Math.abs(Number(canvas.dataset.feed)-desk.scrollTop)<.01);return;}
 const stream=canvas.captureStream(60),chunks:BlobPart[]=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
 let samples=0,maxError=0,maxGap=0,last=0,frameTimes:number[]=[],lastY=0,velocityErrors=0;
 const animate=(reverse:boolean)=>new Promise<void>(resolve=>{let start=0,previousFeed=NaN;last=0;const tick=(now:number)=>{
  if(!start)start=now;const actual=parseFloat(canvas.dataset.feed||'0');maxError=Math.max(maxError,Math.abs(actual-desk.scrollTop));samples++;
  if(last){frameTimes.push(now-last);maxGap=Math.max(maxGap,now-last);}last=now;
  const shape={width:paper.clientWidth,height:root.clientHeight,band:Number(paper.dataset.rollBand),amount:Number(paper.dataset.roll)},s=from+shape.band*.8,y=projectPaper(s-actual,shape).y;
  if(Number.isFinite(previousFeed)&&Math.abs(actual-previousFeed)>.01&&Math.sign(y-lastY)===Math.sign(actual-previousFeed))velocityErrors++;previousFeed=actual;lastY=y;
  const t=Math.min(1,(now-start)/2200),ease=t*t*(3-2*t);desk.scrollTop=reverse?from-260+260*ease:from-260*ease;
  if(t<1)win.requestAnimationFrame(tick);else win.requestAnimationFrame(()=>resolve());};win.requestAnimationFrame(tick);});
 capture(`起点 · ${canvas.dataset.feed}px`);const before=ctx.getImageData(0,0,output.width,output.height).data;
 await animate(false);await settled();capture(`进纸终点 · ${canvas.dataset.feed}px`);await animate(true);await settled();capture(`回卷终点 · ${canvas.dataset.feed}px`);
 const after=ctx.getImageData(0,0,output.width,output.height).data;let delta=0;for(let i=0;i<before.length;i++)delta+=Math.abs(before[i]-after[i]);check(`full return pixel difference ${(delta/before.length).toFixed(3)}`,delta/before.length<.5);
 check(`feed is synchronous in ${samples} actual render samples (error ${maxError.toFixed(2)}px)`,maxError<1);
 check('material travels continuously in the scroll direction',velocityErrors===0);
 results.push(`INFO direct canvas recording: median ${frameTimes.sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)]?.toFixed(1)}ms, max ${maxGap.toFixed(1)}ms`);
 check('reverse scroll returns to the same feed',Math.abs(desk.scrollTop-from)<1);
 check('bounded texture tiles',Number(canvas.dataset.tiles)<=6);
 const shape={width:paper.clientWidth,height:root.clientHeight,band:Number(paper.dataset.rollBand),amount:1};let error=0;for(let y=0;y<shape.height;y+=3)error=Math.max(error,Math.abs(projectPaper(unprojectPaper(y,shape),shape).y-y));check('pointer inverse matches curved geometry',error<.0001);
 const click=(selector:string)=>doc.querySelector<HTMLElement>(selector)!.click();
 for(const label of ['平面','弯曲']){
  click('[aria-label="打开书写设置"]');await delay(60);[...doc.querySelectorAll('button')].find(b=>b.textContent===label)!.click();click('[aria-label="关闭设置"]');
  let crestError=0,midpoints=0;const buckets=new Set<number>(),ratio=canvas.width/paper.clientWidth;
  for(let i=0;i<160;i++){
   await delay(25);
   const amount=Number(paper.dataset.roll),bucket=Math.floor(amount*10);
   if(Math.abs(amount-(label==='弯曲'?1:0))<.001)break;
   if(amount<=.02||amount>=.98||buckets.has(bucket))continue;buckets.add(bucket);midpoints++;
   const shape={width:paper.clientWidth,height:root.clientHeight,band:Number(paper.dataset.rollBand),amount},top=projectPaper(unprojectPaper(.5/ratio,shape),shape);
   ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(canvas,0,0);
   const row=ctx.getImageData(0,0,output.width,1).data;let left=-1,right=-1;
   for(let x=0;x<output.width;x++)if(row[x*4+3]>32){if(left<0)left=x;right=x;}
   crestError=Math.max(crestError,Math.abs(left/ratio-shape.width*(1-top.scale)/2),Math.abs((right+1)/ratio-shape.width*(1+top.scale)/2));
  }
  if(midpoints===0&&idleMedian>100)results.push(`SKIP ${label} intermediate frames: browser background throttling`);
  else check(`${label} keeps the curved crest visible in ${midpoints} intermediate frames (GPU error ${crestError.toFixed(2)}px)`,midpoints>0&&crestError<1.5);
  capture(label);check(`${label} reaches its continuous endpoint`,Math.abs(Number(paper.dataset.roll)-(label==='弯曲'?1:0))<.001);
 }
 check('scroll and shape changes preserve all text',input.value===original);check('textarea has no competing scroll',input.scrollTop===0);
 recorder.stop();await new Promise<void>(resolve=>recorder.onstop=()=>resolve());stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'}),a=document.querySelector<HTMLAnchorElement>('#download')!;a.href=URL.createObjectURL(blob);a.download='paper-roll.webm';a.hidden=false;
 const video=document.createElement('video');video.controls=true;video.loop=true;video.src=a.href;video.style.cssText='width:100%;grid-column:1/-1';film.prepend(video);
});
