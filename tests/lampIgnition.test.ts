import test from 'node:test';
import assert from 'node:assert/strict';
import { createLampIgnition, lampTiming } from '../src/lampIgnition.ts';

test('the aperture lights before its beam projects from near to far', () => {
  const clock = createLampIgnition();
  clock.request(true, true, 1000);
  const start = 1000 + lampTiming.scene + lampTiming.darkPause;
  assert.equal(clock.sample(start - 1).amount, 0);
  const values = Array.from({length:30}, (_,i) => clock.sample(start + i * 16).projection);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(values.every((value,i) => value >= 0 && value <= 1 && (!i || value >= values[i-1])));
  assert.equal(clock.sample(start + lampTiming.lens).amount, 1);
  assert.ok(clock.sample(start + lampTiming.lens).projection < .1);
  assert.equal(clock.sample(start - 1).sceneNight, true);
});

test('returning to day cancels ignition and a later night switch gets a fresh delay', () => {
  const clock = createLampIgnition();
  clock.request(true, true, 0);
  clock.request(false, true, 300);
  assert.deepEqual(clock.sample(5000), {sceneNight:false,amount:0,projection:0,phase:'off'});
  clock.request(true, true, 5000);
  assert.equal(clock.sample(5500).amount, 0);
  assert.equal(clock.sample(6200).projection, 1);
});

test('a hidden writer cannot light up and waits until its room is revealed', () => {
  const clock = createLampIgnition();
  clock.request(true, false, 0);
  assert.deepEqual(clock.sample(5000), {sceneNight:true,amount:0,projection:0,phase:'off'});
  clock.request(true, true, 5000);
  assert.equal(clock.sample(5000 + lampTiming.darkPause - 1).amount, 0);
  assert.equal(clock.sample(5600).projection, 1);
  clock.request(true, false, 5400);
  assert.equal(clock.sample(9000).amount, 0);
});

test('ordinary repaint requests preserve progress; reduced motion keeps sequencing without a ramp', () => {
  const clock = createLampIgnition();
  clock.request(true, true, 0);
  const middle = lampTiming.scene + lampTiming.darkPause + lampTiming.ignition / 2;
  const before = clock.sample(middle);
  clock.request(true, true, middle);
  assert.deepEqual(clock.sample(middle), before);
  const reduced = createLampIgnition();
  reduced.request(true, true, 0, true);
  assert.equal(reduced.sample(lampTiming.darkPause - 1).amount, 0);
  assert.equal(reduced.sample(lampTiming.darkPause).amount, 1);
  assert.equal(reduced.sample(lampTiming.darkPause).projection, 1);
});

test('switching off immediately extinguishes the beam and aperture before daylight', () => {
  const clock = createLampIgnition(true);
  clock.request(true, true, 0);
  assert.equal(clock.sample(1000).projection, 1);
  clock.request(false, true, 1000);
  const off = 1000;
  assert.deepEqual(clock.sample(off), {sceneNight:true,amount:0,projection:0,phase:'off'});
  assert.equal(clock.sample(off + lampTiming.offPause - 1).sceneNight, true);
  assert.equal(clock.sample(off + lampTiming.offPause).sceneNight, false);
});

test('switching off mid-ignition is immediate and relighting starts after a fresh dark pause', () => {
  const clock = createLampIgnition(true);
  clock.request(true, true, 0);
  const middle = lampTiming.darkPause + lampTiming.ignition / 2;
  assert.equal(clock.sample(middle).projection, .5);
  assert.equal(clock.sample(middle).amount, 1);
  clock.request(false, true, middle);
  assert.deepEqual(clock.sample(middle), {sceneNight:true,amount:0,projection:0,phase:'off'});
  const reverse = middle + lampTiming.offPause / 2;
  clock.request(true, true, reverse);
  assert.deepEqual(clock.sample(reverse + lampTiming.darkPause - 1), {sceneNight:true,amount:0,projection:0,phase:'waiting'});
  assert.equal(clock.sample(reverse + lampTiming.darkPause).projection, 0);
  assert.deepEqual(clock.sample(reverse + lampTiming.darkPause + lampTiming.ignition), {sceneNight:true,amount:1,projection:1,phase:'on'});
});
