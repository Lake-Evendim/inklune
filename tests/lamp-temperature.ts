const frame=document.querySelector<HTMLIFrameElement>('iframe')!,report=document.querySelector('#report')!;
const previews=[...document.querySelectorAll<HTMLButtonElement>('#cold,#warm')];
const wait=(ms=180)=>new Promise(r=>setTimeout(r,ms));
const doc=()=>frame.contentDocument!;
async function controls(){
 for(let i=0;i<100&&!doc().querySelector('.has-3d');i++)await wait(50);
 if(!doc().querySelector('[aria-label="灯光冷暖"]')){
  doc().querySelector<HTMLButtonElement>('[aria-label="打开书写设置"]')!.click();await wait(40);
  doc().querySelector<HTMLButtonElement>('#tab-light')!.click();await wait(40);
 }
}
async function set(label:string,value:number){
 await controls();const input=doc().querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
 Object.getOwnPropertyDescriptor(frame.contentWindow!.HTMLInputElement.prototype,'value')!.set!.call(input,String(value));
 input.dispatchEvent(new Event('input',{bubbles:true}));await wait();
}
async function preview(warmth:number){await set('灯光强度',150);await set('灯光冷暖',warmth);doc().querySelector<HTMLButtonElement>('[aria-label="关闭设置"]')!.click();await wait();}
document.querySelector('#cold')!.addEventListener('click',()=>void preview(0));
document.querySelector('#warm')!.addEventListener('click',()=>void preview(100));
const read=()=>{
 const root=doc().querySelector<HTMLElement>('.typewriter-assembly')!,canvas=doc().querySelector<HTMLCanvasElement>('.mechanism-canvas')!,s=canvas.clientWidth/430,ratio=canvas.width/canvas.clientWidth;
 const x=parseFloat(root.style.getPropertyValue('--carriage-x')),y=parseFloat(root.style.getPropertyValue('--carriage-y'))-10.5*s;
 const scratch=document.createElement('canvas');scratch.width=canvas.width;scratch.height=canvas.height;const ctx=scratch.getContext('2d')!;ctx.drawImage(canvas,0,0);const pixels=ctx.getImageData(0,0,scratch.width,scratch.height).data;
 const mean=(left:number,top:number,right:number,bottom:number)=>{const sum=[0,0,0];let n=0;
  for(let row=Math.ceil((y+top*s)*ratio);row<(y+bottom*s)*ratio;row++)for(let col=Math.ceil((x+left*s)*ratio);col<(x+right*s)*ratio;col++){const at=(row*canvas.width+col)*4;for(let c=0;c<3;c++)sum[c]+=pixels[at+c];n++;}
  return sum.map(v=>v/Math.max(1,n));
 };
 // The slit is thinner than two logical pixels. Search its immediate rim
 // instead of rounding one fixed sample onto the enamel beneath the lens.
 const profile=Array.from({length:8},(_,i)=>mean(-6,-2+i*.5,6,-2+(i+1)*.5));
 const lens=profile.reduce((a,b)=>a.reduce((s,v)=>s+v,0)>b.reduce((s,v)=>s+v,0)?a:b);
 return {lens,profile,shell:mean(10,24,16,29),frames:canvas.dataset.frames,canvas};
};
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;previews.forEach(b=>b.disabled=true);const results:string[]=[];
 const check=(name:string,pass:boolean)=>{results.push(`${pass?'PASS':'FAIL'} ${name}`);report.textContent=results.join('\n');};
 try{
  await controls();
  const initial=doc().querySelector('textarea')!.value,canvas=doc().querySelector('.mechanism-canvas');
  for(const brightness of [20,150,200]){
   await set('灯光强度',brightness);const samples=[];
   for(const warmth of [0,50,100]){await set('灯光冷暖',warmth);samples.push(read());}
   const [cold,neutral,warm]=samples,hue=(m:typeof cold)=>m.lens[0]-m.lens[2],detail=samples.map(m=>m.lens.map(v=>v.toFixed(1)).join('/')).join(' → ');
   check(`${brightness}% visible cold-to-warm lamp RGB: ${detail}`,hue(cold)<-20&&hue(warm)>55);
   check(`${brightness}% intermediate temperature is continuous`,hue(cold)<hue(neutral)&&hue(neutral)<hue(warm));
   const change=Math.max(...warm.shell.map((v,i)=>Math.abs(v-cold.shell[i])));
   check(`${brightness}% shell colour is stable (${change.toFixed(2)}/255)`,change<1);
   check(`${brightness}% updates existing WebGL scene`,cold.canvas===warm.canvas&&doc().querySelector('.mechanism-canvas')===canvas&&cold.frames!==warm.frames);
  }
  check('temperature control preserves note',doc().querySelector('textarea')!.value===initial);
  await preview(100);
 }catch(error){check(String(error),false);}finally{button.disabled=false;previews.forEach(b=>b.disabled=false);}
});
