let sequence=0;
// Preserve the current pen progress instead of revealing the unfinished word.
export function freezeWordmark(source:SVGSVGElement){
 const canvas=source.parentElement?.querySelector<HTMLCanvasElement>('.wordmark-hd');
 if(canvas&&getComputedStyle(canvas).display!=='none'){
  const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
  copy.getContext('2d',{willReadFrequently:true})!.putImageData(canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height),0,0);copy.className='wordmark-frozen';
  copy.style.cssText='display:block;width:100%;height:100%;image-rendering:pixelated;opacity:1';
  return copy;
 }
 const copy=source.cloneNode(true) as SVGSVGElement;
 const originals=source.querySelectorAll<SVGElement>('.wordmark-pen,.wordmark-dot');
 copy.querySelectorAll<SVGElement>('.wordmark-pen,.wordmark-dot').forEach((pen,i)=>{
  const css=getComputedStyle(originals[i]);pen.style.animation='none';
  pen.style.opacity=css.opacity;pen.style.strokeDashoffset=css.strokeDashoffset;
  pen.style.strokeDasharray=css.strokeDasharray;pen.style.strokeWidth=css.strokeWidth;
 });
 copy.classList.remove('is-writing');
 const ids=new Map<string,string>(),prefix=`room-snapshot-${++sequence}-`;
 copy.querySelectorAll('[id]').forEach(el=>{const before=el.id,after=prefix+before;ids.set(before,after);el.id=after;});
 copy.querySelectorAll('[mask],[clip-path]').forEach(el=>{
  for(const attr of ['mask','clip-path']){const value=el.getAttribute(attr);if(value)el.setAttribute(attr,value.replace(/url\(#([^)]+)\)/g,(match,id)=>ids.has(id)?`url(#${ids.get(id)})`:match));}
 });
 return copy;
}
