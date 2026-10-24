const room=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
document.querySelector('#phone')!.addEventListener('click',()=>{room.style.width='360px';room.style.height='640px';room.src='/tests/startup-room.html?phone&font=late&stock=early&night&capture';});
document.querySelector('#run')!.addEventListener('click',async()=>{
 const results:string[]=[];report.textContent='正在检查首次加载的每个渲染帧…';
 for(const phone of [false,true])for(const night of [false,true])for(const lateFont of [false,true]){
  room.style.width=phone?'360px':'1280px';room.style.height=phone?'640px':'720px';
  room.src=`/tests/startup-room.html?font=${lateFont?'late':'early'}&stock=${lateFont?'early':'late'}${phone?'&phone':''}${night?'&night':''}&capture`;
  const data=await new Promise<any>(resolve=>{const listener=(event:MessageEvent)=>{if(event.source!==room.contentWindow||event.data?.type!=='startup-result')return;window.removeEventListener('message',listener);resolve(event.data);};window.addEventListener('message',listener);});
  const tag=`${phone?'phone':'desktop'} ${night?'night':'day'} ${lateFont?'font-last':'stock-last'}`;
  for(const [name,ok,detail]of data.checks)results.push(`${ok?'PASS':'FAIL'} ${tag}: ${name} ${detail??''}`);
  report.textContent=results.join('\n');
 }
 report.dataset.complete='true';
});
