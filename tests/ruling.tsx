import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/special-elite';
import '@fontsource/courier-prime/400.css';
import '@fontsource/dm-sans/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/lighting.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import Editor from '../src/Editor';
import { createNote, defaults } from '../src/storage';
import { exportPaper } from '../src/export';

const sample = '慢下来。\nLet’s begin.\n\n中文与 English 混排，自动换行也应落在横线上。 '.repeat(3);
function Fixture() {
  const [note, setNote] = useState(() => createNote(sample));
  const [size, setSize] = useState(19), [family, setFamily] = useState('"Courier Prime", "Microsoft YaHei", monospace');
  const [leading, setLeading] = useState(1.02), [night, setNight] = useState(false);
  const [results, setResults] = useState<string[]>([]), [running, setRunning] = useState(false);
  const settings = { ...defaults, paper: 'lined' as const, fontSize: size, sound: false, night };
  const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const inspect = (label: string) => {
    const area = document.querySelector<HTMLElement>('.writing-area')!, text = area.querySelector<HTMLElement>('.ink-text')!;
    // Independent zero-width baseline probes for every rendered row. These
    // reveal mixed fallback-font and wrapping errors a first-row check misses.
    const clone = text.cloneNode(true) as HTMLElement;
    clone.style.cssText = 'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none';
    for (const glyph of clone.querySelectorAll('.ink-glyph')) {
      const probe = document.createElement('span'); probe.className = 'rule-baseline-marker row-probe';
      glyph.before(probe);
    }
    area.append(clone);
    const style = getComputedStyle(area), type = getComputedStyle(text), height = Number.parseFloat(type.lineHeight);
    const step = Number.parseFloat(style.getPropertyValue('--rule-step')), first = Number.parseFloat(style.getPropertyValue('--rule-offset')) + Number.parseFloat(style.getPropertyValue('--rule-thickness')) / 2;
    const top = area.getBoundingClientRect().top, gap = Number.parseFloat(type.fontSize) * .12;
    const baselines = [...new Set([...clone.querySelectorAll<HTMLElement>('.row-probe,.rule-baseline-marker,.baseline-marker')].map(p => p.getBoundingClientRect().bottom - top))];
    const error = Math.max(...baselines.map(b => Math.abs(first + Math.round((b + gap - first) / step) * step - b - gap)));
    const sameLayout = Math.abs(clone.getBoundingClientRect().height - text.getBoundingClientRect().height) < .1;
    clone.remove();
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const pass = error < .2 && Math.abs(step - height) < .02 && sameLayout && overflow === 0;
    return `${pass ? 'PASS' : 'FAIL'} ${label}: ${baselines.length} baselines, rule Δ ${error.toFixed(3)}px, step ${step.toFixed(3)}px, overflow ${overflow}px`;
  };
  const run = async () => {
    setRunning(true); const report: string[] = [];
    await document.fonts.ready;
    for (const fontSize of [15, 19, 25]) {
      setSize(fontSize);
      for (const [label, text] of [['empty', ''], ['mixed + blank rows', sample], ['leading blank + wrap', '\n\n' + '给美好留一点空间 abcdefg '.repeat(8)]]) {
        setNote(createNote(text)); await settle(); report.push(inspect(`${fontSize}px / ${label}`));
      }
    }
    for (const font of ['"Microsoft YaHei", sans-serif', 'Georgia, serif', '"Courier Prime", "Microsoft YaHei", monospace']) {
      setFamily(font); setNote(createNote(sample));
      for (const lineHeight of [1.02, 1.5]) { setLeading(lineHeight); await settle(); report.push(inspect(`${font} / leading ${lineHeight}`)); }
      const applied = getComputedStyle(document.querySelector('.ink-text')!).fontFamily;
      report.push(`${applied.includes(font.split(',')[0].replaceAll('"', '')) ? 'PASS' : 'FAIL'} font change applied: ${applied}`);
    }
    setLeading(1.02); setSize(19); setNight(true); setNote(createNote(sample.repeat(2))); await settle();
    const input = document.querySelector('textarea')!;
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertLineBreak' }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, input.value + '\n');
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertLineBreak' }));
    await new Promise(resolve => setTimeout(resolve, 650));
    report.push(inspect('long page after feeding'));
    const root = document.querySelector<HTMLElement>('.typewriter-assembly')!;
    report.push(`${Number.parseFloat(root.style.getPropertyValue('--paper-feed')) > 0 ? 'PASS' : 'FAIL'} long page actually feeds`);
    document.querySelector('.paper')!.dispatchEvent(new WheelEvent('wheel', { deltaY: -37, bubbles: true, cancelable: true }));
    await settle(); report.push(inspect('manual paper pan'));
    setResults(report); setRunning(false);
  };
  return <div className={`app ${night ? 'night' : ''}`} style={{ '--test-family': family, '--test-leading': leading } as React.CSSProperties}>
    <header className="app-header"><span className="brand-word">横线纸</span><button onClick={run} disabled={running}>运行横线对齐检查</button><button onClick={() => void exportPaper(note, settings)}>导出横线纸</button></header>
    <main className="desk"><Editor note={note} settings={settings} onChange={(text, traces, inkSeeds) => setNote(n => ({ ...n, text, traces, inkSeeds }))} onNight={() => setNight(v => !v)} onLightChange={() => {}} onBookmark={() => {}} focusVersion={0} onFocusChange={() => {}} /></main>
    <pre className="ruling-report">{results.join('\n')}</pre>
    <style>{`.ink-text,.writing-input{font-family:var(--test-family);line-height:var(--test-leading)}.ruling-report{position:fixed;left:10px;bottom:10px;max-width:calc(100vw - 20px);max-height:180px;overflow:auto;z-index:30;font-size:10px;white-space:pre-wrap;background:#1b1b1b;color:#eee}`}</style>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
