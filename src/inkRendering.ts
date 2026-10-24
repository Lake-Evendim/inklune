const maxRasterPixels=4_000_000;
export const inkWearAmount=.22;

// Ink depth changes pigment colour, rather than thinning the whole silhouette.
export function paperInkChannel(depth:number,tone=0){
 const value=Number.isFinite(depth)?Math.max(45,Math.min(100,depth)):82;
 return Math.round(8+(100-value)*1.5+Math.max(-2,Math.min(2,tone)));
}
export function paperInkColor(depth:number,tone=0){const c=paperInkChannel(depth,tone);return `rgb(${c} ${c} ${c})`;}

// Pigment grain changes RGB, not the coverage of whole strokes. Only the
// deepest texture pores in a fully covered interior reveal a little paper.
const unit=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(low:number,high:number,value:number)=>{const t=unit((value-low)/(high-low));return t*t*(3-2*t);};
export function inkCore(neighbourAlpha:number){return smooth(.72,.98,neighbourAlpha);}
export function protectedInkWear(neighbourAlpha:number,wearAlpha:number){
 return 1-.48*inkCore(neighbourAlpha)*(1-smooth(.10,.32,unit(wearAlpha)));
}
export function inkGrainTone(neighbourAlpha:number,wearAlpha:number){
 return Math.pow(unit((1-unit(wearAlpha))*2.5),1.15)*(3+37*inkCore(neighbourAlpha));
}
export const protectedInkWearGLSL=`
 float inkCore(float neighbours){return smoothstep(.72,.98,neighbours);}
 float protectedWear(float neighbours,float wear){
  return 1.0-.48*inkCore(neighbours)*(1.0-smoothstep(.10,.32,wear));
 }
 float grainTone(float neighbours,float wear){
  return pow(clamp((1.0-wear)*2.5,0.0,1.0),1.15)*mix(3.0,40.0,inkCore(neighbours))/255.0;
 }
`;

// Match the integer WebGL buffer, then use these same scales for ink tiles.
// A high-density phone can use its native DPR without growing a desktop
// paper buffer beyond the pixel budget.
export function paperRasterSize(width:number,height:number,dpr:number){
 const pixelRatio=Math.min(Math.max(1,dpr||1),3,Math.sqrt(maxRasterPixels/Math.max(1,width*height)));
 const pixelWidth=Math.max(1,Math.round(width*pixelRatio)),pixelHeight=Math.max(1,Math.min(Math.round(height*pixelRatio),Math.floor(maxRasterPixels/pixelWidth)));
 return {pixelRatio,pixelWidth,pixelHeight,scaleX:pixelWidth/Math.max(1,width),scaleY:pixelHeight/Math.max(1,height)};
}

// Both the origin and the displayed extent must lie on the screen grid.
// Matching only the backing buffer still resamples a half-pixel CSS layer.
export function paperScreenGrid(x:number,y:number,width:number,height:number,dpr:number){
 const ratio=Number.isFinite(dpr)&&dpr>0?dpr:1;
 return {x:Math.round(x*ratio)/ratio,y:Math.round(y*ratio)/ratio,
  width:Math.max(1,Math.round(width*ratio))/ratio,height:Math.max(1,Math.round(height*ratio))/ratio};
}
