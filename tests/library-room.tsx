import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import App from '../src/App';
import { createNote, defaults } from '../src/storage';

const letters = [
 ['给十月的自己', '给十月的自己\n\n今天没有什么特别的事。\n窗边的光停了一会儿，茶也刚好温着。\n\n以前总觉得，日子要填得很满才算没有浪费。\n现在慢慢明白，留一点空白，也是一种认真。\n\n把那些来不及说的话，\n先好好写在这里。\n\n等风来的时候，再读一遍。', '2026-10-16'],
 ['雨停之后', '雨停之后\n\n街角的梧桐叶落了一地。\n雨停了，空气里还有潮湿的木头味道。\n\n去买一束小小的花，不为任何节日。', '2026-10-14'],
 ['周末，去海边', '周末，去海边\n\n带一本书。\n不订太早的闹钟。\n沿着海边走一段，走到不想走为止。\n\n如果看到日落，就多留一会儿。', '2026-10-11'],
 ['一个想法的种子', '一个想法的种子\n\n如果开一家小店，\n只卖纸、笔和一些值得留下来的句子。\n\n门口有一棵树。\n路过的人可以在树下坐一会儿。', '2026-10-08'],
 ['书里的那句话', '书里的那句话\n\n“生活的意义，是让每一个平凡的时刻都有被看见的可能。”\n\n把这句话抄下来，送给有点着急的自己。', '2026-10-04'],
 ['九月的最后一天', '九月的最后一天\n\n有些变化很小。\n比如开始自己做早餐，比如不再急着回答所有问题。\n\n这些小事，也算数。', '2026-09-30'],
 ['寄给远方', '寄给远方\n\n很久没有写信给你。\n这里入秋了，你那里呢？\n\n上次一起走过的小路，已经铺满桂花。', '2026-09-22'],
 ['空白页', '', '2026-09-17'],
 ['Quiet mornings', 'Quiet mornings\n\nThe kettle sings before the street wakes up.\nOne small page. A little room to think.\n\nSome words need time before they find their way home.', '2026-09-09'],
 ['写给夏天的尾声', '写给夏天的尾声\n\n晚风终于凉了一些。\n把所有没完成的愿望，放回口袋。\n\n下次出发的时候，再带上它们。', '2026-08-31'],
 ['一段很长的散步', '一段很长的散步\n\n' + Array.from({length:35}, (_,i)=>`走过第 ${i+1} 个路口，听见树叶的声音。那些想不明白的事情，慢慢变得没有那么要紧。`).join('\n'), '2026-08-20'],
 ['旧日的清单', '旧日的清单\n\n已经做完的事，也值得好好收起来。', '2026-08-05'],
] as const;
const notes = letters.map(([title,text,date],i)=>({ ...createNote(text,`${date}T08:00:00.000Z`), id:`letter-${i}`, title, bookmark:[0,2,6,8].includes(i)?'#b898a6':null, deleted:i===11, ...(i===11?{deletedAt:'2026-10-01T08:00:00.000Z'}:{}), inkSeeds:Array.from({length:text.length},(_,j)=>j+10), traces:i===0?[{text:'旧',x:.1,row:1,seed:21}]:[] }));
const app=createRoot(document.querySelector('#root')!);
app.render(<React.StrictMode><App persist={false} initialWorkspace={{notes,activeId:notes[0].id,settings:{...defaults,sound:false,night:new URLSearchParams(location.search).has('night')}}}/></React.StrictMode>);
const open=()=>{const button=document.querySelector<HTMLButtonElement>('[aria-label="打开信盒"]');if(button)button.click();else setTimeout(open,20);};open();
window.addEventListener('pagehide',()=>app.unmount(),{once:true});
