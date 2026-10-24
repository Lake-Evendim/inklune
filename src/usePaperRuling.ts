import { useCallback, useEffect, useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { paperLineStep, rulingGap } from './ruling';

export default function usePaperRuling(mirror: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const measure = useCallback(() => {
    if (!enabled) return;
    const text = mirror.current, area = text?.parentElement;
    const baseline = text?.querySelector<HTMLElement>('.rule-baseline-marker');
    if (!text || !area || !baseline) return;
    const style = getComputedStyle(text);
    const size = Number.parseFloat(style.fontSize), computedStep = Number.parseFloat(style.lineHeight);
    if (!Number.isFinite(size) || !Number.isFinite(computedStep) || computedStep <= 0) return;
    const step = paperLineStep(text);
    const thickness = Math.max(.55, Math.min(1, size / 32));
    const first = baseline.getBoundingClientRect().bottom - area.getBoundingClientRect().top + rulingGap(size);
    area.style.setProperty('--rule-step', `${step}px`);
    area.style.setProperty('--rule-thickness', `${thickness}px`);
    area.style.setProperty('--rule-offset', `${first - thickness / 2}px`);
  }, [mirror, enabled]);
  // Re-measure after edits and settings changes, including a new first row.
  useLayoutEffect(measure);
  useEffect(() => {
    if (!enabled) return;
    const observer = new ResizeObserver(measure);
    if (mirror.current) observer.observe(mirror.current);
    let disposed = false;
    const fontsChanged = () => { if(mirror.current)paperLineStep(mirror.current,true); measure(); };
    void document.fonts.ready.then(() => { if (!disposed) fontsChanged(); });
    document.fonts.addEventListener('loadingdone', fontsChanged);
    const text = mirror.current;
    text?.addEventListener('paper-layout-change', measure);
    window.addEventListener('resize', measure);
    return () => { disposed = true; observer.disconnect(); text?.removeEventListener('paper-layout-change', measure); document.fonts.removeEventListener('loadingdone', fontsChanged); window.removeEventListener('resize', measure); };
  }, [mirror, measure, enabled]);
}
