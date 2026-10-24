import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import type { Settings } from './storage';
import { disposeTree, makeCapsule, makeHammer, makeRail, setupRenderer } from './mechanismModel';
import { lampLensTint } from './lamp';
type Model={shell:ReturnType<typeof makeCapsule>;hammer:ReturnType<typeof makeHammer>;rail:THREE.Group};

export default function MechanismCanvas({root,draw,settings,active=true}:{root:RefObject<HTMLDivElement|null>;draw:RefObject<(()=>void)|null>;settings:Settings;active?:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 const liveSettings=useRef(settings);liveSettings.current=settings;
 const liveActive=useRef(active);liveActive.current=active;
 useLayoutEffect(()=>{
  if(!canvas.current||!root.current)return;
  const element=root.current;
  let engine:ReturnType<typeof setupRenderer>;
  try{engine=setupRenderer(canvas.current,false,new URLSearchParams(location.search).has('capture'));}catch{element.dataset.mechanismFallback='true';return;}
  const {renderer,scene,key,fill,ambient,env}=engine;
  const camera=new THREE.OrthographicCamera(0,430,0,-680,.1,2000);camera.position.z=800;
  // Keep one day/night pair for the current kit. A theme switch selects an
  // existing model; only an actual material/kit change retires these resources.
  const models=new Map<boolean,Model>();let modelBuilds=0;
  const buildModels=(settings:Settings)=>{
   for(const night of [false,true]){
    const variant={...settings,night};
    const model={shell:makeCapsule(variant.kit,variant.capsule,night),hammer:makeHammer(variant.rail,night),rail:makeRail(430,variant)};
    model.shell.body.layers.enable(1);models.set(night,model);modelBuilds++;
   }
   canvas.current!.dataset.modelBuilds=String(modelBuilds);
  };
  const retireModels=()=>{
   for(const model of models.values())for(const group of [model.shell.group,model.hammer.group,model.rail]){group.removeFromParent();disposeTree(group);}
   models.clear();
  };
  buildModels(settings);
  let {shell,hammer,rail}=models.get(settings.night)!;
  let styleKey=JSON.stringify([settings.kit,settings.capsule,settings.rail,settings.endcap]);
  let modelKey=JSON.stringify([settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night]);
  scene.add(shell.group,hammer.group,rail);
  // Neutral diffuse form lighting preserves stone relief independently of
  // the adjustable paper lamp. Its layer cannot brighten the hammer/rail.
  const stoneReturn=new THREE.DirectionalLight('#e6e6e6',0);
  stoneReturn.layers.set(1);shell.body.layers.enable(1);
  stoneReturn.position.set(-120,100,800);scene.add(stoneReturn,stoneReturn.target);
  let width=0,height=0,frame=0,lightFrame=0,flashUntil=0,lastStrikes='',lastState='',disposed=false,lost=false;
  const mechanismState=()=>['--carriage-x','--carriage-y','--hammer-extension'].map(name=>element.style.getPropertyValue(name)).join('|')+element.dataset.motion+(element.dataset.strikes??'');
  // Analytic contact shadows avoid shadow-map acne on an almost coplanar sheet.
  // Direct light and environment reflection still shade the actual meshes.
  const contactTexture=(round:boolean)=>{const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d')!;ctx.save();ctx.translate(128,64);if(round)ctx.scale(2,1);const g=round?ctx.createRadialGradient(0,0,0,0,0,62):ctx.createLinearGradient(0,-64,0,64);if(round){g.addColorStop(0,'rgba(0,0,0,.65)');g.addColorStop(.65,'rgba(0,0,0,.33)');g.addColorStop(1,'rgba(0,0,0,0)');}else{g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.42)');g.addColorStop(1,'rgba(0,0,0,0)');}ctx.fillStyle=g;ctx.fillRect(-256,-64,512,128);ctx.restore();return new THREE.CanvasTexture(c);};
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:contactTexture(true),transparent:true,depthWrite:false,opacity:settings.night?.65:.8}));shadow.position.z=-17;scene.add(shadow);
  const railShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:contactTexture(false),transparent:true,depthWrite:false,opacity:settings.night?.16:.6}));railShadow.position.z=-18;scene.add(railShadow);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');let reduced=preference.matches;
  let warmTask=0,warmGeneration=0;
  const cancelWarm=()=>{if(typeof window.requestIdleCallback==='function')window.cancelIdleCallback(warmTask);else clearTimeout(warmTask);warmTask=0;};
  const warmModels=()=>{
   warmTask=0;if(disposed||lost)return;
   const generation=++warmGeneration;
   const inactive=models.get(!liveSettings.current.night)!;
   const staging=new THREE.Group();staging.add(inactive.shell.group,inactive.hammer.group,inactive.rail);
   const textures=new Set<THREE.Texture>();
   staging.traverse(object=>{
    if(!(object instanceof THREE.Mesh||object instanceof THREE.LineSegments))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material])for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
   });
   for(const texture of textures)renderer.initTexture(texture);
   // Compile against the real scene's lights before the alternate model is
   // displayed. Parallel shader compilation is used where the GPU supports it.
   const pending=[renderer.compileAsync(staging,camera,scene)];
   if(liveSettings.current.kit==='basalt'){camera.layers.set(1);pending.push(renderer.compileAsync(staging,camera,scene));camera.layers.set(0);}
   void Promise.all(pending).then(()=>{if(!disposed&&generation===warmGeneration)canvas.current!.dataset.modelsWarm='true';}).catch(()=>{/* First render remains the fallback on a lost context. */});
  };
  const scheduleWarm=()=>{cancelWarm();warmGeneration++;canvas.current!.dataset.modelsWarm='false';warmTask=typeof window.requestIdleCallback==='function'?window.requestIdleCallback(warmModels,{timeout:1200}):window.setTimeout(warmModels,0);};
  const paint=()=>{
   cancelAnimationFrame(frame);frame=0;clearTimeout(lightFrame);if(disposed||lost||!width)return;
   const settings=liveSettings.current;
   const nextStyle=JSON.stringify([settings.kit,settings.capsule,settings.rail,settings.endcap]);
   const nextKey=JSON.stringify([settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night]);
   if(nextStyle!==styleKey){retireModels();buildModels(settings);styleKey=nextStyle;scheduleWarm();}
   if(nextKey!==modelKey){
    scene.remove(shell.group,hammer.group,rail);
    ({shell,hammer,rail}=models.get(settings.night)!);scene.add(shell.group,hammer.group,rail);modelKey=nextKey;
   }
   shadow.material.opacity=settings.night?.65:.8;railShadow.material.opacity=settings.night?.16:.34;
   const strikes=element.dataset.strikes??'';if(strikes!==lastStrikes){lastStrikes=strikes;flashUntil=performance.now()+160;}
   lastState=mechanismState();
   const s=width/430,x=parseFloat(element.style.getPropertyValue('--carriage-x'))||80,y=parseFloat(element.style.getPropertyValue('--carriage-y'))||135,extension=parseFloat(element.style.getPropertyValue('--hammer-extension'))||0;
   shell.group.position.set(x,-y-11*s,5*s);shell.group.scale.setScalar(s);
   shadow.scale.set(121*s,57*s,1);shadow.position.set(x+1.5*s,-y-16*s,-17);railShadow.scale.set(width,30*s,1);railShadow.position.set(width/2,-y-16*s,-18);
   hammer.group.position.set(x,-y+10.5*s,5*s);hammer.group.scale.setScalar(s);
   hammer.piston.scale.y=1+extension/(25*s);hammer.piston.position.y=10.5+extension/(2*s);hammer.head.position.y=22+extension/s;
   rail.position.y=-y-11*s;rail.scale.setScalar(s);
   const motion=element.dataset.motion,active=motion==='print'||motion==='composition'||motion==='space';
   shell.lamps[0].color.set(active?'#e79a44':'#8abd62');shell.lamps[0].emissive.set(active?'#ef9c36':'#8cdb53');shell.lamps[0].emissiveIntensity=settings.night?.95:.3;
   const ignition=settings.night?Number(element.style.getPropertyValue('--lamp-ignition'))||0:0;
   shell.lamps[1].color.set('#33272a').lerp(new THREE.Color('#c48a35'),ignition);shell.lamps[1].emissive.set('#efab43');shell.lamps[1].emissiveIntensity=.9*ignition;
   shell.lamps[2].color.set('#171a17');shell.lamps[2].emissive.set('#000000');
   const now=performance.now();shell.arc.visible=!reduced&&now<flashUntil&&(settings.kit==='storm'||settings.kit==='frankenstein');
   const light=liveSettings.current,tint=lampLensTint(light.warmth),power=light.brightness/150;
   const lamp=new THREE.Color(`rgb(${tint.join(',')})`);
   // Brightness and temperature drive the aperture and paper only. Fixed
   // neutral night lighting keeps every shell's colour and shading stable.
   if(settings.night){ambient.intensity=.035;key.intensity=.083;key.color.set('#e6e6e6');fill.intensity=.008;scene.environmentIntensity=.035;shell.emitter.color.set('#262923').lerp(lamp.multiplyScalar(.6+.5*power),ignition);}
   else{ambient.intensity=.65;key.intensity=1.1;key.color.set('#fff5df');fill.intensity=.22;scene.environmentIntensity=.65;}
   stoneReturn.intensity=settings.night&&settings.kit==='basalt'?2:0;
   stoneReturn.target.position.set(x,-y-11*s,0);
   if(!settings.night)shell.emitter.color.set('#262923');
   const candle=shell.group.userData.candle as THREE.MeshStandardMaterial|undefined;
   if(candle)candle.emissiveIntensity=(settings.night?2.0*ignition:.24)*(reduced?1:.90+.1*Math.sin(now/117)+.08*Math.sin(now/73));
   const tail=shell.group.userData.tail as THREE.Mesh|undefined;if(tail)tail.rotation.z=-.15+(reduced?0:Math.sin(now/530)*.045);
   renderer.render(scene,camera);
   if(stoneReturn.intensity>0){
    // Three.js selects lights per camera, not per mesh. Render the stone's
    // return-light layer separately, preserving depth for the flush lenses
    // and aperture, so no light leaks into the hammer or rail.
    renderer.autoClear=false;camera.layers.set(1);renderer.render(scene,camera);
    camera.layers.set(0);renderer.autoClear=true;
   }
   canvas.current!.dataset.frames=String(renderer.info.render.frame);
   canvas.current!.dataset.renderTheme=settings.night?'night':'day';
   canvas.current!.dataset.lampAmount=String(ignition);
   canvas.current!.dataset.renderKit=settings.kit;
   canvas.current!.dataset.renderModel=modelKey;
   // Publish only after a complete frame with the current shell, hammer,
   // rail, endcaps and lighting. Also re-publish after context restoration.
   element.classList.add('has-3d');
   if(liveActive.current&&!reduced&&(now<flashUntil||settings.kit==='pumpkin'||settings.kit==='mummy'))lightFrame=window.setTimeout(schedule,settings.kit==='pumpkin'||settings.kit==='mummy'?60:25);
  };
  const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(paint);};
  const resize=()=>{
   const paper=element.querySelector<HTMLElement>('.paper')!;
   const nextWidth=paper.clientWidth,nextHeight=paper.clientHeight;if(!nextWidth||!nextHeight)return;
   if(nextWidth===width&&nextHeight===height){paint();return;}
   width=nextWidth;height=nextHeight;
   // The sticky assembly can be shorter than the physical sheet. Keep the
   // canvas at sheet scale; stretching it to the viewport displaces the lamp
   // and hammer from their shared DOM hit targets.
   canvas.current!.style.height=`${height}px`;
   renderer.setSize(width,height,false);camera.left=0;camera.right=width;camera.top=0;camera.bottom=-height;camera.updateProjectionMatrix();
   key.target.position.set(width/2,-height*.35,0);scene.add(key.target);key.position.set(width*.2,-height*.15,800);key.shadow.camera.left=-width;key.shadow.camera.right=width;key.shadow.camera.top=height;key.shadow.camera.bottom=-height;key.shadow.camera.far=1800;key.shadow.camera.updateProjectionMatrix();
   paint();
  };
  const mutation=new MutationObserver(()=>{if(mechanismState()!==lastState)schedule();});mutation.observe(element,{attributes:true,attributeFilter:['style','data-motion','data-strikes']});
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element.querySelector('.paper')!);
  const changePreference=()=>{reduced=preference.matches;schedule();};preference.addEventListener('change',changePreference);
  const loss=(event:Event)=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;clearTimeout(lightFrame);element.classList.remove('has-3d');};
  const restore=()=>{if(disposed)return;lost=false;resize();scheduleWarm();};
  canvas.current.addEventListener('webglcontextlost',loss);canvas.current.addEventListener('webglcontextrestored',restore);
  draw.current=paint;resize();scheduleWarm();
  return()=>{disposed=true;warmGeneration++;cancelWarm();draw.current=null;cancelAnimationFrame(frame);clearTimeout(lightFrame);mutation.disconnect();resizeObserver.disconnect();preference.removeEventListener('change',changePreference);canvas.current?.removeEventListener('webglcontextlost',loss);canvas.current?.removeEventListener('webglcontextrestored',restore);element.classList.remove('has-3d');retireModels();disposeTree(scene);env.dispose();renderer.dispose();};
 },[root,draw]);
 // Slider changes repaint the existing scene, without rebuilding WebGL or
 // its texture resources on every input event.
 useLayoutEffect(()=>{draw.current?.();},[draw,active,settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night,settings.brightness,settings.warmth]);
 return <canvas ref={canvas} className="mechanism-canvas" aria-hidden="true"/>;
}
