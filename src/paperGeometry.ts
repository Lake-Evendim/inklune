export type RollShape = { width:number; height:number; band:number; amount:number };

// One material-distance table drives both the rendered surface and picking.
export const paperRollProfile = { length:1.25, depth:1.1, perspective:2.8, shade:.12, samples:257 } as const;

export function paperReturnLayout(width:number,height:number) {
 const clearance=18*width/430,top=Math.min(width*.225,height*.27);
 // Extend the responsive return by the same proportion on short desktop
 // viewports and narrow phones, then keep the printing clearance below it.
 const band=Math.max(clearance,Math.min(width*.205,height*.23,top-clearance))*paperRollProfile.length;
 return {band,clearance,writingTop:band+clearance};
}
type ReturnSurface = { start:number; values:Float32Array };
const surfaces = new Map<string,ReturnSurface>();

export function paperReturnSurface(shape:Pick<RollShape,'width'|'band'|'amount'>):ReturnSurface {
 const ratio=shape.band/(shape.width*paperRollProfile.perspective);
 const amount=shape.amount,key=`${ratio}:${amount}`;
 const cached=surfaces.get(key);if(cached)return cached;
 // The fully rolled crest has a horizontal projected top edge.
 // Depth and its first two derivatives vanish at the flat printing belt.
 const point=(u:number)=>{
  const t=1-u,y=(1-amount)*u+amount*(2*u*u-4*u*u*u/3+u*u*u*u/3),z=paperRollProfile.depth*amount*t*t*t;
  const dy=1-amount+amount*(4*u-4*u*u+4*u*u*u/3),dz=-3*paperRollProfile.depth*amount*t*t;
  const physicalY=y-(1-y)*z*ratio,physicalDy=dy*(1+z*ratio)-(1-y)*dz*ratio;
  const speed=Math.hypot(physicalDy,dz);
  return {y,z,physicalY,scale:1/(1+z*ratio),shade:1-paperRollProfile.shade*(1-physicalDy/speed),slope:dy/speed};
 };
 const divisions=2048,arc=new Float64Array(divisions+1);
 let previous=point(0);
 for(let i=1;i<=divisions;i++){const next=point(i/divisions);arc[i]=arc[i-1]+Math.hypot(next.physicalY-previous.physicalY,next.z-previous.z);previous=next;}
 const length=arc[divisions],values=new Float32Array(paperRollProfile.samples*4);
 let segment=1;
 for(let i=0;i<paperRollProfile.samples;i++){
  const distance=length*i/(paperRollProfile.samples-1);
  while(segment<divisions&&arc[segment]<distance)segment++;
  const u=(segment-1+(distance-arc[segment-1])/(arc[segment]-arc[segment-1]))/divisions,p=point(u);
  values.set([p.y,p.scale,p.shade,p.slope],i*4);
 }
 const surface={start:1-length,values};
 if(surfaces.size>=16)surfaces.delete(surfaces.keys().next().value!);
 surfaces.set(key,surface);return surface;
}

// s is physical distance along the sheet. Only the upper return bends.
export function projectPaper(s:number, shape:RollShape) {
 const {width,band,amount}=shape;
 if(s>=band||amount===0)return {y:s,scale:1,shade:1};
 const surface=paperReturnSurface(shape),start=surface.start*band;
 let y:number,scale:number,shade:number;
 if(s<start){
  // Offscreen continuation stays above the crest instead of exposing a
  // straight tangent that gets clipped into a bevel during the transition.
  const distance=start-s;
  y=-distance*surface.values[3]-amount*distance*distance/(2*band);scale=surface.values[1]/(1+distance/(width*paperRollProfile.perspective));shade=surface.values[2];
 }else{
  const position=(s-start)/(band-start)*(paperRollProfile.samples-1),left=Math.min(paperRollProfile.samples-2,Math.floor(position)),t=position-left;
  const sample=(channel:number)=>surface.values[left*4+channel]*(1-t)+surface.values[(left+1)*4+channel]*t;
  y=sample(0)*band;scale=sample(1);shade=sample(2);
 }
 return {y,scale,shade};
}

export function unprojectPaper(y:number, shape:RollShape) {
 let lo=Math.min(0,y)-shape.band*2,hi=Math.max(shape.height,y)+shape.band;
 // Bracket the upstream material during both the curved and flat states.
 for(let i=0;i<16&&projectPaper(lo,shape).y>y;i++)lo=lo*2-shape.band;
 for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(projectPaper(mid,shape).y<y)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
