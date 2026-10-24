import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { mechanicalSound } from './sound';
import { paperLineStep } from './ruling';
import { paperReturnLayout } from './paperGeometry';

type Point = { x: number; y: number; feed: number; travel: number };
export type MotionKind = 'print' | 'space' | 'return' | 'delete' | 'paste' | 'composition';
export type MotionRequest = { kind: MotionKind; start?: number; end?: number; sound: boolean };
type Action = { kind: MotionKind | 'navigate'; from: Point; contact: Point; to: Point; glyphs: HTMLElement[]; sound: boolean; started: number; duration: number; impacted: boolean; hit: boolean; wraps: boolean; lead: number };
type MotionRefs = {
  root: RefObject<HTMLDivElement | null>; paper: RefObject<HTMLDivElement | null>;
  mirror: RefObject<HTMLDivElement | null>; input: RefObject<HTMLTextAreaElement | null>;
  selection: RefObject<number>; drawLighting: RefObject<(() => void) | null>;
  drawMechanism: RefObject<(() => void) | null>;
  drawPaper: RefObject<((refreshLayout?: boolean) => void) | null>;
  scrollTrack: RefObject<HTMLDivElement | null>;
};
const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, feed: a.feed + (b.feed - a.feed) * t, travel: a.travel + (b.travel - a.travel) * t });
function frameHeight(paper: HTMLElement, top = paper.getBoundingClientRect().top) {
  const assembly = paper.closest<HTMLElement>('.desk .typewriter-assembly');
  if (assembly) return Math.min(paper.clientHeight, assembly.clientHeight);
  return window.innerWidth > 760 ? Math.max(0, Math.min(paper.clientHeight, window.innerHeight - Math.max(0, top) - 104)) : paper.clientHeight;
}
export default function useTypewriterMotion(refs: MotionRefs, noteId: string, text: string) {
  const current = useRef<Point>({ x: 80, y: 135, feed: 0, travel: 18 });
  const initialized = useRef(false), currentNote = useRef(noteId), reduced = useRef(false);
  const frame = useRef(0), fallback = useRef(0), tick = useRef<(time: number) => void>(() => {});
  const pending = useRef<MotionRequest[]>([]), queue = useRef<Action[]>([]), active = useRef<Action | null>(null);
  const maxFeed = useRef(0), scale = useRef(1);
  const strikes = useRef(0);
  const scroller = useRef<HTMLElement | null>(null);
  const browsing = useRef(false);
  const lastMechanismPaint = useRef('');
  const selfScroll = useRef<number | null>(null);

  const paint = useCallback((extension = 0) => {
    const root = refs.root.current;
    if (!root) return;
    if (scroller.current && Math.abs(scroller.current.scrollTop-current.current.feed)>.01) {
      scroller.current.scrollTop=current.current.feed;
      const actual=scroller.current.scrollTop;
      selfScroll.current=actual;
      // Native scroll positions are quantised at the device-pixel scale.
      // Keep the ink and contact point on that same physical sheet position.
      if(Math.abs(actual-current.current.feed)<1.1){current.current.y+=current.current.feed-actual;current.current.feed=actual;}
    }
    for (const [name, value] of Object.entries({ 'carriage-x': current.current.x, 'carriage-y': current.current.y, 'paper-feed': current.current.feed, 'hammer-extension': extension })) root.style.setProperty(`--${name}`, `${value.toFixed(3)}px`);
    refs.input.current?.style.setProperty('--native-input-feed',`${current.current.feed.toFixed(3)}px`);
    refs.paper.current?.querySelector<HTMLElement>('.bookmark')?.style.setProperty('--native-input-feed',`${current.current.feed.toFixed(3)}px`);
    root.style.setProperty('--impact-travel', `${current.current.travel.toFixed(3)}px`);
    // Native wheel, touch and scrollbar movement share this same feed position.
    // Animation writes back to the native track; its matching scroll event is
    // ignored so it cannot cancel a printing stroke.
    const mechanismState = [current.current.x,current.current.y,scale.current,extension,root.dataset.motion,root.dataset.strikes].join('|');
    if (mechanismState !== lastMechanismPaint.current) {
      lastMechanismPaint.current = mechanismState;
      refs.drawLighting.current?.();
      refs.drawMechanism.current?.();
    }
    refs.drawPaper.current?.();
  }, [refs.root, refs.drawLighting, refs.drawMechanism]);
  const schedule = useCallback(() => {
    if (frame.current || fallback.current) return;
    let completed = false;
    const run = (time: number) => {
      if (completed) return;
      completed = true; cancelAnimationFrame(frame.current); clearTimeout(fallback.current);
      frame.current = fallback.current = 0; tick.current(time);
    };
    frame.current = requestAnimationFrame(run);
    fallback.current = window.setTimeout(() => run(performance.now()), 24);
  }, []);
  const clear = useCallback(() => {
    cancelAnimationFrame(frame.current); clearTimeout(fallback.current); frame.current = fallback.current = 0;
    for (const action of [...queue.current, ...(active.current ? [active.current] : [])]) for (const glyph of action.glyphs) glyph.style.visibility = '';
    pending.current = []; queue.current = []; active.current = null;
    refs.root.current?.setAttribute('data-motion', 'idle');
    refs.root.current?.style.setProperty('--hammer-extension', '0px');
  }, [refs.root]);
  const pointAt = useCallback((offset: number, contact = false): Point => {
    const paper = refs.paper.current, mirror = refs.mirror.current;
    if (!paper || !mirror) return current.current;
    const returnLayout=paperReturnLayout(paper.clientWidth,frameHeight(paper));
    refs.root.current?.style.setProperty('--paper-writing-top',`${returnLayout.writingTop.toFixed(3)}px`);
    const glyphs = [...mirror.querySelectorAll<HTMLElement>('[data-start]')];
    const element = glyphs.find(g => Number(g.dataset.end) > offset || Number(g.dataset.start) === offset) || mirror.querySelector<HTMLElement>('.end-marker')!;
    const paperBox = paper.getBoundingClientRect(), box = element.getBoundingClientRect(), area = mirror.getBoundingClientRect();
    const style = getComputedStyle(mirror), lineHeight = paperLineStep(mirror), size = parseFloat(style.fontSize);
    // DOMRects preserve subpixel percentage margins; offsetTop rounds them.
    // Add the rendered feed back to measure the unscrolled sheet coordinates.
    const renderedFeed = parseFloat(refs.root.current?.style.getPropertyValue('--paper-feed') || '0') || 0;
    const startY = area.top - paperBox.top + (paper.classList.contains('has-paper-roll') ? 0 : renderedFeed);
    const row = Math.max(0, Math.round((box.top - area.top) / lineHeight));
    const end = mirror.querySelector<HTMLElement>('.end-marker')!;
    const lastRow = Math.max(0, Math.round((end.getBoundingClientRect().top - area.top) / lineHeight));
    // An empty zero-height inline block exposes the real baseline. The existing
    // end marker contains text, so its bottom includes the font's descent.
    const baselineMarker = mirror.querySelector<HTMLElement>('.rule-baseline-marker')!;
    const baseline = startY + baselineMarker.getBoundingClientRect().bottom - area.top + row * lineHeight;
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${size}px ${style.fontFamily}`;
    const face = context.measureText('.');
    const targetY = baseline - (face.actualBoundingBoxAscent - face.actualBoundingBoxDescent) / 2;
    // The reference cursor sits at the period, close to the baseline. The
    // Rest with a visible gap below the period; extend to that exact target
    // during contact. The gap scales with both paper and rendered type size.
    const travel = scale.current + size * .55;
    // The rail center is 11s below carriage-y; the 43s capsule shares that
    // center. Its top is carriage-y - 10.5s; the hammer face is 19s above.
    const railY = targetY + 29.5 * scale.current + travel;
    // A desktop sheet may continue below the visible desk. Feed against the
    // visible writing area so the carriage stays above the fixed tool dock.
    const visibleHeight = frameHeight(paper, paperBox.top);
    const preferredHeight = Math.max(startY + lineHeight * 2 + 52 * scale.current, visibleHeight * .47);
    const writingHeight = Math.min(preferredHeight, Math.max(startY + lineHeight, visibleHeight - 58 * scale.current));
    const feed = Math.max(0, railY - writingHeight);
    const min = 52 * scale.current, max = paper.clientWidth - min;
    const x = box.left - paperBox.left + (contact ? box.width / 2 : 2 * scale.current);
    // The printing face reaches the same period-height target as the cursor.
    maxFeed.current = Math.max(0, railY + (lastRow-row)*lineHeight - writingHeight);
    refs.scrollTrack.current?.style.setProperty('--feed-range', `${Math.ceil(maxFeed.current)}px`);
    refs.root.current?.setAttribute('data-row', String(row));
    return { x: Math.max(min, Math.min(max, x)), y: railY - feed, feed, travel };
  }, [refs.paper, refs.mirror, refs.root, refs.scrollTrack]);
  const enqueue = useCallback((request: MotionRequest | { kind: 'navigate'; sound: boolean }, allowFeed = true) => {
    if (request.kind === 'delete' || request.kind === 'paste') clear();
    const caret = refs.selection.current, to = pointAt(caret);
    if (!allowFeed) {
      const paper = refs.paper.current!;
      const maxY = Math.max(0, frameHeight(paper) - 58 * scale.current);
      const rollBand = paper.classList.contains('curved') || Number(paper.dataset.roll) > 0 ? paperReturnLayout(paper.clientWidth,frameHeight(paper)).band : 0;
      const leading = paperLineStep(refs.mirror.current!);
      // A picked row in the return must come back onto the flat printing
      // belt before the carriage follows it. Otherwise its unprojected
      // baseline would place the hammer/cursor against a different location.
      const minY = Math.max(to.travel + 35 * scale.current, rollBand > 0 ? rollBand + leading + 29.5 * scale.current + to.travel : 0);
      const visibleY = to.y + to.feed - current.current.feed;
      // Keep a visible selection in place. Moving to an offscreen line reveals
      // it through the same native scroll position instead of clamping the
      // hammer onto an unrelated visible line.
      if (visibleY >= minY && visibleY <= maxY) { to.y = visibleY; to.feed = current.current.feed; }
    }
    if (reduced.current) { current.current = to; paint(); return; }
    let contact = to;
    const glyphs: HTMLElement[] = [];
    if (request.kind === 'print' && 'start' in request && request.start !== undefined) {
      contact = pointAt(request.start, true);
      for (const glyph of refs.mirror.current?.querySelectorAll<HTMLElement>('[data-start]') || []) {
        if (Number(glyph.dataset.start) >= request.start && Number(glyph.dataset.start) < (request.end ?? caret)) { glyph.style.visibility = 'hidden'; glyphs.push(glyph); }
      }
    }
    const hit = request.kind === 'print' || request.kind === 'composition';
    const duration = hit ? 148 : request.kind === 'return' ? 280 : request.kind === 'paste' ? 120 : 90;
    const wraps = hit && to.y + to.feed > contact.y + contact.feed + 5;
    const preceding = queue.current.at(-1)?.to ?? active.current?.to ?? current.current;
    const lead = hit && contact.y + contact.feed > preceding.y + preceding.feed + 5 && contact.x < preceding.x ? 220 : 0;
    // Bound visual latency during fast hardware-keyboard input. Skipped impulses
    // reveal their ink; the textarea and persisted note never lose characters.
    if (queue.current.length >= 5) {
      const skipped = queue.current.shift()!;
      for (const glyph of skipped.glyphs) glyph.style.visibility = '';
    }
    queue.current.push({ kind: request.kind, from: current.current, contact, to, glyphs, sound: request.sound, started: 0, duration: duration + (wraps ? 220 : 0), impacted: false, hit, wraps, lead }); schedule();
  }, [refs.selection, refs.mirror, refs.paper, pointAt, schedule, clear, paint]);
  tick.current = (time: number) => {
    if (!active.current) {
      active.current = queue.current.shift() || null;
      if (!active.current) { refs.root.current?.setAttribute('data-motion', 'idle'); paint(); return; }
      const action = active.current; action.from = { ...current.current }; action.started = time;
      if (queue.current.length > 1 && action.hit) action.duration = action.wraps ? 312 : 92;
      refs.root.current?.setAttribute('data-motion', action.kind);
      if (action.sound && !action.hit) mechanicalSound(action.kind === 'return' ? 'return' : action.kind === 'space' ? 'space' : action.kind === 'delete' ? 'delete' : 'paper');
    }
    if (active.current.lead && time - active.current.started < active.current.lead) {
      const action = active.current;
      refs.root.current?.setAttribute('data-motion', 'return');
      current.current = mix(action.from, action.contact, ease((time - action.started) / action.lead));
      paint(); schedule(); return;
    }
    if (active.current.lead) { active.current.started += active.current.lead; active.current.from = active.current.contact; active.current.lead = 0; refs.root.current?.setAttribute('data-motion', active.current.kind); }
    const action = active.current;
    const strikeDuration = action.wraps ? action.duration - 220 : action.duration;
    // A slow GPU frame must not skip the printing face's full contact. Restart
    // the contact hold at its first rendered frame, then retract and advance.
    if (action.hit && !action.impacted && time - action.started >= strikeDuration * .28) action.started = time - strikeDuration * .28;
    const t = Math.min(1, (time - action.started) / action.duration);
    const strikeProgress = action.wraps ? Math.min(1, (time - action.started) / strikeDuration) : t;
    let extension = 0;
    if (action.hit) {
      current.current = strikeProgress < .12 ? mix(action.from, action.contact, ease(strikeProgress / .12)) : strikeProgress < .75 ? action.contact : mix(action.contact, action.to, ease(action.wraps ? (time - action.started - (action.duration - 220) * .75) / (220 + (action.duration - 220) * .25) : (t - .75) / .25));
      const travel = action.contact.travel;
      if (strikeProgress >= .12 && strikeProgress < .28) extension = travel * ease((strikeProgress - .12) / .16);
      else if (strikeProgress >= .28 - 1e-6 && strikeProgress < .50) extension = travel;
      else if (strikeProgress >= .50 && strikeProgress < .75) extension = travel * (1 - ease((strikeProgress - .50) / .25));
      if (strikeProgress >= .28 - 1e-6 && !action.impacted) { action.impacted = true; strikes.current++; refs.root.current?.setAttribute('data-strikes', String(strikes.current)); for (const glyph of action.glyphs) glyph.style.visibility = ''; if (action.sound) mechanicalSound('key'); }
      if (action.wraps && strikeProgress >= .75) refs.root.current?.setAttribute('data-motion', 'return');
    } else current.current = mix(action.from, action.to, ease(t));
    paint(extension);
    if (t < 1) schedule();
    else { current.current = action.to; active.current = null; paint(); schedule(); }
  };
  const request = useCallback((action: MotionRequest) => { browsing.current = false; pending.current.push(action); }, []);
  const previewStrike = useCallback((sound: boolean) => enqueue({ kind: 'composition', sound }), [enqueue]);
  const select = useCallback((caret: number) => {
    if (caret === refs.selection.current && !browsing.current) return;
    browsing.current = false; clear(); refs.selection.current = caret; enqueue({ kind: 'navigate', sound: false }, false);
  }, [refs.selection, clear, enqueue]);
  const measure = useCallback((follow = false) => {
    if (!refs.paper.current) return;
    if (follow) browsing.current = false;
    scale.current = refs.paper.current.clientWidth / 430;
    refs.root.current?.style.setProperty('--mechanism-scale', String(scale.current));
    refs.root.current?.style.setProperty('--paper-grain-size', `${scale.current * 512}px`);
    if (refs.input.current) refs.input.current.scrollTop = 0;
    const destination = pointAt(refs.selection.current);
    if (!initialized.current) { clear(); current.current = destination; initialized.current = true; paint(); return; }
    if (pending.current.length) for (const action of pending.current.splice(0)) enqueue(action, action.kind !== 'paste');
    else if (!active.current && !queue.current.length) {
      if (follow) { clear(); current.current = destination; paint(); }
      else if (!browsing.current && (Math.abs(destination.x - current.current.x) > .5 || Math.abs(destination.y + destination.feed - current.current.y - current.current.feed) > .5)) enqueue({ kind: 'navigate', sound: false }, false);
    }
  }, [refs.paper, refs.root, refs.input, refs.selection, pointAt, clear, paint, enqueue]);
  useLayoutEffect(() => {
    if (currentNote.current !== noteId) { browsing.current = false; clear(); currentNote.current = noteId; refs.selection.current = text.length; initialized.current = false; }
    measure();
  });
  // Register layout observers before the light/surface observers. A new sheet
  // size must publish the carriage and scale before those layers can paint.
  useLayoutEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { reduced.current = preference.matches; if (preference.matches) measure(true); };
    change(); preference.addEventListener('change', change);
    const resize = () => {
      if (refs.mirror.current) { paperLineStep(refs.mirror.current, true); refs.mirror.current.dispatchEvent(new Event('paper-layout-change')); }
      clear(); measure(true); refs.drawPaper.current?.(true);
    };
    const observer = new ResizeObserver(resize); if (refs.paper.current) observer.observe(refs.paper.current); if (refs.root.current) observer.observe(refs.root.current);
    window.addEventListener('resize', resize); let cancelled = false;
    void document.fonts.ready.then(() => { if (!cancelled) resize(); });
    // ready describes the current loading cycle. A later font (or another
    // unicode subset) can rewrap the ink without resizing the fixed sheet.
    // Reposition in the same event turn as the paper/ruling renderers.
    document.fonts.addEventListener('loadingdone', resize);
    // FontFaceSet's completion event may arrive after the browser has already
    // swapped a face. Observe its actual glyph width before that paint. A
    // separate probe avoids cancelling print strokes when note height changes.
    const mirror = refs.mirror.current;
    const probe = mirror?.cloneNode(false) as HTMLElement | undefined;
    if (probe && mirror) {
      probe.textContent = 'Mwj.宽'; probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;top:0;left:0;width:max-content;min-height:0;height:auto;visibility:hidden;pointer-events:none;white-space:pre';
      mirror.parentElement!.append(probe);
    }
    let fontWidth = probe?.getBoundingClientRect().width;
    const fonts = new ResizeObserver(() => {
      const width = probe?.getBoundingClientRect().width;
      if (width === fontWidth) return;
      fontWidth = width; resize();
    });
    if (probe) fonts.observe(probe);
    let rolled = refs.paper.current?.classList.contains('has-paper-roll');
    const surface = new MutationObserver(() => {
      const next = refs.paper.current?.classList.contains('has-paper-roll');
      if (next === rolled) return;
      rolled = next; resize();
    });
    if (refs.paper.current) surface.observe(refs.paper.current, { attributes: true, attributeFilter: ['class'] });
    return () => { cancelled = true; observer.disconnect(); fonts.disconnect(); probe?.remove(); surface.disconnect(); document.fonts.removeEventListener('loadingdone', resize); preference.removeEventListener('change', change); window.removeEventListener('resize', resize); };
  }, [measure, clear, refs.paper, refs.root, refs.mirror]);
  useEffect(() => {
    const desk = refs.root.current?.closest<HTMLElement>('.desk'); if (!desk) return;
    scroller.current = desk;
    const scroll = () => {
      const next = Math.max(0, desk.scrollTop);
      if(selfScroll.current!==null&&Math.abs(next-selfScroll.current)<.01){selfScroll.current=null;return;}
      selfScroll.current=null;
      if (Math.abs(next - current.current.feed) < .01) return;
      browsing.current = true; clear(); current.current.feed = next; paint();
    };
    desk.addEventListener('scroll', scroll, { passive: true }); paint();
    return () => { desk.removeEventListener('scroll', scroll); scroller.current = null; };
  }, [refs.root, clear, paint]);
  useEffect(() => clear, [clear]);
  return { measure, request, previewStrike, select };
}
