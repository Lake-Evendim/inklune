// Development-only fixture, excluded from the production entry point.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/courier-prime/400.css';
import '../src/styles.css';
import '../src/motion.css';
import '../src/materials.css';
import '../src/typing.css';
import '../src/ui.css';
import Editor from '../src/Editor';
import { createNote, defaults } from '../src/storage';
import { paperLineStep } from '../src/ruling';

function Fixture() {
  const [note, setNote] = useState(() => createNote());
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const wait = async (ms = 360) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    // Slow GPU frames must still render the full contact hold. Await the real
    // motion completion rather than treating a fixed delay as completion.
    if (ms) for (let i = 0; document.querySelector<HTMLElement>('.typewriter-assembly')?.dataset.motion !== 'idle' && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  };
  const run = async () => {
    setRunning(true); const results: string[] = [];
    const textarea = document.querySelector('textarea')!;
    textarea.readOnly=true;
    const root = document.querySelector<HTMLElement>('.typewriter-assembly')!;
    const check = (label: string, pass: boolean) => { results.push(`${pass ? 'PASS' : 'FAIL'} ${label}`); setResults([...results]); };
    const update = (value: string, type: string, composing = false) => {
      textarea.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: type, data: value, isComposing: composing }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, value);
      textarea.setSelectionRange(value.length, value.length);
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: type, data: value, isComposing: composing }));
    };
    textarea.focus({ preventScroll: true });
    const strikes = () => Number(root.dataset.strikes || 0);
    let maximumTravel = 0;
    const observer = new MutationObserver(() => { maximumTravel = Math.max(maximumTravel,parseFloat(root.style.getPropertyValue('--hammer-extension')) || 0); });
    observer.observe(root,{ attributes: true, attributeFilter: ['style'] });
    const before = strikes(); update('A', 'insertText'); await wait(0);
    check('new ink is hidden before impact', document.querySelector<HTMLElement>('.ink-glyph')?.style.visibility === 'hidden');
    await wait(); check('ordinary key strikes exactly once', strikes() === before + 1);
    check('hammer extends and fully retracts', maximumTravel > 5 && parseFloat(root.style.getPropertyValue('--hammer-extension')) === 0);
    const space = strikes(); update('A ', 'insertText'); await wait(); check('space advances without hammer strike', strikes() === space);
    const feed = root.style.getPropertyValue('--paper-feed');
    // A fixed ten-line note fits a tall phone viewport. Make this genuinely
    // longer than the visible sheet before asserting that native feed moves.
    const longRows=Math.max(12,Math.ceil(root.clientHeight/paperLineStep(document.querySelector<HTMLElement>('.ink-text')!))+3);
    const paste = strikes(); update('A pasted\n'+Array.from({length:longRows},(_,i)=>`Line ${i+1}`).join('\n'), 'insertFromPaste'); await wait();
    check('paste creates no fictional keystrokes', strikes() === paste);
    check(`paste reveals its final line through the native feed [before=${feed}, after=${root.style.getPropertyValue('--paper-feed')}, native=${document.querySelector('.desk')!.scrollTop}, frame=${root.clientHeight}, carriage=${root.style.getPropertyValue('--carriage-y')}]`, parseFloat(root.style.getPropertyValue('--paper-feed')) > parseFloat(feed) && Math.abs(document.querySelector('.desk')!.scrollTop - parseFloat(root.style.getPropertyValue('--paper-feed'))) < 1);
    textarea.setSelectionRange(0, 0); document.dispatchEvent(new Event('selectionchange')); await wait();
    check('selection reveals the first line through the native feed', parseFloat(root.style.getPropertyValue('--paper-feed')) === 0 && document.querySelector('.desk')!.scrollTop === 0);
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const ime = strikes(), original = textarea.value;
    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    update(original + 'z', 'insertCompositionText', true);
    textarea.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: 'z' })); await wait();
    check('IME spelling strikes once', strikes() === ime + 1);
    check('IME draft is not saved', document.querySelector('output[data-note]')?.textContent === original);
    update(original + '中', 'insertCompositionText', true); await wait(0);
    textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中' }));
    update(original + '中', 'insertText'); await wait();
    check('IME confirmation has one additional strike', strikes() === ime + 2);
    check('IME saves confirmed character once', document.querySelector('output[data-note]')?.textContent === original + '中');
    const deleteCount = strikes(); textarea.setSelectionRange(textarea.value.length - 1, textarea.value.length);
    update(original, 'deleteContentBackward'); await wait(); check('delete retracts without printing', strikes() === deleteCount);
    check('motion returns to idle', root.dataset.motion === 'idle');
    const recentStart = root.style.getPropertyValue('--paper-feed');
    update(original + '\n', 'insertLineBreak'); await wait();
    check(`return feeds a long page to the writing height [before=${recentStart}, after=${root.style.getPropertyValue('--paper-feed')}, frame=${root.clientHeight}, carriage=${root.style.getPropertyValue('--carriage-y')}]`, parseFloat(root.style.getPropertyValue('--paper-feed')) > parseFloat(recentStart));
    const stationary = root.style.getPropertyValue('--paper-feed');
    update(original + '\nA', 'insertText'); await wait();
    check('same-line key does not move the paper', root.style.getPropertyValue('--paper-feed') === stationary);
    const traces = [...document.querySelectorAll<HTMLElement>('.deleted-ink')];
    check('deleted ink stays outside text flow at its original row', traces.length > 0 && traces.every(trace => getComputedStyle(trace).position === 'absolute'));
    observer.disconnect();textarea.readOnly=false;
    setRunning(false);
  };
  return <div className="app"><header className="app-header"><span>输入动作回归</span><button disabled={running} onClick={run}>Run input regression</button></header><main className="desk"><Editor note={note} settings={{ ...defaults, sound: false, deletion: 'strike' }} onChange={(text,traces,inkSeeds) => setNote(n => ({ ...n,text,traces,inkSeeds }))} onNight={() => {}} onLightChange={() => {}} onBookmark={() => {}} focusVersion={0} onFocusChange={() => {}} /></main><pre style={{position:'fixed',left:16,top:90,width:230,maxHeight:'calc(100dvh - 110px)',overflow:'auto',fontSize:11,zIndex:30,whiteSpace:'pre-wrap'}}>{results.join('\n')}</pre><output data-note hidden>{note.text}</output></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
