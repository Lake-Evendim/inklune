// Average the coverage of every source pixel inside each final screen pixel.
// Browser drawImage filters can vary with sampling phase near a curve's tangent.
// The wordmark uses one ink color, so coverage alone determines its edge.
export function downsampleWordmark(high:HTMLCanvasElement,ctx:CanvasRenderingContext2D,samples:number,color:string){
 const {width,height}=ctx.canvas;
 const source=high.getContext('2d')!.getImageData(0,0,high.width,high.height).data;
 const image=ctx.createImageData(width,height),out=image.data,area=samples*samples;
 // Let Canvas resolve CSS colors, including alpha and non-RGB color syntax.
 // This temporary pixel is overwritten by the complete output before paint.
 ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
 const ink=ctx.getImageData(0,0,1,1).data;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let coverage=0;
  for(let row=0;row<samples;row++){
   let at=((y*samples+row)*high.width+x*samples)*4+3;
   for(let column=0;column<samples;column++,at+=4)coverage+=source[at];
  }
  const at=(y*width+x)*4;
  out[at]=ink[0];out[at+1]=ink[1];out[at+2]=ink[2];out[at+3]=Math.round(coverage/area);
 }
 ctx.putImageData(image,0,0);
}
