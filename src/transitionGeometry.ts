export function organicClip(x:number,y:number,radius:number,aspect:number,variation:number){
 const points=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,r=radius*(1+variation*.08*Math.sin(a*3+.5));return {x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*aspect};});
 const fmt=(n:number)=>n.toFixed(2),at=(i:number)=>points[(i+8)%8];
 let path=`M${fmt(points[0].x)} ${fmt(points[0].y)}`;
 for(let i=0;i<8;i++){const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);path+=`C${fmt(b.x+(c.x-a.x)/6)} ${fmt(b.y+(c.y-a.y)/6)} ${fmt(c.x-(d.x-b.x)/6)} ${fmt(c.y-(d.y-b.y)/6)} ${fmt(c.x)} ${fmt(c.y)}`;}
 return `path("${path}Z")`;
}
export function insetClip(box:{left:number;top:number;width:number;height:number},width:number,height:number,radius:number){return `inset(${Math.max(0,box.top)}px ${Math.max(0,width-box.left-box.width)}px ${Math.max(0,height-box.top-box.height)}px ${Math.max(0,box.left)}px round ${radius}px)`;}
