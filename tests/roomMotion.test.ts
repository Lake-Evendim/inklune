import test from 'node:test';
import assert from 'node:assert/strict';
import {roomMotionFrame,roomProgress} from '../src/roomMotion.ts';

test('aperture rests at both endpoints and reverses along the same path',()=>{
 const step=.001;
 assert.equal(roomProgress(0),0);assert.equal(roomProgress(1),1);
 assert.ok(roomProgress(step)/step<.0001);
 assert.ok((1-roomProgress(1-step))/step<.0001);
 let before=0;
 for(let i=0;i<=1000;i++){
  const t=i/1000,frame=roomMotionFrame(t,true),reverse=roomMotionFrame(1-t,false);
  assert.ok(frame.progress>=before);before=frame.progress;
  for(const key of ['progress','surface','label'] as const)assert.ok(Math.abs(frame[key]-reverse[key])<1e-12);
 }
});
test('both button endpoints match, while the open room has no transition veil',()=>{
 assert.deepEqual(roomMotionFrame(0,true),{progress:0,surface:1,label:1});
 assert.deepEqual(roomMotionFrame(1,false),{progress:0,surface:1,label:1});
 assert.deepEqual(roomMotionFrame(1,true),{progress:1,surface:0,label:0});
 assert.deepEqual(roomMotionFrame(0,false),{progress:1,surface:0,label:0});
});
test('reversing halfway begins at the current geometry and reaches its new endpoint',()=>{
 for(const from of [.01,.25,.6,.98])for(const enter of [true,false]){
  assert.equal(roomMotionFrame(0,enter,from).progress,from);
  assert.equal(roomMotionFrame(1,enter,from).progress,enter?1:0);
 }
});
