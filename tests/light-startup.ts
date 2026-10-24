const room=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;
 const results:string[]=[],raw:unknown[]=[];
 for(const phone of [false,true])for(const short of [false,true])for(const lateFont of [false,true]){
  room.style.width=phone?'390px':'1280px';room.style.height=phone?'844px':'720px';
  room.src=`/tests/light-startup-room.html?capture${phone?'&phone':''}${short?'&short':''}${lateFont?'&fontLate':'&stockLate'}`;
  const data=await new Promise<any>(resolve=>{
   const listener=(event:MessageEvent)=>{
    if(event.source!==room.contentWindow)return;
    if(event.data?.type!=='light-startup-result')return;
    window.removeEventListener('message',listener);resolve(event.data);
   };window.addEventListener('message',listener);
  });
  raw.push(data);const tag=`${phone?'phone':'desktop'} ${short?'short':'long'} ${lateFont?'font-last':'stock-last'}`;
  for(const [name,ok,detail]of data.checks)results.push(`${ok?'PASS':'FAIL'} ${tag}: ${name} ${detail??''}`);
  report.textContent=results.join('\n');
 }
 report.dataset.raw=JSON.stringify(raw);report.dataset.complete='true';button.disabled=false;
});
