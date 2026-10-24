import {projectPaper,unprojectPaper} from '../src/paperGeometry';
const frame=document.querySelector<HTMLIFrameElement>('iframe')!,report=document.querySelector('#report')!;
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function open(width:number,paper:string,night=false){
 frame.style.width=`${width}px`;frame.style.height=width<760?'640px':'720px';
 await new Promise<void>(resolve=>{frame.onload=()=>resolve();frame.src=`/tests/room.html?paper=${paper}&capture&max&cold${night?'&night':''}`;});
 const doc=frame.contentDocument!;await doc.fonts.ready;
 for(let i=0;i<200;i++){if(doc.querySelector('.paper.has-paper-roll')&&doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!.dataset.stockReady==='true')break;await delay(50);}
 await delay(700);return doc;
}
const capture=(canvas:HTMLCanvasElement)=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d')!;ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
document.querySelector('#cotton')!.addEventListener('click',()=>void open(1280,'cotton',true));
document.querySelector('#blue')!.addEventListener('click',()=>void open(360,'blue',true));
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const rows:string[]=[];
 const check=(label:string,pass:boolean)=>{rows.push(`${pass?'PASS':'FAIL'} ${label}`);report.textContent=rows.join('\n');};
 try{for(const width of [1280,360])for(const stock of ['cotton','blue']){
  const doc=await open(width,stock),paper=doc.querySelector<HTMLElement>('.paper')!,canvas=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,light=doc.querySelector<HTMLCanvasElement>('.paper-illumination')!;
  const label=`${width}px ${stock}`,day=capture(canvas),note=doc.querySelector('textarea')!.value,shape={width:paper.clientWidth,height:canvas.clientHeight,band:Number(paper.dataset.rollBand),amount:1},ratio=canvas.width/paper.clientWidth;
  check(`${label}: upper return enabled`,paper.classList.contains('has-paper-roll')&&Number(paper.dataset.roll)===1);
  const bounds=(y:number)=>{let a=-1,b=-1;for(let x=0;x<canvas.width;x++){if(day[(y*canvas.width+x)*4+3]>32){if(a<0)a=x;b=x;}}return [a,b];};
  let shapeError=0;for(let y=2;y<shape.band-2;y+=3){const p=projectPaper(unprojectPaper(y,shape),shape),[a,b]=bounds(Math.floor(y*ratio));shapeError=Math.max(shapeError,Math.abs(a/ratio-shape.width*(1-p.scale)/2),Math.abs((b+1)/ratio-shape.width*(1+p.scale)/2));}
  check(`${label}: GPU upper edge matches inverse (${shapeError.toFixed(2)}px)`,shapeError<1.5);
  const bottom=bounds(canvas.height-4),middle=bounds(Math.floor(canvas.height*.5));
  check(`${label}: bottom remains full width`,bottom[0]===middle[0]&&bottom[1]===middle[1]);
  doc.querySelector<HTMLButtonElement>('[aria-label="切换夜间模式"]')!.click();await delay(650);
  for(let i=0;i<100&&canvas.dataset.night!=='1.0000';i++)await delay(25);
  const night=capture(canvas),field=light.getContext('2d')!.getImageData(0,0,light.width,light.height).data;
  let samples=0,maxError=0,unlitExcess=0;
  for(let y=2;y<shape.band*ratio;y++){for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4,alpha=day[i+3];if(alpha<100||alpha>240)continue;samples++;
   for(let c=0;c<3;c++){const expected=day[i+c]*field[i+c]/255;maxError=Math.max(maxError,Math.abs(night[i+c]-expected));unlitExcess=Math.max(unlitExcess,day[i+c]-expected);}
  }}
  check(`${label}: lit antialiased rim (${samples} pixels, error ${maxError.toFixed(2)}/255)`,samples>20&&maxError<7);
  check(`${label}: detects old unlit rim (${unlitExcess.toFixed(1)} excess)`,unlitExcess>30);
  check(`${label}: lighting has no separate clip`,light.style.clipPath===''&&getComputedStyle(light).visibility==='hidden');
  check(`${label}: night transition completes`,canvas.dataset.night==='1.0000');
  check(`${label}: text preserved`,doc.querySelector('textarea')!.value===note);
 }}catch(error){check(String(error),false);}finally{button.disabled=false;}
});
