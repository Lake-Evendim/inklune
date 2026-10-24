import {kits} from '../src/skins';
const room=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const lines:string[]=[];report.textContent='检查第一帧、套件切换和昼夜切换…';
 try{for(const width of [1280,360])for(const night of [false,true])for(const kit of kits){
  room.style.width=`${width}px`;room.style.height=width===360?'640px':'720px';
  const data=await new Promise<any>((resolve,reject)=>{
   const timeout=setTimeout(()=>{window.removeEventListener('message',listener);reject(Error('kit test timed out'));},20000);
   const listener=(event:MessageEvent)=>{if(event.source!==room.contentWindow||event.data?.type!=='kit-startup')return;clearTimeout(timeout);window.removeEventListener('message',listener);resolve(event.data);};
   window.addEventListener('message',listener);room.src=`/tests/kit-startup-room.html?kit=${kit.id}${night?'&night':''}&capture`;
  });
  for(const [name,ok,detail]of data.checks)lines.push(`${ok?'PASS':'FAIL'} ${width}px ${night?'night':'day'} ${kit.id}: ${name} ${detail??''}`);
  report.textContent=lines.join('\n');
 }report.dataset.complete='true';}catch(error){report.textContent=lines.join('\n')+'\nFAIL '+String(error);}finally{button.disabled=false;}
});
