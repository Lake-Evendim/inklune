// Read the rendered framebuffer: DOM alignment cannot catch a shaft drawn
// in front of the crown, or a lens sinking beneath it between vertices.
import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { makeCapsule, makeHammer, setupRenderer, disposeTree } from '../src/mechanismModel';
import { kits } from '../src/skins';
import type { Kit } from '../src/skins';
import { lampAperture, lampLensTint } from '../src/lamp';

function Fixture(){
 const canvas=useRef<HTMLCanvasElement>(null),run=useRef<(()=>Promise<string>)|null>(null);
 const [kit,setKit]=useState<Kit>('classic'),[night,setNight]=useState(true),[report,setReport]=useState(''),[running,setRunning]=useState(false);
 useLayoutEffect(()=>{
  const {renderer,scene,ambient,key,fill,env}=setupRenderer(canvas.current!,false);
  renderer.setSize(480,320,false);renderer.setClearColor('#383838',1);
  const camera=new THREE.OrthographicCamera(-60,60,50,-30,.1,2000);camera.position.z=800;
  let shell:ReturnType<typeof makeCapsule>|undefined,hammer:ReturnType<typeof makeHammer>|undefined;
  const load=(id:Kit,dark:boolean)=>{
   if(shell){scene.remove(shell.group);disposeTree(shell.group);}if(hammer){scene.remove(hammer.group);disposeTree(hammer.group);}
   shell=makeCapsule(id,'ivory',dark);hammer=makeHammer(kits.find(k=>k.id===id)!.rail,dark);
   hammer.group.position.y=lampAperture.shellTop;scene.add(shell.group,hammer.group);
   ambient.intensity=dark?.035:.65;key.intensity=dark?.083:1.1;key.color.set(dark?'#e6e6e6':'#fff5df');fill.intensity=dark?.008:.22;scene.environmentIntensity=dark?.035:.65;
   if(dark)shell.emitter.color.set(`rgb(${lampLensTint(66).join(',')})`).multiplyScalar(1.1);
   renderer.render(scene,camera);
  };
  const capture=()=>{
   renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(canvas.current!.width*canvas.current!.height*4);
   gl.readPixels(0,0,canvas.current!.width,canvas.current!.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
  };
  const difference=(a:Uint8Array,b:Uint8Array,box:number[])=>{
   const w=canvas.current!.width,h=canvas.current!.height;let changed=0;
   for(let y=Math.ceil((box[1]+30)/80*h);y<(box[3]+30)/80*h;y++)for(let x=Math.ceil((box[0]+60)/120*w);x<(box[2]+60)/120*w;x++){
    const index=(y*w+x)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(a[index+c]-b[index+c])))>2)changed++;
   }return changed;
  };
  const meanDifference=(a:Uint8Array,b:Uint8Array,box:number[])=>{
   const w=canvas.current!.width,h=canvas.current!.height;let total=0,count=0;
   for(let y=Math.ceil((box[1]+30)/80*h);y<(box[3]+30)/80*h;y++)for(let x=Math.ceil((box[0]+60)/120*w);x<(box[2]+60)/120*w;x++){
    const at=(y*w+x)*4;total+=Math.max(...[0,1,2].map(c=>Math.abs(a[at+c]-b[at+c])));count++;
   }return total/Math.max(1,count);
  };
  load(kit,night);
  run.current=async()=>{
   const rows:string[]=[],check=(label:string,pass:boolean,n:number)=>rows.push(`${pass?'PASS':'FAIL'} ${label}: ${n} pixels`);
   const buried=[-1.5,17.7,1.5,lampAperture.shellTop-lampAperture.thickness-.15];
   for(const dark of [false,true])for(const item of kits){
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    load(item.id,dark);
    for(const stroke of [0,15]){
     hammer!.piston.scale.y=1+stroke/25;hammer!.piston.position.y=10.5+stroke/2;hammer!.head.position.y=22+stroke;
     const visible=capture();hammer!.group.visible=false;const absent=capture();hammer!.group.visible=true;
     const leak=difference(visible,absent,buried);check(`${item.id} ${dark?'night':'day'} ${stroke?'extended':'rest'} shaft is buried`,leak===0,leak);
    }
    const visible=capture();shell!.aperture.visible=false;const absent=capture();shell!.aperture.visible=true;
    const slit=difference(visible,absent,[-9,20.77,9,21.48]);check(`${item.id} ${dark?'night':'day'} crown lens remains visible`,slit>80,slit);
   }
   // Compare the actual rim with the same triangles shaded as enamel.
   // The old uniformly luminous lens has almost as much contrast at the
   // silhouette as at its centre, creating the pasted-on appearance.
   load('classic',true);hammer!.group.visible=false;
   const lens=shell!.aperture.material,coreBox=[-8,20.35,8,21.05],rimBox=[-8,21.27,8,21.5];
   shell!.aperture.visible=false;const enamel=capture();
   shell!.aperture.visible=true;const inlaid=capture();
   const rim=meanDifference(inlaid,enamel,rimBox),core=meanDifference(inlaid,enamel,coreBox);
   const flat=new THREE.MeshBasicMaterial({color:shell!.emitter.color,toneMapped:false,side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-.1,polygonOffsetUnits:-2});shell!.aperture.material=flat;
   const pasted=capture(),flatRim=meanDifference(pasted,enamel,rimBox),flatCore=meanDifference(pasted,enamel,coreBox);
   // Both samples share the same silhouette coverage, so compare their rim
   // contrasts directly instead of assuming a fully covered edge pixel.
   rows.push(`${rim<flatRim*.3?'PASS':'FAIL'} lens rim blends into enamel: rim ${rim.toFixed(2)}, uniform rim ${flatRim.toFixed(2)}`);
   rows.push(`${core>80?'PASS':'FAIL'} lens interior remains luminous: ${core.toFixed(2)}`);
   rows.push(`${flatRim>40&&flatCore>80?'PASS':'FAIL'} detects uniform luminous rim: rim ${flatRim.toFixed(2)}, core ${flatCore.toFixed(2)}`);
   shell!.aperture.material=lens;flat.dispose();
   // Negative control reproduces the rejected z=8 arrangement, proving the
   // pixel test detects the previous black stub instead of merely passing.
   load('classic',true);hammer!.group.visible=false;const absent=capture();hammer!.group.visible=true;hammer!.piston.position.z=8;
   const oldLeak=difference(capture(),absent,buried);check('detect previous foreground-shaft error',oldLeak>0,oldLeak);
   load(kit,night);return rows.join('\n');
  };
  return()=>{run.current=null;disposeTree(scene);env.dispose();renderer.dispose();};
 },[kit,night]);
 return <main style={{background:'#1b1b1b',color:'#ddd',minHeight:'100vh',padding:24,fontFamily:'sans-serif'}}>
  <div style={{display:'flex',gap:16,marginBottom:20}}><select disabled={running} aria-label="套件" value={kit} onChange={e=>setKit(e.target.value as Kit)}>{kits.map(k=><option key={k.id} value={k.id}>{k.title}</option>)}</select><button disabled={running} onClick={()=>setNight(!night)}>昼夜切换</button><button disabled={running} onClick={async()=>{setRunning(true);try{setReport(await run.current!());}finally{setRunning(false);}}}>检查灯口遮挡</button></div>
  <canvas ref={canvas} style={{maxWidth:'100%',height:'auto'}}/><pre style={{fontSize:12,whiteSpace:'pre-wrap'}}>{report}</pre>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
