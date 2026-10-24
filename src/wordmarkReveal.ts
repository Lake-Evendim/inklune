import {borelOutlines,wordmarkStrokeGroups} from './Wordmark';
import {createVisibleArcClock} from './wordmarkPacing';

export type WordmarkReveal={start:Float32Array;end:Float32Array;pixels:Uint32Array;unassigned:number};

type StrokeTiming={delay:number;time:number;length:number};
type ArcClock=(time:number)=>number;
export function paceVisibleWordmark(start:Float32Array,end:Float32Array,ink:Uint8ClampedArray,strokes:StrokeTiming[],clock?:ArcClock){
 const from=strokes[0].delay,last=strokes.at(-1)!,to=last.delay+last.time,span=to-from,bins=Math.ceil(span),step=span/bins;
 const activity=new Uint8Array(bins),arcPerBin=new Float64Array(bins);
 // Count presence, never area: narrow ink must travel at the same speed as
 // wide ink. Ignore faint antialiasing fringe when detecting covered returns.
 for(let i=0;i<start.length;i++)if(start[i]>=from&&start[i]<to&&ink[i*4+3]>=128)activity[Math.floor((start[i]-from)/step)]=1;
 for(let i=0;i<bins;i++)for(const p of strokes){
  const overlap=Math.max(0,Math.min(from+(i+1)*step,p.delay+p.time)-Math.max(from+i*step,p.delay));
  arcPerBin[i]+=overlap*p.length/p.time;
 }
 const map=clock??createVisibleArcClock(activity,arcPerBin,from,to);
 for(let i=0;i<start.length;i++)if(start[i]>=from&&start[i]<=to){const at=Math.min(to-.35,map(start[i]));start[i]=at;end[i]=Math.min(to,Math.max(at+.35,map(end[i])));}
 return map;
}

function buildRawWordmarkReveal(svg:SVGSVGElement,image:ImageData):WordmarkReveal{
 const {width,height,data:ink}=image,count=width*height,scale=Math.min(width/1040,height/283.788),ox=(width-1040*scale)/2,oy=(height-283.788*scale)/2;
 const start=new Float32Array(count).fill(Infinity),end=new Float32Array(count).fill(Infinity);
 const centres:{x:number;y:number;t:number;finish:number;feather:number;radius:number}[]=[];
 const scratch=document.createElement('canvas');scratch.width=width;scratch.height=height;
 const ctx=scratch.getContext('2d',{willReadFrequently:true})!;
 const field=(d:string,offset=0)=>{
  ctx.resetTransform();ctx.clearRect(0,0,width,height);ctx.setTransform(scale,0,0,scale,ox+offset*scale,oy);ctx.fillStyle='white';ctx.strokeStyle='white';ctx.lineWidth=1/scale;
  const p=new Path2D(d);ctx.fill(p);ctx.stroke(p);
  return ctx.getImageData(0,0,width,height).data;
 };
 const pens=[...svg.querySelectorAll<SVGPathElement>('.wordmark-pen')];let penIndex=0;
 const stamp=(x:number,y:number,radius:number,t:number,finish:number,feather:number,glyph:Uint8ClampedArray,clip?:Uint8ClampedArray)=>{
  centres.push({x,y,radius,t,finish,feather});
  const r=radius+.5,x0=Math.max(0,Math.floor(x-r)),x1=Math.min(width-1,Math.ceil(x+r)),y0=Math.max(0,Math.floor(y-r)),y1=Math.min(height-1,Math.ceil(y+r));
  for(let py=y0;py<=y1;py++)for(let px=x0;px<=x1;px++){
   const at=py*width+px,a=at*4+3;if(!ink[a]||!glyph[a]||(clip&&!clip[a]))continue;
   if((px+.5-x)**2+(py+.5-y)**2>r*r||t>=start[at])continue;
   start[at]=Math.min(t,finish-.35);end[at]=Math.min(finish,start[at]+feather);
  }
 };
 for(let letter=0;letter<wordmarkStrokeGroups.length;letter++){
  const glyph=field(borelOutlines[letter]);
  for(const pen of wordmarkStrokeGroups[letter]){
   const path=pens[penIndex++],length=path.getTotalLength(),steps=Math.max(1,Math.ceil(length*scale*2)),clip=pen.clip?field(pen.clip,pen.offset??0):undefined;
   const speed=length*scale/pen.time,feather=Math.max(.35,1.2/speed),finish=pen.delay+pen.time;
   for(let j=0;j<=steps;j++){
    const progress=j/steps,point=path.getPointAtLength(progress*length),elapsed=progress*pen.time;
    // Grow contact pressure over the first few milliseconds, rather than
    // revealing an entire round brush cap in its first instant.
    const radius=pen.width/2*scale*Math.min(1,elapsed/4);
    stamp((point.x+(pen.offset??0))*scale+ox,point.y*scale+oy,radius,pen.delay+elapsed,finish,feather,glyph,clip);
   }
  }
  if(letter===0){
   const dot=svg.querySelector<SVGPathElement>('.wordmark-dot')!,length=dot.getTotalLength();
   for(let t=0;t<=220;t++){
    const p=t/220;
    const radius=p<.35?3+6*p/.35:p<.75?9+8*(p-.35)/.4:17+(p-.75)/.25;
    const progress=p<.35?.28*p/.35:p<.75?.28+.56*(p-.35)/.4:.84+.16*(p-.75)/.25,point=dot.getPointAtLength(progress*length);
    stamp(point.x*scale+ox,point.y*scale+oy,radius*scale,t,220,8,glyph);
   }
  }
 }
 // Native antialiasing can omit a tiny coverage sample that the 4x ink source
 // contains. Extend that sample's neighbouring writing time, never its color.
 const holes:number[]=[];
 for(let i=0;i<count;i++)if(ink[i*4+3]&&!Number.isFinite(start[i]))holes.push(i);
 for(const at of holes){
  const x=at%width,y=Math.floor(at/width);let nearest=Infinity,owner=-1;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   const px=x+dx,py=y+dy;if(px<0||px>=width||py<0||py>=height)continue;
   const next=py*width+px,d=dx*dx+dy*dy;if(Number.isFinite(start[next])&&d<nearest){nearest=d;owner=next;}
  }
  if(owner>=0){start[at]=start[owner];end[at]=end[owner];}
  else{
   // Very small gallery thumbnails can quantize an ownership ribbon away.
   // Give that ink sample the nearest actual pen's time, rather than failing
   // the entire start page or adding the sample abruptly at completion.
   let nearest=Infinity,pen=centres[0];
   for(const p of centres){const distance=Math.max(0,Math.hypot(p.x-x-.5,p.y-y-.5)-p.radius);if(distance<nearest){nearest=distance;pen=p;}}
   start[at]=Math.min(pen.t,pen.finish-.35);end[at]=Math.min(pen.finish,start[at]+pen.feather);
  }
 }
 let unassigned=0;
 for(const at of holes)if(!Number.isFinite(start[at]))unassigned++;
 const visible:number[]=[];for(let i=0;i<count;i++)if(ink[i*4+3])visible.push(i);
 const pixels=Uint32Array.from(visible);
 scratch.width=0;scratch.height=0;
 return {start,end,pixels,unassigned};
}

let referenceKClock:ArcClock|undefined;
export function buildWordmarkReveal(svg:SVGSVGElement,image:ImageData):WordmarkReveal{
 const reveal=buildRawWordmarkReveal(svg,image),k=wordmarkStrokeGroups[2],offset=wordmarkStrokeGroups.slice(0,2).reduce((n,p)=>n+p.length,0);
 const pens=[...svg.querySelectorAll<SVGPathElement>('.wordmark-pen')].slice(offset,offset+k.length),strokes=k.map((p,i)=>({delay:p.delay,time:p.time,length:pens[i].getTotalLength()}));
 if(!referenceKClock){
  // A small scaled iframe cannot reliably distinguish a thin crossing from a
  // covered return. Derive the shared clock once at the original SVG size;
  // display density changes only ink coverage, never the writing's cadence.
  const reference=document.createElement('canvas');reference.width=1040;reference.height=284;
  const ctx=reference.getContext('2d',{willReadFrequently:true})!;ctx.translate(0,(284-283.788)/2);ctx.fillStyle='white';
  for(const path of borelOutlines)ctx.fill(new Path2D(path));
  const ink=ctx.getImageData(0,0,1040,284),raw=buildRawWordmarkReveal(svg,ink);
  referenceKClock=paceVisibleWordmark(raw.start,raw.end,ink.data,strokes);
  reference.width=0;reference.height=0;
 }
 paceVisibleWordmark(reveal.start,reveal.end,image.data,strokes,referenceKClock);
 return reveal;
}

export function paintWordmarkReveal(ctx:CanvasRenderingContext2D,image:ImageData,reveal:WordmarkReveal,time:number,frame:ImageData){
 const rgba=frame.data,ink=image.data;
 for(const at of reveal.pixels){
  const p=Math.min(1,Math.max(0,(time-reveal.start[at])/(reveal.end[at]-reveal.start[at]))),a=at*4;
  rgba[a]=ink[a];rgba[a+1]=ink[a+1];rgba[a+2]=ink[a+2];rgba[a+3]=Math.round(ink[a+3]*p);
 }
 ctx.putImageData(frame,0,0);
}
