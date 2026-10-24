// Diagnostic-only copy of production renderer. Source SHA256: 76feba2a9a1949e6aa404ab5846c48250d2c1dec0e9e0570286391f10bacabae
import { useLayoutEffect, useRef } from 'react';
import type { PointerEvent, RefObject } from 'react';
import * as THREE from 'three';
import type { Settings } from '../src/storage';
import { paperSkins } from '../src/skins';
import { paperRollProfile, paperReturnLayout, paperReturnSurface, projectPaper, unprojectPaper } from '../src/paperGeometry';
import type { RollShape } from '../src/paperGeometry';
import { paperLineStep } from '../src/ruling';
import wearUrl from '../src/ink-wear.png';
import {paperRasterSize} from '../src/inkRendering';
const inkWearAmount=.22; // Freeze the previous treatment for comparison.

type Refs={paper:RefObject<HTMLDivElement|null>;input:RefObject<HTMLTextAreaElement|null>;mirror:RefObject<HTMLDivElement|null>;canvas:RefObject<HTMLCanvasElement|null>;light:RefObject<HTMLCanvasElement|null>;draw:RefObject<((refreshLayout?:boolean)=>void)|null>};
type Glyph={node:HTMLElement;x:number;top:number;baseline:number;width:number;height:number;start:number;end:number;text:string};
const tileSize=512,gutter=8;
export const probeVariant=new URLSearchParams(location.search).get('mode')||'current';
export let captureInkProbe:(()=>unknown)|null=null;

export default function usePaperRoll(refs:Refs,curved:boolean,settings:Settings,choose:(offset:number)=>void) {
 const live=useRef({curved,settings});live.current={curved,settings};
 const shape=useRef<RollShape>({width:430,height:680,band:90,amount:curved?1:0});
 const glyphs=useRef<Glyph[]>([]),drag=useRef<number|null>(null),invalidate=useRef<(()=>void)|null>(null),touch=useRef<{x:number;y:number;moved:boolean}|null>(null);
 useLayoutEffect(()=>{invalidate.current?.();});
 useLayoutEffect(()=>{
  const paper=refs.paper.current,mirror=refs.mirror.current,canvas=refs.canvas.current,light=refs.light.current;
  if(!paper||!mirror||!canvas||!light)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:new URLSearchParams(location.search).has('capture')});}catch{canvas.dataset.renderFallback='true';return;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,430,0,680,-10,10);camera.position.z=2;
  // Publish the selected geometry on the first paint, even before the full
  // paper image has decoded. Its own stock colour keeps lighting and ink on
  // that same surface; the DOM fallback must not appear as a straight sheet.
  const colour=paperSkins[live.current.settings.paper].color;
  const stock=new THREE.DataTexture(new Uint8Array([1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).concat(255)),1,1);
  stock.colorSpace=THREE.SRGBColorSpace;stock.needsUpdate=true;
  canvas.dataset.stockReady='false';
  // Light is sampled in screen coordinates before the paper's final alpha.
  // No second silhouette: antialiased rim pixels receive the same illumination
  // as the interior, and cannot expose an unlit strip during a shape change.
  const makeLightMap=()=>{const texture=new THREE.CanvasTexture(light);texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;return texture;};
  let lightMap=makeLightMap(),lightPixelsWidth=light.width,lightPixelsHeight=light.height;
  let inkWearMap:THREE.Texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  inkWearMap.needsUpdate=true;canvas.dataset.inkWearReady='false';
  let surface=paperReturnSurface(shape.current);
  const returnMap=new THREE.DataTexture(surface.values,paperRollProfile.samples,1,THREE.RGBAFormat,THREE.FloatType);
  returnMap.minFilter=returnMap.magFilter=THREE.NearestFilter;returnMap.generateMipmaps=false;returnMap.needsUpdate=true;
  const vertex=`
  uniform float sheetWidth, lightWidth, lightHeight, bendBand, bendAmount, feed, stockSurface;
  uniform sampler2D returnMap; uniform float returnStart;
  varying vec2 vUv; varying vec2 vLightUv; varying vec2 vWearUv; varying float vTone; varying float vSide;
  vec3 returnPoint(float s){
   if(s>=bendBand)return vec3(s,1.0,1.0);
   float start=returnStart*bendBand;
   if(s<start){
    float d=start-s;vec4 crest=texture2D(returnMap,vec2(.5/${paperRollProfile.samples}.0,.5));
    return vec3(-d*crest.a-bendAmount*d*d/(2.0*bendBand),crest.y/(1.0+d/(sheetWidth*${paperRollProfile.perspective})),crest.z);
   }
   float position=(s-start)/(bendBand-start)*${paperRollProfile.samples-1}.0,index=min(${paperRollProfile.samples-2}.0,floor(position));
   vec3 a=texture2D(returnMap,vec2((index+.5)/${paperRollProfile.samples}.0,.5)).rgb;
   vec3 b=texture2D(returnMap,vec2((index+1.5)/${paperRollProfile.samples}.0,.5)).rgb;
   vec3 p=mix(a,b,position-index);p.x*=bendBand;return p;
  }
  void main(){
   float s=position.y-feed*(1.0-stockSurface);vec3 rolled=returnPoint(s);
   float y=rolled.x,scale=rolled.y;
   vec3 p=vec3(sheetWidth*.5+(position.x-sheetWidth*.5)*scale,y,0.0);
   vUv=stockSurface>.5?vec2(position.x/(sheetWidth/430.0*512.0),-(s+feed)/(sheetWidth/430.0*512.0)):uv;
   vTone=rolled.z;vSide=uv.x;
   vWearUv=vec2(position.x,-position.y)/(sheetWidth/430.0*96.0);
   vLightUv=vec2(p.x/lightWidth,1.0-p.y/lightHeight);
   gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }`;
  const fragment=`uniform sampler2D map, lightMap, inkWearMap; uniform float nightAmount, stockSurface, inkWearAmount; varying vec2 vUv, vLightUv, vWearUv; varying float vTone; varying float vSide; void main(){vec4 c=texture2D(map,vUv);if(stockSurface<.5)c.a*=mix(1.0,texture2D(inkWearMap,vWearUv).a,inkWearAmount);float edge=smoothstep(0.0,fwidth(vSide),vSide)*smoothstep(0.0,fwidth(vSide),1.0-vSide);gl_FragColor=vec4(c.rgb*vTone,c.a*edge);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n gl_FragColor.rgb*=mix(vec3(1.0),texture2D(lightMap,vLightUv).rgb,nightAmount);\n}`;
  const material=(texture:THREE.Texture,transparent=false)=>new THREE.ShaderMaterial({uniforms:{map:{value:texture},lightMap:{value:lightMap},inkWearMap:{value:inkWearMap},inkWearAmount:{value:['no-wear','solid','nearest','canvas','dom'].includes(probeVariant)?0:inkWearAmount},returnMap:{value:returnMap},returnStart:{value:surface.start},nightAmount:{value:live.current.settings.night?1:0},sheetWidth:{value:430},lightWidth:{value:430},lightHeight:{value:680},bendBand:{value:90},bendAmount:{value:1},feed:{value:0},stockSurface:{value:transparent?0:1}},vertexShader:vertex,fragmentShader:fragment,transparent,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  const baseMaterial=material(stock);baseMaterial.transparent=true;
  // Blend the stock's fractional edge coverage into the transparent buffer.
  // Writing straight RGB with blending disabled would be interpreted as
  // premultiplied RGB by the browser, producing an overbright fringe.
  const base=new THREE.Mesh(new THREE.BufferGeometry(),baseMaterial);base.renderOrder=0;scene.add(base);
  const tiles=new Map<number,{canvas:HTMLCanvasElement;texture:THREE.CanvasTexture;mesh:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>}>();
  let width=0,height=0,feed=0,font='',line=0,ink=1,areaX=0,areaY=0,baselineOffset=0,dirty=true,frame=0,disposed=false,stockId=live.current.settings.paper;
  let rasterScaleX=1,rasterScaleY=1;
  let from=shape.current.amount,to=from,started=performance.now(),lightVersion='',rasterCount=0,layoutCount=0,drawCount=0;
  let night=live.current.settings.night?1:0,nightFrom=night,nightTo=night,nightStarted=started;
  const printGlyph=(ctx:CanvasRenderingContext2D,glyph:Glyph)=>{
   // Rasterize once on the tile's physical pixel grid. The shader adds a
   // light paper-fibre variation without erasing the body of each stroke.
   ctx.fillText(glyph.text,Math.round(glyph.x*rasterScaleX)/rasterScaleX,Math.round(glyph.baseline*rasterScaleY)/rasterScaleY);
  };
  const geometry=(mesh:THREE.Mesh,start:number,end:number,textureStart:number,textureHeight:number)=>{
   const rows=Math.max(2,Math.ceil((end-start)/2)),count=(rows+1)*2,g=new THREE.BufferGeometry();
   const p=new THREE.BufferAttribute(new Float32Array(count*3),3),uv=new THREE.BufferAttribute(new Float32Array(count*2),2),indices=[];
   for(let i=0;i<=rows;i++){const s=start+(end-start)*i/rows;for(let side=0;side<2;side++){const at=i*2+side;p.setXYZ(at,side*width,s,0);uv.setXY(at,side,1-(s-textureStart)/textureHeight);}}
   for(let i=0;i<rows;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}g.setAttribute('position',p);g.setAttribute('uv',uv);g.setIndex(indices);mesh.geometry.dispose();mesh.geometry=g;mesh.frustumCulled=false;
  };
  const uniforms=(material:THREE.ShaderMaterial)=>{const u=material.uniforms;u.returnStart.value=surface.start;u.sheetWidth.value=width;u.lightMap.value=lightMap;u.inkWearMap.value=inkWearMap;u.lightWidth.value=Number(light.dataset.sheetWidth)||width;u.lightHeight.value=Number(light.dataset.sheetHeight)||paper.clientHeight;u.nightAmount.value=night;u.bendBand.value=shape.current.band;u.bendAmount.value=shape.current.amount;u.feed.value=feed;};
  const layout=()=>{layoutCount++;
   const box=paper.getBoundingClientRect(),area=mirror.getBoundingClientRect(),style=getComputedStyle(mirror);
   feed=parseFloat(paper.closest<HTMLElement>('.typewriter-assembly')!.style.getPropertyValue('--paper-feed'))||0;
   areaX=area.left-box.left;areaY=area.top-box.top+(paper.classList.contains('has-paper-roll')?0:feed);line=paperLineStep(mirror);font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ink=parseFloat(getComputedStyle(paper).getPropertyValue('--ink-opacity'));if(!Number.isFinite(ink))ink=1;
   const metrics=document.createElement('canvas').getContext('2d')!;metrics.font=font;canvas.dataset.fontMeasure=String(metrics.measureText('Mwj.宽').width);
   const first=mirror.querySelector<HTMLElement>('.rule-baseline-marker')!;baselineOffset=first.getBoundingClientRect().bottom-area.top;
   glyphs.current=[...mirror.querySelectorAll<HTMLElement>('.ink-glyph[data-start]')].map(node=>{const b=node.getBoundingClientRect(),row=Math.round((b.top-area.top)/line);return {node,x:b.left-box.left,top:areaY+row*line,baseline:areaY+baselineOffset+row*line+parseFloat(node.style.getPropertyValue('--ink-y')||'0'),width:b.width,height:line,start:Number(node.dataset.start),end:Number(node.dataset.end),text:node.textContent||''};});
   // Leave the first printing line and its ascenders on the flat belt.
   const returnLayout=paperReturnLayout(width,height);
   shape.current.band=Math.min(returnLayout.band,Math.max(returnLayout.clearance,areaY-returnLayout.clearance));
   paper.dataset.rollBand=String(shape.current.band);
   for(const tile of tiles.values())tile.mesh.userData.dirty=true;
   dirty=false;
  };
  const raster=(index:number)=>{
   let tile=tiles.get(index);const start=index*tileSize-gutter,h=tileSize+gutter*2;
   if(!tile){const c=document.createElement('canvas');c.width=canvas.width;c.height=Math.ceil(h*rasterScaleY);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=probeVariant==='nearest'?THREE.NearestFilter:THREE.LinearFilter;texture.magFilter=texture.minFilter;texture.generateMipmaps=false;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material(texture,true));mesh.renderOrder=1;tile={canvas:c,texture,mesh};tiles.set(index,tile);scene.add(mesh);geometry(mesh,index*tileSize,(index+1)*tileSize,start,c.height/rasterScaleY);mesh.userData.dirty=true;}
   if(tile.mesh.userData.dirty){rasterCount++;
    const ctx=tile.canvas.getContext('2d')!;ctx.setTransform(rasterScaleX,0,0,rasterScaleY,0,-start*rasterScaleY);ctx.clearRect(0,start,width,tile.canvas.height/rasterScaleY);
    if(live.current.settings.paper==='lined'){const area=mirror.parentElement!,step=parseFloat(area.style.getPropertyValue('--rule-step'))||line,offset=parseFloat(area.style.getPropertyValue('--rule-offset'))||baselineOffset+2;ctx.fillStyle='#89999830';const thickness=parseFloat(area.style.getPropertyValue('--rule-thickness'))||.7;for(let y=areaY+offset+Math.floor((start-areaY-offset)/step)*step;y<start+h;y+=step){if(y>=areaY)ctx.fillRect(areaX,y,width-areaX*2,thickness);}}
    ctx.font=font;ctx.textBaseline='alphabetic';ctx.fillStyle='#080808';
    const input=refs.input.current!;
    for(const glyph of glyphs.current){if(glyph.baseline<start-16||glyph.top>start+h||getComputedStyle(glyph.node).visibility==='hidden')continue;
     if(glyph.end>input.selectionStart&&glyph.start<input.selectionEnd){ctx.globalAlpha=1;ctx.fillStyle='#aeb69966';ctx.fillRect(glyph.x,glyph.top,glyph.width,line);ctx.fillStyle='#080808';}
     if(!glyph.text.trim())continue;
     ctx.globalAlpha=probeVariant==='solid'?1:ink*Number(glyph.node.style.opacity||1);printGlyph(ctx,glyph);
     if(glyph.node.classList.contains('composing-ink')){ctx.globalAlpha*=.55;ctx.fillRect(glyph.x,glyph.baseline+2,glyph.width,.6);}}
    for(const node of mirror.querySelectorAll<HTMLElement>('.deleted-ink')){const y=areaY+baselineOffset+Number(node.style.getPropertyValue('--trace-row'))*line;if(y<start-16||y>start+h+16)continue;ctx.globalAlpha=ink*.64;const x=areaX+parseFloat(node.style.left)/100*(width-2*areaX);ctx.fillText(node.textContent||'',x,y);ctx.fillRect(x,y-parseFloat(getComputedStyle(mirror).fontSize)*.3,ctx.measureText(node.textContent||'').width,.8);}
    const placeholder=mirror.querySelector<HTMLElement>('.editor-placeholder');
    if(placeholder&&areaY+baselineOffset>start&&areaY+baselineOffset<start+h){ctx.globalAlpha=.65;ctx.fillStyle='#939580';ctx.font=`${getComputedStyle(placeholder).fontSize} ${getComputedStyle(placeholder).fontFamily}`;ctx.fillText(placeholder.textContent||'',areaX,areaY+baselineOffset);}
    ctx.globalAlpha=1;tile.texture.needsUpdate=true;tile.mesh.userData.dirty=false;
   }
   uniforms(tile.mesh.material);tile.mesh.visible=true;
  };
  const syncSize=()=>{
   const nextWidth=paper.clientWidth,nextHeight=Math.min(paper.clientHeight,paper.closest<HTMLElement>('.typewriter-assembly')!.clientHeight||paper.clientHeight);
   if(!nextWidth||!nextHeight)return;
   const raster=paperRasterSize(nextWidth,nextHeight,(devicePixelRatio||1)*(probeVariant==='double'?2:1));
   if(nextWidth===width&&nextHeight===height&&canvas.width===raster.pixelWidth&&canvas.height===raster.pixelHeight)return;
   width=nextWidth;height=nextHeight;
   paper.closest<HTMLElement>('.typewriter-assembly')!.style.setProperty('--paper-writing-top',`${paperReturnLayout(width,height).writingTop.toFixed(3)}px`);shape.current.width=width;shape.current.height=height;camera.right=width;camera.bottom=height;camera.updateProjectionMatrix();geometry(base,-width,height+width,0,1);renderer.setPixelRatio(raster.pixelRatio);renderer.setSize(width,height,false);canvas.style.height=`${height}px`;
   rasterScaleX=canvas.width/width;rasterScaleY=canvas.height/height;canvas.dataset.inkPixelRatio=String(raster.pixelRatio);canvas.dataset.inkScaleX=String(rasterScaleX);canvas.dataset.inkScaleY=String(rasterScaleY);
   for(const tile of tiles.values()){scene.remove(tile.mesh);tile.mesh.geometry.dispose();tile.mesh.material.dispose();tile.texture.dispose();}tiles.clear();dirty=true;
  };
  const commitStock=(texture:THREE.Texture,requested:string)=>{
   if(disposed||stockId!==requested){texture.dispose();return;}
   texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   const previous=baseMaterial.uniforms.map.value;baseMaterial.uniforms.map.value=texture;previous.dispose();canvas.dataset.stockReady='true';draw();
  };
  const stockFailed=(requested:string)=>{if(disposed||stockId!==requested)return;canvas.dataset.stockReady='true';canvas.dataset.stockFallback='true';draw();};
  const draw=()=>{
   if(disposed)return;
   // A motion/lighting callback can arrive before our size observer. Commit
   // the camera and canvas at the same dimensions as that source position.
   syncSize();if(!width)return;
   const now=performance.now(),target=live.current.curved?1:0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(target!==to){from=shape.current.amount;to=target;started=now;}
   const t=reduced?1:Math.min(1,(now-started)/620);shape.current.amount=from+(to-from)*(t*t*t*(t*(t*6-15)+10));paper.dataset.roll=shape.current.amount.toFixed(4);
   const nightTarget=live.current.settings.night?1:0;
   if(nightTarget!==nightTo){nightFrom=night;nightTo=nightTarget;nightStarted=now;}
   const nt=reduced?1:Math.min(1,(now-nightStarted)/500);night=nightFrom+(nightTo-nightFrom)*(nt*nt*(3-2*nt));
   canvas.dataset.night=night.toFixed(4);
   // WebGL texture storage is immutable after its first upload. Reusing a
   // resized CanvasTexture can retain old pixels (or stretch them across a
   // new sheet). Allocate again, then commit its own logical dimensions.
   if(light.width!==lightPixelsWidth || light.height!==lightPixelsHeight){
    lightMap.dispose();lightMap=makeLightMap();lightPixelsWidth=light.width;lightPixelsHeight=light.height;
   }
   if(lightVersion!==light.dataset.version){lightVersion=light.dataset.version||'';lightMap.needsUpdate=true;}
   feed=parseFloat(paper.closest<HTMLElement>('.typewriter-assembly')!.style.getPropertyValue('--paper-feed'))||0;
   if(dirty)layout();
   const nextSurface=paperReturnSurface(shape.current);
   if(nextSurface!==surface){surface=nextSurface;returnMap.image.data=surface.values;returnMap.needsUpdate=true;}
   if(stockId!==live.current.settings.paper){stockId=live.current.settings.paper;canvas.dataset.stockReady='false';const requested=stockId;new THREE.TextureLoader().load(paperSkins[stockId].url,tex=>commitStock(tex,requested),undefined,()=>stockFailed(requested));}
   const min=unprojectPaper(0,shape.current)+feed,max=unprojectPaper(height,shape.current)+feed;
   uniforms(baseMaterial);for(const tile of tiles.values())tile.mesh.visible=false;
   const firstTile=Math.floor(min/tileSize),lastTile=Math.floor(max/tileSize);
   for(let index=firstTile;index<=lastTile;index++)raster(index);
   // Keep only the visible belt and one tile on either side. A long note does
   // not allocate a huge texture, nor trigger texture uploads on every feed.
   for(const [index,tile]of tiles){if(index<firstTile-1||index>lastTile+1){scene.remove(tile.mesh);tile.mesh.geometry.dispose();tile.mesh.material.dispose();tile.texture.dispose();tiles.delete(index);}}
   if(['canvas','dom','normal','matched'].includes(probeVariant))for(const tile of tiles.values())tile.mesh.visible=false;
   renderer.render(scene,camera);
   if(probeVariant==='canvas'){
    const overlay=paper.querySelector<HTMLCanvasElement>('.probe-flat-ink')||document.createElement('canvas');
    if(!overlay.parentElement){overlay.className='probe-flat-ink';paper.append(overlay);}
    overlay.width=canvas.width;overlay.height=canvas.height;
    overlay.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;z-index:6;pointer-events:none`;
    const ctx=overlay.getContext('2d')!;
    for(const [index,tile]of tiles){const start=index*tileSize-gutter;ctx.drawImage(tile.canvas,0,(start-feed)*rasterScaleY);}
   }
   canvas.dataset.draws=String(++drawCount);canvas.dataset.rasters=String(rasterCount);canvas.dataset.layouts=String(layoutCount);paper.classList.add('has-paper-roll');
   canvas.dataset.feed=feed.toFixed(3);canvas.dataset.tiles=String(tiles.size);
   if(t<1||nt<1){cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);}
  };
  captureInkProbe=()=>{
   draw();
   const final=canvas.toDataURL('image/png');
   const visible=[...tiles.values()].filter(t=>t.mesh.visible);
   for(const tile of visible)tile.mesh.visible=false;
   renderer.render(scene,camera);const stock=canvas.toDataURL('image/png');
   for(const tile of visible)tile.mesh.visible=true;
   renderer.render(scene,camera);
   const clean=document.createElement('canvas');clean.width=canvas.width;clean.height=canvas.height;
   const ctx=clean.getContext('2d')!;ctx.setTransform(rasterScaleX,0,0,rasterScaleY,0,-feed*rasterScaleY);ctx.font=font;ctx.fillStyle='#080808';ctx.textBaseline='alphabetic';
   for(const glyph of glyphs.current)printGlyph(ctx,glyph);
   const rect=canvas.getBoundingClientRect();
   return {variant:probeVariant,font,width,height,feed,baselineOffset,areaX,areaY,band:shape.current.band,dpr:devicePixelRatio,scaleX:rasterScaleX,scaleY:rasterScaleY,
    canvasRect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},glyphs:glyphs.current.map(g=>({text:g.text,x:g.x,top:g.top,baseline:g.baseline,width:g.width,opacity:Number(g.node.style.opacity)})),
    final,stock,clean:clean.toDataURL('image/png'),tiles:[...tiles].map(([index,tile])=>({index,start:index*tileSize-gutter,image:tile.canvas.toDataURL('image/png')}))};
  };
  const resize=()=>{syncSize();draw();};
  const changed=()=>{dirty=true;draw();};invalidate.current=changed;refs.draw.current=(refreshLayout=false)=>{if(refreshLayout)dirty=true;draw();};
  const observer=new MutationObserver(changed);observer.observe(mirror,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(paper);sizeObserver.observe(paper.closest('.typewriter-assembly')!);
  const select=()=>{for(const tile of tiles.values())tile.mesh.userData.dirty=true;draw();};refs.input.current?.addEventListener('select',select);
  const fontsChanged=()=>{paperLineStep(mirror,true);changed();};document.fonts.addEventListener('loadingdone',fontsChanged);void document.fonts.ready.then(()=>{if(!disposed)fontsChanged();});
  const initialStockId=stockId,initialStock=new THREE.TextureLoader().load(paperSkins[initialStockId].url,tex=>commitStock(tex,initialStockId),undefined,()=>stockFailed(initialStockId));resize();
  const loadedWear=new THREE.TextureLoader().load(wearUrl,texture=>{if(disposed){texture.dispose();return;}texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;inkWearMap.dispose();inkWearMap=texture;canvas.dataset.inkWearReady='true';draw();});
  let resolution:MediaQueryList;
  const watchDpr=()=>{resolution?.removeEventListener('change',onDpr);resolution=matchMedia(`(resolution: ${devicePixelRatio}dppx)`);resolution.addEventListener('change',onDpr);};
  const onDpr=()=>{watchDpr();resize();};watchDpr();
  const lost=()=>paper.classList.remove('has-paper-roll'),restored=()=>{width=height=0;resize();};canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  return()=>{captureInkProbe=null;disposed=true;cancelAnimationFrame(frame);observer.disconnect();sizeObserver.disconnect();resolution.removeEventListener('change',onDpr);document.fonts.removeEventListener('loadingdone',fontsChanged);refs.input.current?.removeEventListener('select',select);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);refs.draw.current=null;invalidate.current=null;paper.classList.remove('has-paper-roll');for(const tile of tiles.values()){tile.mesh.geometry.dispose();tile.mesh.material.dispose();tile.texture.dispose();}base.geometry.dispose();if(initialStock!==baseMaterial.uniforms.map.value)initialStock.dispose();baseMaterial.uniforms.map.value.dispose();baseMaterial.dispose();lightMap.dispose();if(loadedWear!==inkWearMap)loadedWear.dispose();inkWearMap.dispose();returnMap.dispose();renderer.dispose();};
 },[refs.paper,refs.mirror,refs.input,refs.canvas,refs.light,refs.draw]);
 const caretAt=(clientX:number,clientY:number)=>{
  const box=refs.paper.current!.getBoundingClientRect(),s=unprojectPaper(clientY-box.top,shape.current),projection=projectPaper(s,shape.current),x=shape.current.width/2+(clientX-box.left-shape.current.width/2)/projection.scale;
  const feed=parseFloat(refs.paper.current!.closest<HTMLElement>('.typewriter-assembly')!.style.getPropertyValue('--paper-feed'))||0,y=s+feed;
  let nearest:Glyph|undefined,distance=Infinity;
  for(const glyph of glyphs.current){const dy=y<glyph.top?glyph.top-y:y>glyph.top+glyph.height?y-glyph.top-glyph.height:0,dx=x<glyph.x?glyph.x-x:x>glyph.x+glyph.width?x-glyph.x-glyph.width:0,d=dy*10000+dx;if(d<distance){distance=d;nearest=glyph;}}
  return nearest?(x<nearest.x+nearest.width/2?nearest.start:nearest.end):0;
 };
 const selection=(offset:number)=>{const a=drag.current??offset;refs.input.current!.setSelectionRange(Math.min(a,offset),Math.max(a,offset));choose(offset);invalidate.current?.();};
 const down=(event:PointerEvent<HTMLCanvasElement>)=>{if(event.button!==0)return;if(event.pointerType==='touch'){touch.current={x:event.clientX,y:event.clientY,moved:false};return;}event.preventDefault();refs.input.current!.focus({preventScroll:true});drag.current=caretAt(event.clientX,event.clientY);event.currentTarget.setPointerCapture(event.pointerId);selection(drag.current);};
 const move=(event:PointerEvent<HTMLCanvasElement>)=>{if(touch.current){if(Math.hypot(event.clientX-touch.current.x,event.clientY-touch.current.y)>6)touch.current.moved=true;return;}if(drag.current!==null){selection(caretAt(event.clientX,event.clientY));}};
 const up=(event:PointerEvent<HTMLCanvasElement>)=>{if(touch.current&&!touch.current.moved){refs.input.current!.focus({preventScroll:true});selection(caretAt(event.clientX,event.clientY));}drag.current=null;touch.current=null;};
 const cancel=()=>{drag.current=null;touch.current=null;};
 return {onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:cancel};
}
