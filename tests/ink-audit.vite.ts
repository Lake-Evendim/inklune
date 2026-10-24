import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const probe=`
  (window as any).__auditProbe=()=>{
   draw();const final=canvas.toDataURL('image/png');
   const visible=[...tiles.values()].filter(t=>t.mesh.visible);
   const set=(wear:number,grain:number,lighting:number)=>{for(const m of [baseMaterial,...visible.map(t=>t.mesh.material)]){m.uniforms.auditWear.value=wear;m.uniforms.auditGrain.value=grain;m.uniforms.auditLight.value=lighting;}};
   const capture=()=>{renderer.render(scene,camera);return canvas.toDataURL('image/png');};
   base.visible=false;const inkOnly=capture();
   set(0,0,1);const pureInk=capture();base.visible=true;const noGrain=capture();
   set(1,1,0);const daylight=capture();
   for(const t of visible)t.mesh.visible=false;set(1,1,1);const stock=capture();
   for(const t of visible)t.mesh.visible=true;
   const clean=document.createElement('canvas');clean.width=canvas.width;clean.height=canvas.height;
   const ctx=clean.getContext('2d')!;ctx.setTransform(rasterScaleX,0,0,rasterScaleY,0,-feed*rasterScaleY);ctx.font=font;ctx.fillStyle='#222';ctx.textBaseline='alphabetic';
   for(const glyph of glyphs.current)printGlyph(ctx,glyph);
   for(const t of visible)t.texture.magFilter=THREE.NearestFilter;
   base.visible=false;set(0,0,1);const nearestInk=capture();
   for(const t of visible)t.texture.magFilter=THREE.LinearFilter;
   base.visible=true;set(1,1,1);capture();
   return {font,width,height,feed,areaX,areaY,band:shape.current.band,scaleX:rasterScaleX,scaleY:rasterScaleY,final,stock,inkOnly,pureInk,noGrain,daylight,nearestInk,clean:clean.toDataURL('image/png'),light:light.toDataURL('image/png'),glyphs:glyphs.current.map(g=>({text:g.text,x:g.x,top:g.top,baseline:g.baseline,width:g.width})),tiles:[...tiles].map(([index,tile])=>({index,start:index*tileSize-gutter,image:tile.canvas.toDataURL('image/png')}))};
  };
`;
export default defineConfig({plugins:[{name:'ink-audit',enforce:'pre',transform(code,id){
 const path=id.replaceAll('\\','/');
 if(path.endsWith('/src/Editor.tsx'))return code.replace("from './usePaperRoll'","from '../tests/ink-audit-roll'").replace("from './usePaperLighting'","from '../tests/ink-audit-lighting'").replace('writingTypeface(settings)',"writingTypeface(settings).replace(new URLSearchParams(location.search).get('mode')==='before'?'\"Noto Serif SC Ink\", ':'__none__','')");
 if(path.endsWith('/src/usePaperRoll.ts')||path.endsWith('/tests/ink-audit-before-roll.ts'))return code
  .replace('try{renderer=',"try{if(new URLSearchParams(location.search).has('fallback'))throw new Error('Audit fallback');renderer=")
  .replace('uniform sampler2D map, lightMap','uniform float auditWear,auditGrain,auditLight; uniform sampler2D map, lightMap')
  .replace('c.a*=protectedWear(neighbours,wear);pigmentGrain=grainTone(neighbours,wear);','c.a*=mix(1.0,protectedWear(neighbours,wear),auditWear);pigmentGrain=grainTone(neighbours,wear)*auditGrain;')
  .replace('rgb,nightAmount)','rgb,nightAmount*auditLight)')
  .replace('uniforms:{map:', 'uniforms:{auditWear:{value:1},auditGrain:{value:1},auditLight:{value:1},map:')
  .replace('  const resize=()=>',probe+'  const resize=()=>');
}},react()],server:{host:'127.0.0.1',port:5175,strictPort:true}});
