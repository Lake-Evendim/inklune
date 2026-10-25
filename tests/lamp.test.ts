import assert from 'node:assert/strict';
import test from 'node:test';
import {lampContour,lampLensTint,lampTemperature,lampTint,lampWarmthRange} from '../src/lamp.ts';
import {defaults} from '../src/storage.ts';

test('expanded temperature range retains saved temperatures and the requested default',()=>{
  assert.equal(lampTemperature(lampWarmthRange.min),12000);
  assert.equal(lampTemperature(lampWarmthRange.max),1500);
  assert.equal(lampTemperature(defaults.warmth),2500);
  assert.equal(lampTemperature(0),7500);
  assert.equal(lampTemperature(66),4200);
  assert.equal(lampTemperature(50),5000);
  assert.deepEqual(lampTint(100),[255,174,101]);
  assert.deepEqual(lampTint(66),[238,230,212]);
  assert.deepEqual(lampTint(0),[191,217,255]);
});

test('lamp sides and penumbra are straight beyond the short aperture transition',()=>{
  assert.deepEqual(lampContour(0),{expansion:0,feather:0});
  assert.deepEqual(lampContour(-5),lampContour(0));
  for(const reach of [40/120,1,200/120])for(const angle of [50,112,130,160]){
    const spread=Math.tan(angle/2*Math.PI/180)/Math.tan(56*Math.PI/180);
    for(const edge of [-3,0,3]){
      const boundary=(height:number)=>{
        const {expansion,feather}=lampContour(height);
        return 10+expansion*reach*spread+edge*(.55+feather*reach*Math.sqrt(spread));
      };
      const start=boundary(30),slope=(boundary(50)-start)/20;
      for(const height of [31,70,110,175,225])assert.ok(Math.abs(boundary(height)-start-slope*(height-30))<1e-9);
    }
  }
});

test('rounded launch joins the straight cone with continuous slope and curvature',()=>{
  const step=.001;
  for(const key of ['expansion','feather'] as const){
    const at=(h:number)=>lampContour(h)[key];
    const leftSlope=(at(30)-at(30-step))/step,rightSlope=(at(30+step)-at(30))/step;
    const leftCurve=(at(30)-2*at(30-step)+at(30-2*step))/(step*step);
    assert.ok(Math.abs(leftSlope-rightSlope)<1e-7);
    assert.ok(Math.abs(leftCurve)<1e-5);
    for(let height=1;height<=225;height++)assert.ok(at(height)>at(height-1));
  }
});

test('lamp contour matches measured official night-image cross sections',()=>{
  // Right-hand edge fits, in 430px sheet coordinates. Text and decorations
  // make the farthest rows unreliable, so use the clear 30–130px sections.
  // https://apps.apple.com/us/app/platen-paper-ink/id6809529696
  for(const [height,radius,softness] of [[30,47.9,3.915],[50,67.511,6.606],[70,88.798,9.044],[110,131.041,14.106],[130,153.965,16.206]]){
    const actual=lampContour(height);
    assert.ok(Math.abs(10+actual.expansion-radius)<2);
    assert.ok(Math.abs(.55+actual.feather-softness)<.8);
  }
});

test('expanded colours are bounded, continuous and distinct at both ends',()=>{
  let previous=lampTint(lampWarmthRange.min);
  for(let warmth=lampWarmthRange.min;warmth<=lampWarmthRange.max;warmth++){
    const next=lampTint(warmth);
    for(const rgb of [next,lampLensTint(warmth)])assert.ok(rgb.every(c=>Number.isInteger(c)&&c>=0&&c<=255));
    assert.ok(next.every((c,i)=>Math.abs(c-previous[i])<=4));
    previous=next;
  }
  const candle=lampTint(lampWarmthRange.max),cool=lampTint(lampWarmthRange.min);
  assert.ok(candle[0]-candle[2]>lampTint(100)[0]-lampTint(100)[2]);
  assert.ok(cool[2]-cool[0]>lampTint(0)[2]-lampTint(0)[0]);
  assert.deepEqual(lampTint(-1000),cool);
  assert.deepEqual(lampTint(1000),candle);
  assert.equal(lampTemperature(NaN),2500);
});
