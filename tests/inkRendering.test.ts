import test from 'node:test';
import assert from 'node:assert/strict';
import {paperRasterSize,paperScreenGrid,paperInkChannel,protectedInkWear,inkGrainTone} from '../src/inkRendering.ts';
import {inkStyle} from '../src/typing.ts';

test('texture keeps hairlines solid and reserves transparent pores for broad interiors',()=>{
 assert.equal(protectedInkWear(0,0),1);
 assert.equal(protectedInkWear(.7,0),1);
 assert.equal(protectedInkWear(1,.32),1);
 assert.equal(protectedInkWear(1,.65),1);
 assert.equal(protectedInkWear(1,0),.52);
 assert.equal(protectedInkWear(1,1),1);
 for(let coverage=0;coverage<=1;coverage+=.1){
  const retention=protectedInkWear(coverage,.2);
  assert.ok(retention>=.52-1e-12&&retention<=1+1e-12);
 }
});
test('moderate pigment wear remains visible through colour without thinning the stroke',()=>{
 assert.equal(protectedInkWear(1,.5),1);
 assert.ok(inkGrainTone(1,.5)>10);
 assert.equal(inkGrainTone(0,.5),3);
 assert.equal(inkGrainTone(1,1),0);
 assert.equal(inkGrainTone(1,0),40);
});
test('character identity changes pigment tone instead of whole-glyph transparency',()=>{
 for(const seed of [0,1,4,100,0xffffffff]){
  const style=inkStyle(seed);
  assert.equal(style.opacity,1);
  assert.ok(style.tone>=-2&&style.tone<=2);
  assert.ok(Math.abs(paperInkChannel(83,style.tone)-paperInkChannel(83))<=2);
 }
});
test('ink depth retains a meaningful pigment range without changing glyph coverage',()=>{
 assert.equal(paperInkChannel(100),8);
 assert.equal(paperInkChannel(83),34);
 assert.ok(paperInkChannel(45)>paperInkChannel(83));
 assert.equal(paperInkChannel(0),paperInkChannel(45));
});

test('fractional DPR uses the same integer width for the paper and ink',()=>{
 const raster=paperRasterSize(306,781,1.25);
 assert.equal(raster.pixelWidth,383);
 assert.equal(raster.pixelHeight,976);
 assert.ok(Math.abs(306*raster.scaleX-raster.pixelWidth)<1e-9);
 assert.ok(Math.abs(781*raster.scaleY-raster.pixelHeight)<1e-9);
});
test('native 3x phone resolution fits, while large sheets stay within the pixel budget',()=>{
 const phone=paperRasterSize(306,781,3);
 assert.equal(phone.pixelRatio,3);
 assert.equal(phone.pixelWidth,918);
 for(const [width,height,dpr] of [[1800,1400,3],[2400,1600,4],[1000,1000,2]]){
  const raster=paperRasterSize(width,height,dpr);
  assert.ok(raster.pixelWidth*raster.pixelHeight<=4_000_000);
  assert.ok(raster.pixelRatio<=dpr);
 }
});
test('density changes update physical ink resolution without changing the sheet size',()=>{
 const standard=paperRasterSize(780,648,1),scaled=paperRasterSize(780,648,1.5);
 assert.equal(standard.pixelWidth,780);
 assert.equal(scaled.pixelWidth,1170);
 assert.equal(scaled.pixelHeight,972);
 assert.equal(scaled.pixelWidth/scaled.scaleX,780);
 assert.equal(scaled.pixelHeight/scaled.scaleY,648);
});
test('screen origin and extent remain on physical pixels at fractional zoom',()=>{
 for(const dpr of [1,1.25,1.5,2,3]){
  const grid=paperScreenGrid(250,60.13,306,648.2,dpr);
  for(const value of Object.values(grid))assert.ok(Math.abs(value*dpr-Math.round(value*dpr))<1e-8);
  assert.ok(Math.abs(grid.x-250)<=.5/dpr+1e-8);
  const raster=paperRasterSize(306,648.2,dpr);
  assert.equal(Math.round(grid.width*dpr),raster.pixelWidth);
  assert.equal(Math.round(grid.height*dpr),raster.pixelHeight);
 }
});
