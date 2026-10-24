const room=document.querySelector<HTMLIFrameElement>('#room')!,report=document.querySelector<HTMLElement>('#report')!;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(test:()=>boolean){const start=performance.now();while(!test()){if(performance.now()-start>20000)throw Error('准备或过渡未完成');await sleep(25);}}
document.querySelector<HTMLButtonElement>('#run')!.onclick=async()=>{
 const lines:string[]=[];const check=(label:string,ok:boolean)=>{lines.push(`${ok?'PASS':'FAIL'} ${label}`);report.textContent=lines.join('\n');if(!ok)throw Error(label);};
 try{
  for(const phone of [false,true])for(const night of [false,true])for(const transition of ['aperture','signature','contour','inkflow','gates','canopy','focus','lightpass']){
   const label=`${phone?'phone':'desktop'} ${night?'night':'day'} ${transition}`;
   room.width=phone?'390':'1280';room.height=phone?'844':'800';room.src=`/?experience-preview&capture&material=milk&transition=${transition}${night?'&night':''}`;
   await new Promise(r=>room.addEventListener('load',r,{once:true}));
   const doc=room.contentDocument!,app=()=>doc.querySelector<HTMLElement>('.app')!;
   await until(()=>!!doc.querySelector('.start-primary'));
   check(label+' 编辑室已在开始页背后挂载',!!doc.querySelector('.desk .mechanism-canvas')&&doc.querySelector('.room-writer-layer')!.hasAttribute('inert'));
   await until(()=>app().dataset.editorPrepared==='true');
   await until(()=>[...doc.querySelectorAll<HTMLElement>('.room-material')].every(el=>el.dataset.textureReady==='true'));
   check(label+' 两个场景共用当前昼夜材质', [...doc.querySelectorAll<HTMLElement>('.room-material')].every(el=>el.dataset.material===(night?'graphite':'milk')&&el.style.backgroundImage.includes('-v2.webp')));
   const page=doc.querySelector<HTMLElement>('.start-page')!,surface=doc.querySelector<HTMLElement>('.room-material')!;
   check(label+' 纸纹没有被开始页底色覆盖',room.contentWindow!.getComputedStyle(page).backgroundColor==='rgba(0, 0, 0, 0)'&&room.contentWindow!.getComputedStyle(surface).backgroundImage!=='none');
   const machine=doc.querySelector<HTMLCanvasElement>('.mechanism-canvas')!,paper=doc.querySelector<HTMLCanvasElement>('.paper-roll-canvas')!,text=doc.querySelector<HTMLTextAreaElement>('textarea')!;
   const before=text.value,model=machine.dataset.renderModel;
   check(label+' 首帧当前套件和昼夜已准备',!!model&&machine.dataset.renderTheme===(night?'night':'day')&&paper.dataset.stockReady==='true');
   doc.querySelector<HTMLButtonElement>('.start-primary')!.click();
   await until(()=>app().dataset.roomPhase==='moving'||app().dataset.screen==='writer');
   if(app().dataset.roomPhase==='moving'){
    const start=performance.now();let snapshots=0;
    while(app().dataset.roomPhase==='moving'){
     const w=doc.querySelector<HTMLElement>('.room-writer-layer')!,style=room.contentWindow!.getComputedStyle(w);
     check(label+' 书写坐标不随过渡缩放',style.transform==='none');
     snapshots++;await sleep(70);if(performance.now()-start>2500)throw Error('动画超时');
    }
    lines.push(`INFO ${label} sampled ${snapshots} intermediate frames`);
   }
   await until(()=>doc.activeElement===text);
   check(label+' 复用同一编辑室且保留原稿',doc.querySelector('.mechanism-canvas')===machine&&text.value===before&&machine.dataset.renderModel===model);
   check(label+' 结束后临时品牌封面和柔光层已清理',doc.querySelectorAll('[data-motion-part]').length===0);
   doc.querySelector<HTMLButtonElement>('.theme-toggle')!.click();await until(()=>app().dataset.editorPrepared==='true'&&app().dataset.night===String(!night));
   check(label+' 书写页切换同步隐藏开始页', [...doc.querySelectorAll<HTMLElement>('.room-material')].every(el=>el.dataset.material===(!night?'graphite':'milk')));
   doc.querySelector<HTMLButtonElement>('.theme-toggle')!.click();await until(()=>app().dataset.editorPrepared==='true'&&app().dataset.night===String(night));
   doc.querySelector<HTMLButtonElement>('[aria-label="回到开始页"]')!.click();await until(()=>app().dataset.screen==='start'&&app().dataset.roomPhase==='idle');
   check(label+' 返回后稿件与预加载保持完整',text.value===before&&app().dataset.editorPrepared==='true');
  }
  report.dataset.complete='true';report.textContent=lines.join('\n');
 }catch(error){lines.push('ERROR '+String(error));report.textContent=lines.join('\n');}
};
