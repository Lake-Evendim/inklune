import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { InkTrace, Note, Settings } from './storage';
import { diffText, glyphsFor, hashInk, inkStyle, reconcileInk } from './typing';
import type { EditRange, Glyph } from './typing';
import useTypewriterMotion from './useTypewriterMotion';
import usePaperLighting from './usePaperLighting';
import usePaperRuling from './usePaperRuling';
import usePaperRoll from './usePaperRoll';
import { lampAperture, lampLensTint, lampTint } from './lamp';
import { paperSkins } from './skins';
import { paperLineStep } from './ruling';
import PaperDecorations from './PaperDecorations';
import MechanismCanvas from './MechanismCanvas';
import useEditorPreparation from './useEditorPreparation';
import useLampIgnition from './useLampIgnition';
import type { LampControl } from './useLampIgnition';
import FlowerBookmark from './FlowerBookmark';
import type { FlowerDesign } from './controlDesigns';
import { writingTypeface } from './writingFonts';
import {paperInkColor} from './inkRendering';

export default function Editor({ note, settings, onChange, onNight, onLightChange, onBookmark, focusVersion, onFocusChange, deferPaperShape = false, active=true, lampControl, onReady, flowerDesign }: { note: Note; settings: Settings; onChange: (text: string, traces?: InkTrace[], inkSeeds?: number[]) => void; onNight: () => void; onLightChange: (patch: Partial<Settings>) => void; onBookmark: () => void; focusVersion: number; onFocusChange: (focused: boolean) => void; deferPaperShape?: boolean; active?:boolean; lampControl: LampControl; onReady?:(key:string)=>void; flowerDesign?:FlowerDesign }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scrollTrack = useRef<HTMLDivElement>(null);
  const capsule = useRef<HTMLButtonElement>(null);
  const lightCanvas = useRef<HTMLCanvasElement>(null);
  const rollCanvas = useRef<HTMLCanvasElement>(null);
  const drawPaper = useRef<((refreshLayout?: boolean) => void) | null>(null);
  const drawLighting = useRef<(() => void) | null>(null);
  const drawMechanism = useRef<(() => void) | null>(null);
  const selection = useRef(note.text.length);
  const [focused, setFocused] = useState(false);
  const [mechanismMounted, setMechanismMounted] = useState(false);
  useEditorPreparation(root,note,settings,onReady);
  // The parent DOM ref attaches after child layout effects. Mount the canvas
  // in a layout update once the sheet exists; React completes this update
  // before the first browser paint, so no generic shell is exposed.
  useLayoutEffect(() => { setMechanismMounted(true); }, []);
  const [displayCurved, setDisplayCurved] = useState(settings.curved);
  // The settings sheet covers the paper on phones. Reveal the selected
  // shape after it closes so the full transition remains visible.
  useLayoutEffect(() => { if (!deferPaperShape) setDisplayCurved(settings.curved); }, [deferPaperShape, settings.curved]);
  const composing = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const previous = useRef(note.text);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const compositionKeyPending = useRef(false);
  const compositionText = useRef('');
  const inputType = useRef('');
  const editRange = useRef<EditRange | undefined>(undefined);
  const glyphData = useRef<Glyph[]>(glyphsFor(note.text, note.inkSeeds, note.id));
  const glyphNote = useRef(note.id);
  if (glyphNote.current !== note.id) { glyphNote.current = note.id; glyphData.current = glyphsFor(note.text, note.inkSeeds, note.id); previous.current = note.text; }
  const displayText = draft ?? note.text;
  let draftIndex = 0;
  const charElements = draft === null ? glyphData.current : reconcileInk(glyphData.current, displayText, diffText(previous.current, displayText, selection.current), () => hashInk(`${note.id}:draft:${draftIndex++}`));
  const { measure, request, previewStrike, select } = useTypewriterMotion({ root, paper, mirror, input: textarea, selection, drawLighting, drawMechanism, drawPaper, scrollTrack }, note.id, displayText);
  const lampIgnition = useLampIgnition({ root, lighting: drawLighting, mechanism: drawMechanism }, lampControl);
  usePaperLighting({ root, paper, canvas: lightCanvas, draw: drawLighting, drawPaper }, settings, lampIgnition);
  usePaperRuling(mirror, settings.paper === 'lined');
  const roll=usePaperRoll({paper,input:textarea,mirror,canvas:rollCanvas,light:lightCanvas,draw:drawPaper},displayCurved,settings,offset=>select(offset));
  useEffect(() => { previous.current = note.text; composing.current = false; setDraft(null); }, [note.id]);
  useEffect(() => {
    const element = textarea.current;
    const before = (event: Event) => { inputType.current = (event as InputEvent).inputType; editRange.current = { start: element!.selectionStart, end: element!.selectionEnd }; };
    element?.addEventListener('beforeinput', before);
    return () => element?.removeEventListener('beforeinput', before);
  }, []);
  useEffect(() => { if (active && focusVersion > 0) { const caret = Math.min(selection.current, note.text.length); textarea.current?.focus({ preventScroll: true }); textarea.current?.setSelectionRange(caret, caret); } else if(!active)textarea.current?.blur(); }, [active,focusVersion, note.id]);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    editRange.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (composing.current || event.nativeEvent.isComposing || event.key === 'Process') {
      if (event.key.length === 1 || event.key === 'Process' || event.key === 'Backspace') { compositionKeyPending.current = true; previewStrike(settings.sound); }
      return;
    }
    inputType.current = event.key === 'Backspace' ? 'deleteContentBackward' : event.key === 'Delete' ? 'deleteContentForward' : event.key === 'Enter' ? 'insertLineBreak' : 'insertText';
  };
  const change = (value: string, caret: number, confirmedComposition = false) => {
    selection.current = caret;
    if (composing.current && !confirmedComposition) { setDraft(value); return; }
    if (value === previous.current) return;
    const edit = diffText(previous.current, value, caret, inputType.current, confirmedComposition ? undefined : editRange.current);
    const previousGlyphs = glyphData.current;
    let traces = note.traces;
    if (settings.deletion === 'strike' && edit.removed && !confirmedComposition && mirror.current) {
      const area = mirror.current.getBoundingClientRect(), lineHeight = paperLineStep(mirror.current);
      const removedTraces: InkTrace[] = [];
      for (const glyph of previousGlyphs) {
        if (glyph.start < edit.start || glyph.start >= edit.oldEnd || !glyph.text.trim()) continue;
        const span = mirror.current.querySelector<HTMLElement>(`[data-start="${glyph.start}"]`);
        if (span) { const box = span.getBoundingClientRect(); removedTraces.push({ text: glyph.text, seed: glyph.seed, x: Math.max(0, Math.min(1, (box.left - area.left) / area.width)), row: Math.max(0, Math.round((box.top - area.top) / lineHeight)) }); }
      }
      traces = [...(note.traces || []), ...removedTraces].slice(-600);
    }
    glyphData.current = reconcileInk(previousGlyphs, value, edit, () => crypto.getRandomValues(new Uint32Array(1))[0]);
    const kind = /insertFromPaste|insertFromDrop|history/.test(inputType.current) || (!confirmedComposition && glyphsFor(edit.inserted).length > 1) ? 'paste' : edit.inserted === '\n' ? 'return' : !edit.inserted ? 'delete' : !edit.inserted.trim() ? 'space' : 'print';
    request({ kind, start: edit.start, end: edit.newEnd, sound: settings.sound });
    previous.current = value; editRange.current = undefined; inputType.current = '';
    onChange(value, traces, glyphData.current.map(g => g.seed));
  };
  const startHold = () => { held.current = false; holdTimer.current = setTimeout(() => { held.current = true; onNight(); }, 550); };
  const stopHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; };
  const createdDate = new Date(note.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Shanghai' });
  const editorStyle = {
    '--stock-texture': `url("${paperSkins[settings.paper].url}")`, '--stock-color': paperSkins[settings.paper].color,
    '--type-size': `${settings.fontSize}px`, '--ink-opacity': settings.ink / 100, '--writing-ink-color':paperInkColor(settings.ink),
    '--writing-font-family': writingTypeface(settings),
    '--lamp-color': lampTint(settings.warmth).join(' '),
    '--lamp-lens-color': lampLensTint(settings.warmth).join(' '),
    '--lamp-power': settings.brightness / 150,
    '--lamp-length': `${lampAperture.length}px`, '--lamp-thickness': `${lampAperture.thickness}px`,
    '--lamp-origin': `${lampAperture.origin}px`,
  } as CSSProperties;

  // Keep this class stable: the renderer owns has-3d. Replacing className
  // during kit selection would reveal the generic CSS fallback again.
  return <div ref={scrollTrack} className="paper-scroll-track"><div ref={root} className="typewriter-assembly" data-kit={settings.kit} style={editorStyle}>
    <div ref={paper} className={`paper paper-${settings.paper} ${displayCurved ? 'curved' : 'flat'} ${focused ? 'paper-focused' : ''}`}>
      <div className="paper-surface">
      <div className="paper-texture" aria-hidden="true" />
      <div className="paper-content">
      <div className="paper-heading"><span>{createdDate}</span><span className="page-number">01</span></div>
      <div className="writing-area">
        <div className="ink-text" ref={mirror} aria-hidden="true"><span className="rule-baseline-marker"/>{charElements.map(g => { const ink = inkStyle(g.seed); return <span className={`ink-glyph${draft !== null && g.start >= (editRange.current?.start ?? note.text.length) ? ' composing-ink' : ''}`} key={g.seed} data-start={g.start} data-end={g.end} data-seed={g.seed} style={{ opacity: ink.opacity, '--ink-tone':ink.tone, '--glyph-ink-color':paperInkColor(settings.ink,ink.tone), '--ink-y': `${ink.offsetY}px`, '--mask-x': `${ink.maskX}px`, '--mask-y': `${ink.maskY}px` } as CSSProperties}>{g.text}</span>; })}<span className="end-marker" data-start={displayText.length} data-end={displayText.length}>{'\u200b'}</span><span className="baseline-marker"/>{!displayText && <span className="editor-placeholder">你的故事，从这里开始。</span>}
          {(note.traces || []).map((s,i)=> { const ink = inkStyle(s.seed ?? hashInk(s.text)); return <span key={`strike-${i}`} className="deleted-ink ink-glyph" style={{ left: `${s.x * 100}%`, '--trace-row': s.row, '--mask-x': `${ink.maskX}px`, '--mask-y': `${ink.maskY}px` } as CSSProperties}>{s.text}</span>; })}
        </div>
        <textarea ref={textarea} className="writing-input" value={displayText} maxLength={3000} spellCheck={false} aria-label="纸页书写区域" autoCapitalize="sentences" onChange={e => change(e.target.value, e.target.selectionStart)} onKeyDown={handleKeyDown} onPaste={() => { inputType.current = 'insertFromPaste'; }}
          onSelect={e => select(e.currentTarget.selectionStart)}
          onFocus={() => { setFocused(true); onFocusChange(true); }} onBlur={() => { setFocused(false); onFocusChange(false); }}
          onCompositionStart={() => { composing.current = true; compositionText.current = ''; }}
          onCompositionUpdate={e => { if (e.data !== compositionText.current && !compositionKeyPending.current) previewStrike(settings.sound); compositionKeyPending.current = false; compositionText.current = e.data; }}
          onCompositionEnd={e => { composing.current = false; compositionKeyPending.current = false; setDraft(null); change(e.currentTarget.value, e.currentTarget.selectionStart, true); }} />
      </div>
      </div>
      <canvas ref={rollCanvas} className="paper-roll-canvas" aria-hidden="true" onPointerDown={roll.onPointerDown} onPointerMove={roll.onPointerMove} onPointerUp={roll.onPointerUp} onPointerCancel={roll.onPointerCancel}/>
      </div>
      <div className="paper-footer"><span>inklune</span><span>让文字落在纸上</span></div>
      <canvas ref={lightCanvas} className="paper-illumination" aria-hidden="true" />
      <PaperDecorations decoration={settings.decoration} night={settings.night}/>
      {settings.night && <div className="night-light-controls" aria-label="纸页灯光调节">
        <label><span>强度 <output>{settings.brightness}%</output></span><input type="range" min="20" max="200" value={settings.brightness} onChange={e => onLightChange({ brightness: Number(e.target.value) })} aria-label="纸页灯光强度" /></label>
        <label><span>扩散 <output>{settings.spread}°</output></span><input type="range" min="50" max="160" value={settings.spread} onChange={e => onLightChange({ spread: Number(e.target.value) })} aria-label="纸页灯光扩散角度" /></label>
        <label><span>照射范围 <output>{settings.beam}%</output></span><input type="range" min="40" max="200" value={settings.beam} onChange={e => onLightChange({ beam: Number(e.target.value) })} aria-label="纸页灯光照射范围" /></label>
      </div>}
    </div>
    <button className={`bookmark ${note.bookmark ? 'bookmarked' : ''}`} onClick={onBookmark} title="移除花朵书签" aria-label="移除花朵书签" aria-pressed={Boolean(note.bookmark)}><FlowerBookmark design={flowerDesign} color={note.bookmark || undefined}/></button>
    {mechanismMounted && <MechanismCanvas root={root} draw={drawMechanism} settings={settings} active={active}/>}
    <div className={`carriage rail-${settings.rail}`} aria-hidden="true"><div className="rail-shadow"/><div className="rail"><i className="rail-end left"/><i className="rail-end right"/></div></div>
    <div className="capsule-anchor"><div className="capsule-sled"><button ref={capsule} className={`capsule capsule-${settings.capsule}`} aria-label="打字机胶囊，长按切换夜间模式" title="长按胶囊，点亮夜晚" onPointerDown={startHold} onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold} onContextMenu={e=>e.preventDefault()} onClick={() => { if (!held.current) { textarea.current?.focus({ preventScroll: true }); textarea.current?.setSelectionRange(selection.current, selection.current); measure(true); } }} onKeyDown={e=> { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNight(); } }}>
      <span className="type-hammer"><i/><b/></span><span className="print-point" aria-hidden="true"/><span className="capsule-lights"><i className="status-lamp"/><i className="night-lamp"/><i className="inactive-lamp"/></span><span className="capsule-slot"/><span className="capsule-shine"/><span className="capsule-emitter" aria-hidden="true" />
    </button></div></div>
  </div></div>;
}
