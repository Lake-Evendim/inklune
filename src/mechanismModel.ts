import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Settings } from './storage';
import type { Kit } from './skins';
import { lampAperture } from './lamp';

export const capsuleColors = { ivory:'#eeece2', sage:'#8e9c81', blue:'#315ca4', rose:'#bd8789', charcoal:'#383e3d' };
const metalColors = { steel:'#bac0c0', brass:'#b39251', blackened:'#414343' };
function random(seed: number) { let state=seed; return ()=>{ state=(Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; }; }

function paintTexture(kind: 'wood'|'porcelain'|'linen'|'leather') {
 const c=document.createElement('canvas'); c.width=1024; c.height=512;
 const ctx=c.getContext('2d')!, rand=random(2026);
 ctx.fillStyle=kind==='wood'?'#70472e':kind==='porcelain'?'#eeeede':kind==='linen'?'#d9ccb4':'#829776'; ctx.fillRect(0,0,1024,512);
 if(kind==='wood') {
   for(let y=0;y<512;y++) { ctx.beginPath(); const darkness=rand(); ctx.strokeStyle=`rgba(${darkness>.7?'206,153,91':'35,17,9'},${.05+rand()*.2})`; ctx.lineWidth=.5+rand()*2;
     for(let x=0;x<=1024;x+=4){const knot=Math.exp(-((x-690)**2)/26000)*Math.sin((y-270)/65)*60; const yy=y+Math.sin(x/120+y/40)*3+knot; x===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}ctx.stroke();
   }
 } else if(kind==='porcelain') {
   ctx.strokeStyle='#284d89';ctx.lineWidth=2.5;
   for(const [cx,cy] of [[510,285],[785,145],[290,150]]) {
     ctx.save();ctx.translate(cx,cy);ctx.rotate(cx/700);
     ctx.beginPath();ctx.moveTo(-90,180);ctx.bezierCurveTo(-35,75,40,45,0,-70);ctx.stroke();
     for(let j=0;j<7;j++){ctx.save();ctx.translate(Math.sin(j)*30,-40+j*29);ctx.rotate(j%2?-.7:.8);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(20,-38,54,-30,60,-8);ctx.bezierCurveTo(25,-3,12,10,0,0);ctx.fillStyle=j%2?'#47679a':'#254a80';ctx.fill();ctx.restore();}
     for(let a=0;a<7;a++){ctx.save();ctx.translate(0,-78);ctx.rotate(a*Math.PI*2/7);ctx.beginPath();ctx.ellipse(0,-18,9,22,0,0,Math.PI*2);ctx.fillStyle='#365d94';ctx.globalAlpha=.75;ctx.fill();ctx.restore();}ctx.restore();
   }
   ctx.strokeStyle='#3e6094';ctx.lineWidth=4;ctx.strokeRect(3,3,1018,506);
 } else if(kind==='linen') {
   for(let i=0;i<1024;i+=4){ctx.fillStyle=`rgba(88,74,53,${.04+rand()*.09})`;ctx.fillRect(i,0,1,512);}
   for(let j=0;j<512;j+=4){ctx.fillStyle=`rgba(255,248,230,${.12+rand()*.12})`;ctx.fillRect(0,j,1024,1);ctx.fillStyle='#91836a18';ctx.fillRect(0,j+2,1024,1);}
 } else {
   for(let i=0;i<48000;i++){const x=rand()*1024,y=rand()*512;ctx.fillStyle=rand()>.5?'#c5cda519':'#30402818';ctx.fillRect(x,y,rand()*3,rand()*2);}
 }
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function noiseTexture(seed=17) {
 const rand=random(seed),c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!,data=ctx.createImageData(256,256);
 for(let i=0;i<data.data.length;i+=4){const v=110+rand()*40;data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}ctx.putImageData(data,0,0);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,2);return t;
}
export function roundedShell() {
 const g=new THREE.CapsuleGeometry(21.5,61,24,80);g.rotateZ(Math.PI/2);g.scale(1,1,13/21.5);g.translate(0,0,2);
 const p=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/104+.5,p.getY(i)/43+.5);return g;
}
function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x=0,y=0,z=0) {
 const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function line(points:number[][],color:THREE.ColorRepresentation,parent:THREE.Object3D,width=.35) {
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
 return mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*5),width,6,false),new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.3}),parent);
}
function stoneGeometry(crystal=false) {
 const g=new THREE.SphereGeometry(1,crystal?28:96,crystal?14:48),position=g.getAttribute('position'),colors=[];
 for(let i=0;i<position.count;i++) {
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
   const rough=(Math.sin(x*41+y*53+z*31)*Math.sin(y*37-z*47))* (crystal?.025:.045);
   // A small machined crown seats the lens in the otherwise irregular skin.
   // Preserve the stone relief outside this 20px opening, but prevent the
   // curved outline from dropping away behind the ends of a straight slit.
   const smooth=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
   const seat=smooth((y-.82)/.13)*smooth((11.5-Math.abs(x*52))/1);
   const lift=21.5*(1-Math.sqrt(Math.max(0,1-x*x)));
   position.setXYZ(i,x*(52+rough*10*(1-seat)),y*21.5+rough*y*12*(1-seat)+lift*seat,z*(14+rough*16));
   const tone=.80+Math.sin(x*80+y*55+z*77)*.10;colors.push(tone,tone,tone);
 }g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

// Extract the shell's crown triangles without removing the enamel beneath
// them. The diffuser uses these exact surface coordinates; its transparent
// perimeter reveals the original shading rather than a synthetic rim colour.
function crownLens(body:THREE.Mesh,kit:Kit) {
 const source=body.geometry.index?body.geometry.toNonIndexed():body.geometry;
 const names=Object.keys(source.attributes),lens:Record<string,number[]>={};
 for(const name of names)lens[name]=[];
 type Vertex=Record<string,number[]>;
 const emit=(polygon:Vertex[],target:Record<string,number[]>)=>{for(let i=1;i<polygon.length-1;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]])for(const name of names)target[name].push(...v[name]);};
 const clip=(polygon:Vertex[],distance:(v:Vertex)=>number,inside:boolean)=>{
  const out:Vertex[]=[];
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b),ia=inside?da>=0:da<=0,ib=inside?db>=0:db<=0;
   if(ia)out.push(a);
   if(ia!==ib){const t=da/(da-db),v:Vertex={};for(const name of names)v[name]=a[name].map((x,j)=>x+(b[name][j]-x)*t);out.push(v);}
  }return out;
 };
 const half=lampAperture.length/2,bottom=lampAperture.shellTop-lampAperture.thickness;
 const planes=[(v:Vertex)=>v.position[0]+half,(v:Vertex)=>half-v.position[0],(v:Vertex)=>v.position[1]-bottom,(v:Vertex)=>v.position[2]-(kit==='basalt'||kit==='storm'?0:2)];
 for(let i=0;i<source.attributes.position.count;i+=3){
  let polygon:Vertex[]=[];
  for(let j=0;j<3;j++){const v:Vertex={};for(const name of names){const a=source.attributes[name];v[name]=Array.from({length:a.itemSize},(_,k)=>a.array[(i+j)*a.itemSize+k]);}polygon.push(v);}
  for(const plane of planes){polygon=clip(polygon,plane,true);if(!polygon.length)break;}
  emit(polygon,lens);
 }
 const geometry=(data:Record<string,number[]>)=>{const g=new THREE.BufferGeometry();for(const name of names)g.setAttribute(name,new THREE.Float32BufferAttribute(data[name],source.attributes[name].itemSize));return g;};
 if(source!==body.geometry)source.dispose();
 return geometry(lens);
}

// Blend into the existing enamel instead of compiling a second physical
// shell shader. Polygon offset resolves coplanar depth only; no vertex is
// moved towards the viewer or beyond the shell silhouette.
function inlaidLens() {
 const lens=new THREE.MeshBasicMaterial({color:'#262923',toneMapped:false,side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-.1,polygonOffsetUnits:-2});
 lens.onBeforeCompile=shader=>{
  shader.uniforms.lensBounds={value:new THREE.Vector3(lampAperture.length/2,lampAperture.shellTop,lampAperture.thickness)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vLensSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLensSurface=position.xy;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 vLensSurface;
   uniform vec3 lensBounds;`)
   .replace('#include <opaque_fragment>',`
    float fromTop=lensBounds.y-vLensSurface.y;
    float fromBottom=lensBounds.z-fromTop;
    float coverage=smoothstep(0.0,.35,fromTop)*smoothstep(0.0,.18,fromBottom)*smoothstep(0.0,.4,lensBounds.x-abs(vLensSurface.x));
    float opal=.88+.12*sin(clamp(fromTop/lensBounds.z,0.0,1.0)*PI);
    outgoingLight*=opal;
    diffuseColor.a*=coverage;
    #include <opaque_fragment>`);
 };
 lens.customProgramCacheKey=()=> 'inlaid-shell-lens-v3';
 return lens;
}
export function makeCapsule(kit: Kit, tint: Settings['capsule']='ivory', night=false) {
 const group=new THREE.Group();const micro=noiseTexture();
 let material=new THREE.MeshPhysicalMaterial({color:capsuleColors[tint],roughness:.37,metalness:.02,clearcoat:.42,clearcoatRoughness:.32,bumpMap:micro,bumpScale:.045,envMapIntensity:.65});
 if(kit==='seaglass') material=new THREE.MeshPhysicalMaterial({color:'#528e82',roughness:.22,metalness:.03,clearcoat:1,transmission:.22,thickness:7,ior:1.46,bumpMap:micro,bumpScale:.12});
 if(kit==='basalt') material=new THREE.MeshPhysicalMaterial({color:'#343b3b',roughness:.94,vertexColors:true,bumpMap:micro,bumpScale:.8,envMapIntensity:.9});
 if(kit==='porcelain') material=new THREE.MeshPhysicalMaterial({map:paintTexture('porcelain'),roughness:.17,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.7,bumpMap:micro,bumpScale:.018});
 if(kit==='walnut') material=new THREE.MeshPhysicalMaterial({map:paintTexture('wood'),roughness:.39,clearcoat:.3,clearcoatRoughness:.35,bumpMap:micro,bumpScale:.085});
 if(kit==='mummy') material=new THREE.MeshPhysicalMaterial({map:paintTexture('linen'),roughness:.96,bumpMap:micro,bumpScale:.18});
 if(kit==='frankenstein') material=new THREE.MeshPhysicalMaterial({map:paintTexture('leather'),roughness:.72,bumpMap:micro,bumpScale:.28});
 if(kit==='pumpkin') material=new THREE.MeshPhysicalMaterial({color:'#b9561c',roughness:.55,clearcoat:.22,bumpMap:micro,bumpScale:.14});
 if(kit==='storm') material=new THREE.MeshPhysicalMaterial({color:'#63548d',roughness:.12,metalness:.05,transmission:.24,thickness:8,ior:1.52,clearcoat:1,vertexColors:true});
 // Night shells keep only diffuse form and texture. Environment specular
 // and clearcoat otherwise leave a horizontal studio-light reflection.
 if(night){material.envMapIntensity=0;material.clearcoat=0;material.specularIntensity=0;material.metalness=0;material.roughness=1;material.transmission=0;}
 const body=mesh(kit==='basalt'||kit==='storm'?stoneGeometry(kit==='storm'):roundedShell(),material,group,0,0,kit==='basalt'||kit==='storm'?8:0);
 if(kit==='pumpkin') {
  const p=body.geometry.getAttribute('position'),colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),rib=Math.pow((Math.cos(x*Math.PI/7)+1)/2,5);p.setZ(i,z-Math.max(0,z-2)/13*rib*.65);const v=1-rib*.15;colors.push(v,v,v);}body.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));body.geometry.computeVertexNormals();material.vertexColors=true;
 }
 const brass=new THREE.MeshStandardMaterial({color:'#b3904e',metalness:.86,roughness:.28});
 if(kit==='walnut') {
   // The narrow metal bead follows the curved perimeter, not a flat rectangle.
   const border=roundedShell();const edges=new THREE.EdgesGeometry(border,45);const rim=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#b6a06e',transparent:true,opacity:.55}));rim.position.z=.3;group.add(rim);border.dispose();
 }
 if(kit==='seaglass') {const rand=random(19);for(let i=0;i<23;i++){const x=(rand()-.5)*79,y=(rand()-.5)*24;mesh(new THREE.SphereGeometry(.3+rand()*.5,8,6),new THREE.MeshPhysicalMaterial({color:'#c5e0d1',transparent:true,opacity:.27,roughness:.1}),group,x,y,11);}}
 if(kit==='pumpkin') {
   const surface=(y:number)=>2+13*Math.sqrt(Math.max(0,1-(y/21.5)**2))+.06;
   for(let x=-35;x<=35;x+=14) line([[x-1,-17,surface(-17)],[x,-8,surface(-8)],[x,8,surface(8)],[x-1,17,surface(17)]],'#9c4515',group,.13);
   const face=new THREE.MeshStandardMaterial({color:'#2d160a',emissive:'#f69a29',emissiveIntensity:.8,roughness:.7});
   const triangle=(x:number)=>{const s=new THREE.Shape();s.moveTo(x-6,2);s.lineTo(x+5,1);s.lineTo(x+1,10);s.closePath();mesh(new THREE.ShapeGeometry(s),face,group,0,0,15.2);};triangle(-12);triangle(13);
   const smile=new THREE.Shape();smile.moveTo(-15,-5);smile.lineTo(-7,-10);smile.lineTo(0,-7);smile.lineTo(6,-10);smile.lineTo(15,-5);smile.lineTo(9,-13);smile.lineTo(-7,-14);smile.closePath();mesh(new THREE.ShapeGeometry(smile),face,group,0,0,15.25);
   mesh(new THREE.CylinderGeometry(2.8,4,5,12),new THREE.MeshStandardMaterial({color:'#58613d',roughness:.9}),group,0,22,3);
   group.userData.candle=face;
 }
 if(kit==='mummy') {
   const linen=new THREE.MeshStandardMaterial({map:paintTexture('linen'),roughness:.95,bumpMap:micro,bumpScale:.2,side:THREE.DoubleSide});
   for(let i=0;i<7;i++) {
     const pts=[],uv=[],indices=[];const center=-40+i*13;
     for(let j=0;j<=40;j++){const angle=j/40*Math.PI*2;for(const side of [-1,1]){const xx=center+Math.sin(angle)*4+side*6.6;pts.push(xx,Math.cos(angle)*20,Math.sin(angle)*12+4);uv.push(j/40,(side+1)/2);}if(j<40){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();mesh(g,linen,group);
   }
   const tail=mesh(new THREE.PlaneGeometry(7,22,1,8),linen,group,36,-26,9);tail.rotation.z=-.15;group.userData.tail=tail;
 }
 if(kit==='frankenstein') {
   const surface=(y:number)=>2+13*Math.sqrt(Math.max(0,1-(y/21.5)**2))+.6;
   line([[15,-19,surface(-19)],[12,-7,surface(-7)],[17,1,surface(1)],[12,11,surface(11)],[14,19,surface(19)]],'#354637',group,.5);
   for(let y=-14;y<=14;y+=5) line([[9,y-1,surface(y-1)+.5],[19,y+1,surface(y+1)+.5]],'#c9b993',group,.32);
   for(const x of [-49,49]) {const bolt=mesh(new THREE.CylinderGeometry(3,3,5,6),brass,group,x,4,7);bolt.rotation.z=Math.PI/2;}
 }
 // Small flush lenses with a hairline dark recess, as in the reference.
 // Keep the lamp cluster separate from skin ornaments (especially pumpkin).
 const indicators=new THREE.Group();group.add(indicators);
 const lamps: THREE.MeshPhysicalMaterial[]=[];
 for(let i=0;i<3;i++) {
   const x=-37+i*7,z=kit==='basalt'||kit==='storm'?21.8:15.0;
   const socket=mesh(new THREE.CircleGeometry(2.5,32),new THREE.MeshStandardMaterial({color:'#383b33',metalness:.12,roughness:.65}),indicators,x,-1,z);
   socket.castShadow=false;
   const m=new THREE.MeshPhysicalMaterial({color:i===0?'#8cbe60':'#292226',emissive:i===0?'#5c9630':'#000000',emissiveIntensity:.3,roughness:.35,clearcoat:.2,envMapIntensity:.08});lamps.push(m);
   mesh(new THREE.SphereGeometry(2.3,24,12),m,indicators,x,-1,z+.16).scale.z=.16;
 }
 if(kit==='pumpkin') indicators.position.x=-4;
 // The unframed lens forms the upper edge rather than floating on the face.
 // Its upper surface is flush with the shell silhouette, and follows the
 // shell independently of the piston's printing stroke.
 const emitter=inlaidLens();
 const aperture=mesh(crownLens(body,kit),emitter,group,0,0,body.position.z);aperture.castShadow=false;aperture.receiveShadow=false;
 const arc=new THREE.Group();arc.visible=false;const spark=new THREE.MeshBasicMaterial({color:kit==='storm'?'#c1d5ff':'#e0fdaa',transparent:true,opacity:.9});
 for(let i=0;i<2;i++){const points=kit==='storm'?[[-33+i*8,12,23],[-14,4,24],[-20,-2,24],[8,-4,24],[2,-12,24],[33,-15,20]]:[[-48,-5,18],[-53,0,18],[-46,2,18],[-55,9,18]];const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));mesh(new THREE.TubeGeometry(curve,32,.42,5,false),spark,arc);}group.add(arc);
 return {group,body,lamps,arc,emitter,aperture};
}

// Cylinder UVs run around the section on U and along the rail on V.
// Long, shallow marks follow the machining direction rather than painting
// horizontal highlight bands onto the metal.
function brushedRailTexture() {
 const c=document.createElement('canvas');c.width=128;c.height=512;
 const ctx=c.getContext('2d')!,rand=random(7431),data=ctx.createImageData(128,512);
 const grain=Array.from({length:128},()=>rand()*19);
 for(let y=0;y<512;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,v=204+grain[x]+rand()*7;
  data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);
 const roughnessCanvas=document.createElement('canvas');roughnessCanvas.width=128;roughnessCanvas.height=512;roughnessCanvas.getContext('2d')!.drawImage(c,0,0);
 const roughness=new THREE.CanvasTexture(roughnessCanvas);roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping;roughness.anisotropy=4;
 // Subtle interrupted tool marks vary along the shaft, so the surface does
 // not read as a perfectly uniform gradient even under a soft reflection.
 for(let y=0;y<512;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,v=235+grain[x]*.65+Math.sin(y/89+x*.4)*3+rand()*2;
  data.data[i]=data.data[i+1]=data.data[i+2]=v;
 }
 ctx.putImageData(data,0,0);
 for(let i=0;i<80;i++){ctx.fillStyle=`rgba(92,96,95,${.04+rand()*.04})`;ctx.fillRect(Math.floor(rand()*128),rand()*512,1,24+rand()*140);}
 const surface=new THREE.CanvasTexture(c);surface.colorSpace=THREE.SRGBColorSpace;surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.anisotropy=4;
 return {roughness,surface};
}
export function makeRail(width:number,settings:Settings) {
 const nightMetal={steel:'#424945',brass:'#4d422a',blackened:'#232927'};
 const grain=settings.night?null:brushedRailTexture();
 const group=new THREE.Group(),metal=new THREE.MeshPhysicalMaterial({color:settings.night?nightMetal[settings.rail]:metalColors[settings.rail],metalness:settings.night?.2:.9,roughness:settings.night?.82:settings.rail==='blackened'?.66:.58,envMapIntensity:settings.night?.12:.65,map:grain?.surface??null,roughnessMap:grain?.roughness??null,bumpMap:grain?.roughness??null,bumpScale:.12,anisotropy:settings.night?0:.35,anisotropyRotation:Math.PI/2});
 const rail=mesh(new THREE.CylinderGeometry(settings.night?10:8.5,settings.night?10:8.5,width,80,1,false),metal,group,width/2,0,-2);rail.rotation.z=Math.PI/2;
 if(!settings.night){
  const collarMaterial=new THREE.MeshStandardMaterial({color:settings.rail==='brass'?'#b9a370':'#a6acac',metalness:.9,roughness:.3,envMapIntensity:.65});
  for(const x of [18,width-18]){const collar=mesh(new THREE.CylinderGeometry(9.5,9.5,3,48),collarMaterial,group,x,0,-2);collar.rotation.z=Math.PI/2;}
 }
 for(const x of [8,width-8]) {
   let m=new THREE.MeshPhysicalMaterial({color:settings.endcap==='brass'?'#b59b61':settings.endcap==='jade'?'#9eac8b':settings.night?'#424b4d':'#525655',metalness:settings.endcap==='jade'?.05:.75,roughness:.46,clearcoat:settings.endcap==='jade'?.25:0,roughnessMap:settings.endcap==='plain'?grain?.roughness??null:null,envMapIntensity:.6});
   if(settings.endcap==='pumpkin') m=new THREE.MeshPhysicalMaterial({color:'#ab561d',roughness:.56,clearcoat:.2});
   if(settings.endcap==='mummy') m=new THREE.MeshPhysicalMaterial({map:paintTexture('linen'),roughness:.95});
   if(settings.night){m.roughness=.84;m.metalness=.15;m.clearcoat=0;m.envMapIntensity=.12;}
   mesh(new RoundedBoxGeometry(16,28,23,3,2),m,group,x,0,0);
   if(settings.endcap==='pumpkin'){const eye=new THREE.MeshStandardMaterial({color:'#612d12',emissive:settings.night?'#ff9429':'#000000',emissiveIntensity:1.3});for(const dx of [-3,3])mesh(new THREE.SphereGeometry(1.3,12,6),eye,group,x+dx,2,12).scale.z=.2;line([[x-4,-3,12],[x,-5,12],[x+4,-3,12]],settings.night?'#ffbd4e':'#693215',group,.6);}
   if(settings.endcap==='mummy'){for(let y=-9;y<=9;y+=5)line([[x-7,y+1,12],[x,y-1,12],[x+7,y+1,12]],'#998d75',group,.22);}
 }
 return group;
}

export function makeHammer(rail:Settings['rail'],night=false) {
 // One unlit dark surface at night: no reflections, face shading or shadow.
 const group=new THREE.Group(),steel=night?new THREE.MeshBasicMaterial({color:'#0a0b0a',toneMapped:false}):new THREE.MeshStandardMaterial({color:rail==='brass'?'#a89460':'#a5aca8',metalness:1,roughness:.25});
 // Both pieces share the rear axis. The lower 2px of the shaft enter behind
 // the shell crown; putting this axis at z=8 exposes a black stub below the
 // lens, because the capsule's top surface is only at z=2 there.
 const piston=mesh(new THREE.CylinderGeometry(1.85,1.85,25,32),steel,group,0,10.5,0);
 const head=mesh(new RoundedBoxGeometry(22,6,7,3,.65),steel,group,0,22,0);
 // A separate darker printing face makes the top bevel readable at small sizes.
 const face=mesh(new THREE.BoxGeometry(20,.7,5),night?steel:new THREE.MeshStandardMaterial({color:'#434743',metalness:.8,roughness:.48}),head,0,-2.5,1);
 mesh(new THREE.BoxGeometry(21,1.1,5),night?steel:new THREE.MeshStandardMaterial({color:'#4b514c',metalness:.86,roughness:.3}),head,0,2,2);
 if(night)group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});
 face.castShadow=false;return {group,piston,head};
}
export function setupRenderer(canvas:HTMLCanvasElement,shadows=true,capture=false) {
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:capture,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=THREE.VSMShadowMap;
 const scene=new THREE.Scene(),environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.035);scene.environment=env.texture;environment.dispose();pmrem.dispose();
 scene.environmentIntensity=.65;
 const ambient=new THREE.HemisphereLight('#f6f5ee','#444b4f',.65);scene.add(ambient);
 const key=new THREE.DirectionalLight('#fff5df',1.1);key.position.set(-170,230,800);key.castShadow=shadows;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0002;key.shadow.normalBias=.03;key.shadow.radius=3;key.shadow.blurSamples=8;scene.add(key);
 const fill=new THREE.DirectionalLight('#d9e9ec',.22);fill.position.set(210,40,280);scene.add(fill);
 return {renderer,scene,key,fill,ambient,env};
}
export function disposeTree(root:THREE.Object3D) {
 const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){materials.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);}}});for(const m of materials)m.dispose();for(const t of textures)t.dispose();
}
