import {paperReturnLayout,projectPaper} from '../src/paperGeometry';
const frame=document.querySelector<HTMLIFrameElement>('iframe')!,report=document.querySelector('#report')!;
const wait=(ms=180)=>new Promise(r=>setTimeout(r,ms));
async function open(width:number,fontSize=19,height=width<760?640:720){
 frame.style.width=`${width}px`;frame.style.height=`${height}px`;
 await new Promise<void>(resolve=>{frame.onload=()=>resolve();frame.src='/tests/room.html?long&paper=lined&capture';});
 const doc=frame.contentDocument!;await doc.fonts.ready;
 for(let i=0;i<100&&!doc.querySelector('.paper.has-paper-roll');i++)await wait(50);
 doc.querySelector<HTMLButtonElement>('[aria-label="打开书写设置"]')!.click();await wait(40);
 doc.querySelector<HTMLButtonElement>('#tab-ink')!.click();await wait(40);
 const input=doc.querySelector<HTMLInputElement>('[aria-label="字号"]')!;
 Object.getOwnPropertyDescriptor(frame.contentWindow!.HTMLInputElement.prototype,'value')!.set!.call(input,String(fontSize));
 input.dispatchEvent(new Event('input',{bubbles:true}));await wait();
 doc.querySelector<HTMLButtonElement>('[aria-label="关闭设置"]')!.click();await wait(500);
 return doc;
}
for(const [id,width] of [['desktop',1280],['phone',360]] as const)document.querySelector(`#${id}`)!.addEventListener('click',()=>void open(width));
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const previews=[...document.querySelectorAll<HTMLButtonElement>('#desktop,#phone')];previews.forEach(b=>b.disabled=true);
 const rows:string[]=[];const check=(label:string,pass:boolean)=>{rows.push(`${pass?'PASS':'FAIL'} ${label}`);report.textContent=rows.join('\n');};
 try{for(const [width,height,fontSize] of [[1280,720,15],[1280,720,25],[360,640,15],[360,640,25],[1280,480,25],[360,568,25]]){
  const doc=await open(width,fontSize,height),win=frame.contentWindow!,paper=doc.querySelector<HTMLElement>('.paper')!,desk=doc.querySelector<HTMLElement>('.desk')!,root=doc.querySelector<HTMLElement>('.typewriter-assembly')!,mirror=doc.querySelector<HTMLElement>('.ink-text')!,canvas=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,input=doc.querySelector('textarea')!;
  const label=`${width}×${height}px / ${fontSize}px`,original=input.value,from=desk.scrollTop;
  const shape={width:paper.clientWidth,height:root.clientHeight,band:Number(paper.dataset.rollBand),amount:1};
  const layout=paperReturnLayout(shape.width,shape.height),firstTop=mirror.getBoundingClientRect().top-paper.getBoundingClientRect().top;
  check(`${label}: first printing line has roll clearance`,mirror.getBoundingClientRect().top-paper.getBoundingClientRect().top>shape.band);
  check(`${label}: renderer uses the shared extended return (${shape.band.toFixed(2)}px)`,Math.abs(shape.band-layout.band)<.01);
  check(`${label}: first row keeps its flat clearance (${(firstTop-shape.band).toFixed(2)}px)`,firstTop-shape.band>=layout.clearance-.01);
  for(const target of [.12,.42,.78,1.25]){
   desk.scrollTop=from;await wait(150);
   // Sample the painted sheet, not a native scroll offset whose scroll event
   // may still be queued while fonts or a development rebuild are busy.
   for(let i=0;i<80&&Math.abs(Number(canvas.dataset.feed)-desk.scrollTop)>.01;i++)await wait(25);
   if(Math.abs(Number(canvas.dataset.feed)-desk.scrollTop)>.01)throw Error(`${label}: feed failed to settle before picking`);
   const box=paper.getBoundingClientRect(),area=mirror.getBoundingClientRect(),style=getComputedStyle(mirror),leading=parseFloat(mirror.parentElement!.style.getPropertyValue('--rule-step')),size=parseFloat(style.fontSize),feed=desk.scrollTop;
   const baseline=mirror.querySelector('.rule-baseline-marker')!.getBoundingClientRect().bottom-box.top;
   const candidates=[...mirror.querySelectorAll<HTMLElement>('.ink-glyph[data-start]')].filter(g=>g.textContent==='P').map(g=>{
    const b=g.getBoundingClientRect(),row=Math.round((b.top-area.top)/leading),s=baseline+row*leading-size*.35-feed;
    return {g,b,row,s,p:projectPaper(s,shape)};
   }).filter(g=>g.p.y>4&&g.s<shape.band+leading*2);
   const hit=candidates.sort((a,b)=>Math.abs(a.p.y-shape.band*target)-Math.abs(b.p.y-shape.band*target))[0];
   if(!hit)throw Error(`${label}: no visible glyph for ${target}`);
   const p=projectPaper(hit.s,shape),x=shape.width/2+(hit.b.left-box.left+hit.b.width*.25-shape.width/2)*p.scale,y=p.y;
   const scratch=doc.createElement('canvas');scratch.width=canvas.width;scratch.height=canvas.height;const ctx=scratch.getContext('2d')!;ctx.drawImage(canvas,0,0);
   const ratio=canvas.width/shape.width,data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let dark=0;
   for(let yy=Math.max(0,Math.floor((y-size*.25)*ratio));yy<Math.min(canvas.height,(y+size*.3)*ratio);yy++)for(let xx=Math.floor((x-hit.b.width*.2)*ratio);xx<(x+hit.b.width*.65)*ratio;xx++)if(data[(yy*canvas.width+xx)*4]<190)dark++;
   check(`${label} / ${target}: projected glyph exists in GPU ink (${dark} dark pixels)`,dark>2);
   // Touch goes through the real React canvas pointer handlers, without a
   // synthetic mouse's unavailable native pointer-capture state.
   canvas.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:7,button:0,clientX:box.left+x,clientY:box.top+y}));
   canvas.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:7,button:0,clientX:box.left+x,clientY:box.top+y}));
   check(`${label} / ${target}: canvas hit picks the exact text offset`,input.selectionStart===Number(hit.g.dataset.start));
   await wait(350);for(let i=0;i<40&&root.dataset.motion!=='idle';i++)await wait(30);
   const currentFeed=desk.scrollTop,lineTop=area.top-box.top+hit.row*leading-currentFeed;
   check(`${label} / ${target}: selected row returns to the flat printing belt (${lineTop.toFixed(2)} >= ${shape.band.toFixed(2)})`,lineTop>=shape.band-1);
   const face=doc.createElement('canvas').getContext('2d')!;face.font=`${size}px ${style.fontFamily}`;const period=face.measureText('.');
   const expected=baseline+hit.row*leading-currentFeed-(period.actualBoundingBoxAscent-period.actualBoundingBoxDescent)/2,point=doc.querySelector('.print-point')!.getBoundingClientRect();
   const cursorError=Math.abs(point.top+point.height/2-box.top-expected);
   check(`${label} / ${target}: cursor stays at the selected period height (${cursorError.toFixed(3)}px)`,cursorError<1);
   check(`${label} / ${target}: native feed and ink agree`,Math.abs(Number(canvas.dataset.feed)-currentFeed)<.01&&input.scrollTop===0);
  }
  check(`${label}: picking preserves all note text`,input.value===original);
 }}catch(error){check(String(error),false);}finally{button.disabled=false;previews.forEach(b=>b.disabled=false);}
});
