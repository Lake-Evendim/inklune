import test from 'node:test';
import assert from 'node:assert/strict';
import {paperReturnLayout,paperReturnSurface,projectPaper,unprojectPaper} from '../src/paperGeometry.ts';
test('visible surface is invertible at every curvature and viewport',()=>{
 for(const width of [340,466,780,820])for(const height of [420,560,648])for(const amount of [0,.2,.5,.8,1]){
  const shape={width,height,band:paperReturnLayout(width,height).band,amount};
  let previous=-Infinity;
  for(let y=0;y<=height;y+=.7){const s=unprojectPaper(y,shape);assert.ok(s>previous);assert.ok(Math.abs(projectPaper(s,shape).y-y)<.00001);previous=s;}
 }
});
test('upper return joins smoothly; the entire lower sheet stays flat',()=>{
 const shape={width:780,height:648,band:140,amount:1};
 for(let s=140;s<=800;s++){assert.deepEqual(projectPaper(s,shape),{y:s,scale:1,shade:1});}
 const a=projectPaper(140-.001,shape),b=projectPaper(140+.001,shape);assert.ok(Math.abs((b.y-a.y)/.002-1)<.0001);assert.ok(Math.abs(b.scale-a.scale)<.00001);
 assert.ok(projectPaper(40,shape).scale<1);
});
test('feed moves material along arc length without direction reversals',()=>{
 const shape={width:780,height:648,band:140,amount:1};
 for(const sheetRow of [40,90,140,300,510,600]){let previous=Infinity;for(let feed=0;feed<80;feed+=.25){const y=projectPaper(sheetRow-feed,shape).y;assert.ok(y<=previous);previous=y;}}
});
test('crest turns into the top edge instead of a clipped straight bevel',()=>{
 for(const width of [298,466,780]){
  const shape={width,height:648,band:width*.205,amount:1},crest=paperReturnSurface(shape).start*shape.band;
  assert.ok(Math.abs(projectPaper(crest,shape).y)<1e-8);
  assert.ok(projectPaper(crest+.05,shape).y/.05<.01);
  const inset=(y:number)=>width*(1-projectPaper(unprojectPaper(y,shape),shape).scale)/2;
  assert.ok(inset(0)-inset(1)>1.5*(inset(3)-inset(4)));
 }
});

test('upstream paper remains ordered and pickable throughout the transition',()=>{
 for(const width of [298,466,780])for(const amount of [.2,.5,1]){
  const shape={width,height:648,band:width*.205,amount};
  let previous=-Infinity;
  for(let s=-shape.band*2;s<shape.band;s+=.35){
   const p=projectPaper(s,shape);assert.ok(p.y>previous);previous=p.y;
   assert.ok(Math.abs(unprojectPaper(p.y,shape)-s)<.00002);
  }
  assert.ok(projectPaper(unprojectPaper(0,shape),shape).scale>0);
 }
});

test('the physical crest stays at the visible top throughout unrolling',()=>{
 for(const width of [298,466,780])for(const amount of [0,.1,.25,.5,.75,.9,1]){
  const shape={width,height:648,band:width*.205,amount},surface=paperReturnSurface(shape),crest=surface.start*shape.band;
  assert.ok(Math.abs(projectPaper(crest,shape).y)<1e-7);
  assert.ok(Math.abs(unprojectPaper(0,shape)-crest)<.00002);
  assert.ok(Math.abs(projectPaper(crest,shape).scale-surface.values[1])<1e-7);
 }
});
