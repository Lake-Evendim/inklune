import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleArcClock} from '../src/wordmarkPacing.ts';

test('thin visible crossings keep the same arc speed as thick strokes',()=>{
 const activity=new Uint8Array(120).fill(200),arc=new Float64Array(120).fill(2);
 activity.fill(1,40,55);
 const map=createVisibleArcClock(activity,arc,0,120);
 assert.equal(map(55)-map(40),15);
 assert.equal(map(75)-map(60),15);
});

test('brief occlusion preserves crossing time while a covered return is skipped',()=>{
 const activity=new Uint8Array(120).fill(1),arc=new Float64Array(120).fill(2);
 activity.fill(0,42,46);activity.fill(0,70,100);
 const map=createVisibleArcClock(activity,arc,0,120);
 assert.ok(Math.abs((map(50)-map(35))-(map(25)-map(10)))<1e-10);
 assert.equal(map(70),map(100));
 assert.equal(map(0),0);assert.equal(map(120),120);
 for(let t=0;t<120;t+=.1)assert.ok(map(t+.1)>=map(t));
});

test('different centreline segment lengths receive proportional travel time',()=>{
 const activity=new Uint8Array(100).fill(1),arc=new Float64Array(100).fill(2);
 arc.fill(4,50);
 const map=createVisibleArcClock(activity,arc,730,1140);
 const first=map(935)-map(730),second=map(1140)-map(935);
 assert.ok(Math.abs(first/100-second/200)<1e-10);
});
