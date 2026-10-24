import {projectPaper,unprojectPaper} from '../src/paperGeometry';
const frame=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
const snapshot=document.createElement('canvas'),context=snapshot.getContext('2d',{willReadFrequently:true})!;
const wait=(ms=80)=>new Promise(r=>setTimeout(r,ms));
const ready=async(test:()=>boolean)=>{const start=performance.now();while(!test()){if(performance.now()-start>20000)throw Error('UI did not settle');await wait();}};
const rgba=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
const luminance=(value:string)=>rgba(value).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async event=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const lines:string[]=[],cases:unknown[]=[];
 const load=async(width:number,height:number,query:string)=>{frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.src=`/tests/start-room.html?capture${query}`;await new Promise<void>(r=>frame.addEventListener('load',()=>r(),{once:true}));await ready(()=>!!frame.contentDocument?.querySelector('.start-primary'));await frame.contentDocument!.fonts.ready;await wait();};
 try{
  for(const phone of [false,true])for(const night of [false,true])for(const fresh of [false,true]){
   const label=`${phone?'phone':'desktop'} ${night?'night':'day'} ${fresh?'new':'returning'}`;
   await load(phone?390:1280,phone?844:720,`${night?'&night':''}${fresh?'&new':''}`);
   const doc=frame.contentDocument!,win=frame.contentWindow!,checks:[string,boolean,string?][]=[];
   const check=(name:string,pass:boolean,detail?:string)=>{checks.push([name,pass,detail]);lines.push(`${pass?'PASS':'FAIL'} ${label}: ${name} ${detail??''}`);report.textContent=lines.join('\n');};
   const click=(selector:string)=>doc.querySelector<HTMLElement>(selector)!.click();
   const start=doc.querySelector<HTMLElement>('.start-page')!,primary=doc.querySelector<HTMLElement>('.start-primary')!,intro=doc.querySelector<HTMLElement>('.start-intro')!,rect=primary.getBoundingClientRect();
   const bg=win.getComputedStyle(start).backgroundColor,bodyContrast=contrast(win.getComputedStyle(intro).color,bg),buttonContrast=contrast(win.getComputedStyle(primary).color,win.getComputedStyle(primary).backgroundColor);
   check('starts at the welcome page with no hidden editor',!doc.querySelector('textarea')&&doc.querySelectorAll('canvas').length===0);
   check('primary label matches saved draft',primary.textContent===(fresh?'开始书写':'继续书写'));
   check('primary action fits the first viewport',rect.top>=0&&rect.bottom<=win.innerHeight);
   check('touch targets are at least 44px',[...doc.querySelectorAll<HTMLButtonElement>('.start-page button')].every(b=>b.getBoundingClientRect().height>=44&&b.getBoundingClientRect().width>=44));
   check('no horizontal or outer document scroll',doc.documentElement.scrollWidth===win.innerWidth&&doc.documentElement.scrollHeight===win.innerHeight);
   check('readable body and action contrast',bodyContrast>=4.5&&buttonContrast>=4.5,`${bodyContrast.toFixed(2)}, ${buttonContrast.toFixed(2)}`);
   click('.start-theme');await wait();check('theme changes both start and workspace',doc.querySelector('.app')!.classList.contains('night')===!night&&start.classList.contains('start-night')===!night);click('.start-theme');await wait();
   click('.start-library');await ready(()=>!!doc.querySelector('.folio-library'));
   check('welcome is inert while the library is open',start.inert&&doc.querySelector('.folio-library')!.contains(doc.activeElement));
   check('opening library preserves its notes',doc.querySelectorAll('.letter-row').length===1);
   click('[aria-label="关闭信盒"]');await wait();check('library close returns to an interactive start',!start.inert&&!doc.querySelector('.folio-library'));
   const paints:{amount:number;shown:boolean;edgeError:number}[]=[];let running=true,raf=0;
   const sample=()=>{
    const p=doc.querySelector<HTMLElement>('.paper'),c=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas');
    if(p&&c){
     const shape={width:p.clientWidth,height:c.clientHeight,band:Number(p.dataset.rollBand),amount:Number(p.dataset.roll)},shown=win.getComputedStyle(c).display!=='none';let edgeError=Infinity;
     if(shown&&c.width&&c.height){
      snapshot.width=c.width;snapshot.height=c.height;context.drawImage(c,0,0);const pixels=context.getImageData(0,0,c.width,c.height).data,rx=c.width/shape.width,ry=c.height/shape.height;edgeError=0;
      for(const y of [3,shape.band*.22,shape.band*.55,shape.band+3]){const row=Math.round(y*ry);let left=-1,right=-1;for(let x=0;x<c.width;x++)if(pixels[(row*c.width+x)*4+3]>32){if(left<0)left=x;right=x;}const projection=projectPaper(unprojectPaper(y,shape),shape),expected=shape.width*(1-projection.scale)/2;edgeError=Math.max(edgeError,Math.abs(left/rx-expected),Math.abs((c.width-right-1)/rx-expected));}
     }
     paints.push({amount:shape.amount,shown,edgeError});
    }
    if(running)raf=win.requestAnimationFrame(sample);
   };sample();
   click('.start-primary');await ready(()=>!!doc.querySelector('.has-paper-roll'));await wait(600);running=false;win.cancelAnimationFrame(raf);
   const text=doc.querySelector('textarea')!.value;
   check('continue opens the chosen note and focuses writing',doc.activeElement===doc.querySelector('textarea')&&(fresh?text==='':text.startsWith('给未来的自己\n')));
   check('entry keeps the chosen curve and painted edges from its first frame',paints.length>0&&paints.every(p=>p.shown&&p.amount===1&&p.edgeError<1.5),`${paints.length} painted samples, max ${Math.max(...paints.map(p=>p.edgeError)).toFixed(3)}px`);
   check('entry preserves paper and night settings',doc.querySelector('.paper')!.classList.contains('paper-lined')&&doc.querySelector('.app')!.classList.contains('night')===night);
   click('[aria-label="回到开始页"]');await ready(()=>!!doc.querySelector('.start-primary'));check('brand returns home without losing draft',doc.querySelector('.start-primary')!.textContent===(fresh?'开始书写':'继续书写'));
   click('.start-library');await ready(()=>!!doc.querySelector('.folio-library'));check('continue does not create duplicate blank pages',doc.querySelectorAll('.letter-row').length===1);
   click('.letter-open');await wait();click('.folio-primary');await ready(()=>!!doc.querySelector('textarea'));check('library selection opens writing with the original text',doc.querySelector('textarea')!.value===text&&!doc.querySelector('.folio-library'));
   click('[aria-label="回到开始页"]');await ready(()=>!!doc.querySelector('.start-primary'));
   if(!fresh){click('.start-new');await ready(()=>!!doc.querySelector('textarea'));check('new page is blank and leaves the previous note',doc.querySelector('textarea')!.value==='');click('[aria-label="打开信盒"]');await ready(()=>!!doc.querySelector('.folio-library'));check('new page creates exactly one additional note',doc.querySelectorAll('.letter-row').length===2);click('[aria-label="关闭信盒"]');await wait();}
   cases.push({label,checks,paints});
  }
  for(const [width,height,query]of [[360,640,'&long'],[320,568,'&night&long'],[900,640,'&long'],[390,844,'&empty']] as const){
   await load(width,height,query);const doc=frame.contentDocument!,win=frame.contentWindow!,page=doc.querySelector<HTMLElement>('.start-page')!,action=doc.querySelector('.start-primary')!.getBoundingClientRect();
   const checks:[string,boolean][]=[['primary fits compact viewport',action.bottom<=height],['no horizontal document or page overflow',doc.documentElement.scrollWidth===width&&page.scrollWidth===page.clientWidth],['long title stays within its text box',!doc.querySelector<HTMLElement>('.start-recent')||doc.querySelector('.start-recent')!.getBoundingClientRect().right<=width],['one vertical scrolling region',doc.documentElement.scrollHeight===height]];
   if(query.includes('empty')){doc.querySelector<HTMLElement>('.start-primary')!.click();await ready(()=>!!doc.querySelector('textarea'));checks.push(['empty workspace opens a new blank page',doc.querySelector('textarea')!.value==='']);}
   for(const [name,pass]of checks)lines.push(`${pass?'PASS':'FAIL'} compact ${width}x${height}: ${name}`);report.textContent=lines.join('\n');cases.push({width,height,checks,innerHeight:win.innerHeight});
  }
 }catch(error){lines.push(`FAIL start fixture: ${String(error)}`);report.textContent=lines.join('\n');}
 report.dataset.raw=JSON.stringify(cases);report.dataset.complete='true';button.disabled=false;
});
