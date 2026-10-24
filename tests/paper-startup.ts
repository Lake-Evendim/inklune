const room=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
document.querySelector<HTMLButtonElement>('#run')!.addEventListener('click',async(event)=>{
 const button=event.currentTarget as HTMLButtonElement;button.disabled=true;const lines:string[]=[],cases:unknown[]=[];
 const once=new URLSearchParams(location.search).has('once');
 for(const phone of (once?[false]:[false,true]))for(const night of (once?[true]:[false,true]))for(const flat of (once?[false]:[false,true])){
  room.style.width=phone?'390px':'1280px';room.style.height=phone?'844px':'720px';
  room.src=`/tests/paper-startup-room.html?capture&paper=lined${flat?'&flat':''}${night?'&night':''}`;
  const result=await new Promise<any>(resolve=>{const receive=(e:MessageEvent)=>{if(e.source!==room.contentWindow||e.data?.type!=='paper-startup-result')return;window.removeEventListener('message',receive);resolve(e.data);};window.addEventListener('message',receive);});cases.push(result);
  for(const [name,pass,detail]of result.checks)lines.push(`${pass?'PASS':'FAIL'} ${phone?'phone':'desktop'} ${night?'night':'day'} ${flat?'flat':'curved'}: ${name} ${detail??''}`);
  report.textContent=lines.join('\n');
 }
 report.dataset.raw=JSON.stringify(cases);report.dataset.complete='true';button.disabled=false;
});
