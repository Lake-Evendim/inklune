// One reversible clock for the aperture and its surface. Zero endpoint
// velocity keeps a stationary button from jumping into a fast full-screen wipe.
export const roomProgress=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*x*(x*(x*6-15)+10);};
const blend=(p:number,from:number,to:number)=>roomProgress((p-from)/(to-from));
export function roomMotionFrame(t:number,enter:boolean,from=enter?0:1){
 const progress=from+((enter?1:0)-from)*roomProgress(t);
 return {progress,surface:1-blend(progress,.005,.15),label:1-blend(progress,0,.025)};
}
