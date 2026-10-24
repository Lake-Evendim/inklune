import {projectPaper,unprojectPaper} from '../src/paperGeometry';
const frame=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const snapshot=document.createElement('canvas'),context=snapshot.getContext('2d',{willReadFrequently:true})!;
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async event=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const lines:string[]=[],cases:unknown[]=[];
 try{
  for(const phone of [false,true])for(const night of [false,true]){
   frame.style.width=phone?'390px':'1280px';frame.style.height=phone?'844px':'720px';
   frame.src=`/tests/room.html?capture&paper=lined${night?'&night':''}`;
   await new Promise<void>(resolve=>frame.addEventListener('load',()=>resolve(),{once:true}));
   const doc=frame.contentDocument!,win=frame.contentWindow!;
   for(let i=0;i<150&&!doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')?.dataset.stockReady?.includes('true');i++)await wait(80);
   await doc.fonts.ready;await wait(100);
   const paper=doc.querySelector<HTMLElement>('.paper')!,canvas=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,text=doc.querySelector('textarea')!.value;
   for(const target of [0,1]){
    doc.querySelector<HTMLElement>('[aria-label="打开书写设置"]')!.click();await wait(80);
    const samples:{amount:number;shown:boolean;same:boolean;edgeError:number;t:number}[]=[],start=performance.now();
    let running=true,timer=0,raf=0;
    const sample=()=>{
     const amount=Number(paper.dataset.roll),shape={width:paper.clientWidth,height:canvas.clientHeight,band:Number(paper.dataset.rollBand),amount};
     snapshot.width=canvas.width;snapshot.height=canvas.height;context.drawImage(canvas,0,0);
     const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,rx=canvas.width/shape.width,ry=canvas.height/shape.height;let edgeError=0;
     for(const y of [3,shape.band*.22,shape.band*.55,shape.band+3]){
      const row=Math.round(y*ry);let left=-1,right=-1;
      for(let x=0;x<canvas.width;x++)if(pixels[(row*canvas.width+x)*4+3]>32){if(left<0)left=x;right=x;}
      const p=projectPaper(unprojectPaper(y,shape),shape),expected=shape.width*(1-p.scale)/2;
      edgeError=Math.max(edgeError,Math.abs(left/rx-expected),Math.abs((canvas.width-right-1)/rx-expected));
     }
     samples.push({amount,shown:win.getComputedStyle(canvas).display!=='none',same:doc.querySelector('.paper-roll-canvas')===canvas,edgeError,t:performance.now()-start});
     if(running)raf=win.requestAnimationFrame(()=>{timer=win.setTimeout(sample,0);});
    };
    sample();
    [...doc.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===(target?'弯曲':'平面'))!.click();
    doc.querySelector<HTMLElement>('[aria-label="关闭设置"]')!.click();
    for(let i=0;i<100;i++){await wait(80);if(samples.length>6&&performance.now()-start>900&&Math.abs(samples.at(-1)!.amount-target)<.0001)break;}
    running=false;win.cancelAnimationFrame(raf);win.clearTimeout(timer);
    const checks:[string,boolean,string?][]=[
     ['manual switch has intermediate curvature',samples.some(s=>s.amount>.01&&s.amount<.99),`${samples.length} frames`],
     ['manual switch reaches the chosen shape',Math.abs(samples.at(-1)!.amount-target)<.0001],
     ['curvature progresses without reversal',samples.every((s,i)=>!i||(target?s.amount>=samples[i-1].amount:s.amount<=samples[i-1].amount))],
     ['same GPU surface remains visible',samples.every(s=>s.shown&&s.same)],
     ['painted silhouette follows the animated shape',samples.every(s=>s.edgeError<1.5),`max ${Math.max(...samples.map(s=>s.edgeError)).toFixed(3)}px`],
     ['note preserved',doc.querySelector('textarea')!.value===text],
    ];
    for(const [name,pass,detail]of checks)lines.push(`${pass?'PASS':'FAIL'} ${phone?'phone':'desktop'} ${night?'night':'day'} ${target?'curved':'flat'}: ${name} ${detail??''}`);
    cases.push({phone,night,target,checks,samples});report.textContent=lines.join('\n');
   }
  }
 }catch(error){lines.push(`FAIL manual morph fixture: ${String(error)}`);report.textContent=lines.join('\n');}
 report.dataset.raw=JSON.stringify(cases);report.dataset.complete='true';button.disabled=false;
});
