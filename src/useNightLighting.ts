import { useLayoutEffect, useRef, useState } from 'react';
import { createLampIgnition } from './lampIgnition';
import type { LampFrame } from './lampIgnition';

export default function useNightLighting(night: boolean, visible: boolean) {
  const clock = useRef(createLampIgnition(night));
  const frame = useRef<LampFrame>({sceneNight: night, amount: 0, projection: 0, phase: 'off'});
  const repaint = useRef<(() => void) | null>(null);
  const [sceneNight, setSceneNight] = useState(night);
  useLayoutEffect(() => {
    let animation = 0, disposed = false;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const paint = (now: number) => {
      if (disposed) return;
      const next = clock.current.sample(now);
      const previous = frame.current; frame.current = next;
      if (previous.sceneNight !== next.sceneNight) setSceneNight(next.sceneNight);
      if (previous.amount !== next.amount || previous.projection !== next.projection || previous.phase !== next.phase) repaint.current?.();
      if (next.phase === 'waiting' || next.phase === 'projecting' || (!night && next.sceneNight)) animation = requestAnimationFrame(paint);
    };
    const start = () => { cancelAnimationFrame(animation); clock.current.request(night, visible, performance.now(), preference.matches); paint(performance.now()); };
    start(); preference.addEventListener('change', start);
    return () => { disposed = true; cancelAnimationFrame(animation); preference.removeEventListener('change', start); };
  }, [night, visible]);
  return { sceneNight, frame, repaint };
}
