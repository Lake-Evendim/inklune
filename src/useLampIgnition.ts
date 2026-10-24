import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import type { LampFrame } from './lampIgnition';

export type LampControl = { frame: RefObject<LampFrame>; repaint: RefObject<(() => void) | null> };
type Refs = { root: RefObject<HTMLDivElement | null>; lighting: RefObject<(() => void) | null>; mechanism: RefObject<(() => void) | null> };
export default function useLampIgnition(refs: Refs, control: LampControl) {
  useLayoutEffect(() => {
    const paint = () => {
      const root = refs.root.current;
      if (!root) return;
      const state = control.frame.current;
      root.dataset.lampPhase = state.phase;
      root.style.setProperty('--lamp-ignition', String(state.amount));
      refs.lighting.current?.(); refs.mechanism.current?.();
    };
    control.repaint.current = paint; paint();
    return () => { if (control.repaint.current === paint) control.repaint.current = null; };
  }, [refs.root, refs.lighting, refs.mechanism, control.frame, control.repaint]);
  return control.frame;
}
