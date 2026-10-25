import assert from 'node:assert/strict';
import test from 'node:test';
import {lampLensTint,lampTemperature,lampTint,lampWarmthRange} from '../src/lamp.ts';
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
