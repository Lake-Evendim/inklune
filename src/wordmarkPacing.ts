// A clock advances by visible centreline distance, independent of ink width.
// Brief occlusions at crossings retain their travel time. Only longer covered
// returns are removed, so a thin crossing cannot turn into a speed spike.
export function createVisibleArcClock(activity:Uint8Array,arcPerBin:Float64Array,from:number,to:number){
 const visible=Uint8Array.from(activity,a=>a?1:0),bins=visible.length,step=(to-from)/bins;
 for(let i=0;i<bins;){
  if(visible[i]){i++;continue;}
  const first=i;while(i<bins&&!visible[i])i++;
  if(first>0&&i<bins&&(i-first)*step<=8)visible.fill(1,first,i);
 }
 const distance=new Float64Array(bins+1);
 for(let i=0;i<bins;i++)distance[i+1]=distance[i]+visible[i]*arcPerBin[i];
 const total=distance[bins],span=to-from;
 return (time:number)=>{
  if(time<=from)return from;if(time>=to)return to;if(!total)return time;
  const p=(time-from)/step,i=Math.min(bins-1,Math.floor(p));
  return from+span*(distance[i]+(distance[i+1]-distance[i])*(p-i))/total;
 };
}
