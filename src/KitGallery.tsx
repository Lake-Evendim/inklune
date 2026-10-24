import { useLayoutEffect, useRef } from 'react';
import { kits } from './skins';
import type { Kit } from './skins';
const previews=import.meta.glob('./assets/kits/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
// Keep the decoded nodes themselves. Recreating an <img> on first opening
// can still leave its first compositor frame blank despite a cached request.
const images=new Map<Kit,HTMLImageElement>();
for(const kit of kits){const image=new Image(288,144);image.className='kit-preview';image.alt='';image.decoding='sync';image.src=previews[`./assets/kits/${kit.id}.webp`];images.set(kit.id,image);void image.decode().catch(()=>{});}
function KitPreview({id}:{id:Kit}) {
 const holder=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{const image=images.get(id)!;holder.current?.append(image);return()=>image.remove();},[id]);
 return <span className="kit-preview-holder" ref={holder}/>;
}
export default function KitGallery({selected,onSelect}:{selected:Kit;onSelect:(id:Kit)=>void}) {
 return <div className="kit-gallery">{kits.map(kit=><button key={kit.id} className={`kit-option ${selected===kit.id?'selected':''}`} onClick={()=>onSelect(kit.id)} aria-label={`套件${kit.title}`} aria-pressed={selected===kit.id}><KitPreview id={kit.id}/><span className="kit-title">{kit.title}{kit.seasonal&&<i>万圣节</i>}</span></button>)}</div>;
}
