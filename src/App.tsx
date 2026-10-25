import { useCallback, useEffect, useRef, useState } from 'react';
import type {CSSProperties} from 'react';
import {ArrowUpRight,Check,Info,Leaf,Moon,Sun,X} from 'lucide-react';
import Editor from './Editor';
import SettingsPanel from './SettingsPanel';
import Library from './Library';
import WriterDock from './WriterDock';
import StartPage from './StartPage';
import {writingExperience,editorPreparationKey,materialUrl,startMaterial} from './startExperience';
import useRoomTransition from './useRoomTransition';
import useNightLighting from './useNightLighting';
import RoomMaterial from './RoomMaterial';
import {defaultNightMaterial,findNightMaterial} from './nightMaterials';
import type {NightMaterial} from './nightMaterials';
import type {FlowerDesign,SliderDesign} from './controlDesigns';
import './room.css';
import './room-theme.css';
import './workspace-ui.css';
import './writer-sidebar.css';
import { createNote, downloadFile, loadWorkspace, STORAGE_KEY, titleOf } from './storage';
import type { Note, Settings, Workspace } from './storage';
import { mechanicalSound } from './sound';
import { exportPaper } from './export';
import { cleanTitle, duplicateNote } from './libraryModel';
import {writingTypeface} from './writingFonts';

export default function App({ initialWorkspace, persist = true, initialScreen, nightMaterial=defaultNightMaterial,flowerDesign,sliderDesign,initialPanel=null }: { initialWorkspace?: Workspace; persist?: boolean; initialScreen?: 'start' | 'writer'; nightMaterial?:NightMaterial;flowerDesign?:FlowerDesign;sliderDesign?:SliderDesign;initialPanel?:'settings'|'library'|null } = {}) {
  const experience=writingExperience;
  const [workspace, setWorkspace] = useState<Workspace>(()=>initialWorkspace ?? loadWorkspace());
  const [entryScreen] = useState<'start' | 'writer'>(()=>initialScreen ?? (persist && location.hash !== '#write' ? 'start' : 'writer'));
  const [panel, setPanel] = useState<'library' | 'settings' | null>(initialPanel);
  const [exportOpen, setExportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const [toast, setToast] = useState('');
  const [toastAction, setToastAction] = useState<string[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const ref = useRef(workspace); ref.current = workspace;
  const note = workspace.notes.find(n=>n.id === workspace.activeId && !n.deleted) || workspace.notes.find(n=>!n.deleted);
  const settings = workspace.settings;
  const [emptyPreview]=useState(()=>createNote());
  const warmNote=note??emptyPreview;
  const [preparedKey,setPreparedKey]=useState<string|null>(null);
  const prepared=preparedKey===editorPreparationKey(warmNote,settings);
  const room=useRoomTransition(entryScreen,prepared,persist);
  const {screen,phase,target}=room;
  const lighting = useNightLighting(settings.night, screen === 'writer' && phase === 'idle');
  const sceneSettings = { ...settings, night: lighting.sceneNight };
  useEffect(()=>{if(phase!=='idle'){setPanel(null);setExportOpen(false);setFocus(false);}},[phase]);
  const navigate = useCallback((next: 'start' | 'writer')=> {
    room.navigate(next); setPanel(null); setExportOpen(false); setFocus(false);
  }, [room.navigate]);

  const notify = useCallback((message: string, undoIds: string[] | null = null) => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(message); setToastAction(undoIds); toastTimer.current = setTimeout(()=> { setToast(''); setToastAction(null); }, 6000); }, []);
  useEffect(() => {
    if (!persist) return;
    setSaveStatus('saving'); const timer = setTimeout(()=> { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); setSaveStatus('saved'); } catch { setSaveStatus('error'); } }, 450);
    const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ref.current)); } catch { /* The visible save status reports storage errors. */ } };
    window.addEventListener('pagehide', save); return () => { clearTimeout(timer); window.removeEventListener('pagehide', save); };
  }, [workspace, persist]);
  useEffect(()=>()=> { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(()=> { document.querySelector('meta[name="theme-color"]')?.setAttribute('content',!lighting.sceneNight?startMaterial.color:findNightMaterial(nightMaterial).color); }, [lighting.sceneNight,nightMaterial]);
  useEffect(()=> { const close = (e: PointerEvent)=> { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); }; document.addEventListener('pointerdown', close); return ()=>document.removeEventListener('pointerdown', close); }, []);
  useEffect(()=> {
    if (!aboutOpen && !panel) return;
    const root = document.querySelector<HTMLElement>(aboutOpen ? '.about-dialog' : panel === 'settings' ? '.settings-panel' : '.library-panel');
    const before = document.activeElement as HTMLElement | null;
    const beforeOverflow = document.body.style.overflow;
    const desk = document.querySelector<HTMLElement>(screen==='writer'?'.desk':'.start-page');
    const deskOverflow = desk?.style.overflowY ?? '';
    document.body.style.overflow = 'hidden';
    if (desk) { desk.style.overflowY = 'hidden'; desk.inert = true; }
    (panel === 'library' && matchMedia('(max-width:760px)').matches ? root?.querySelector<HTMLElement>('[aria-label="关闭信盒"]') : root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLButtonElement>('button'))?.focus();
    const trap = (e: globalThis.KeyboardEvent)=> { if (e.key !== 'Tab' || !root) return; const elements = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a, input:not([type="file"]):not(:disabled), select, summary, [tabindex="0"]')).filter(el=>el.offsetParent !== null); const first = elements[0], last = elements[elements.length - 1]; if (!root.contains(document.activeElement)) { e.preventDefault(); first?.focus(); } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } };
    document.addEventListener('keydown', trap); return ()=> { document.removeEventListener('keydown', trap); document.body.style.overflow = beforeOverflow; if (desk) { desk.style.overflowY = deskOverflow; desk.inert = false; } if (before?.isConnected) before.focus({ preventScroll: true }); };
  }, [aboutOpen, panel, screen]);

  const updateSettings = (patch: Partial<Settings>) => setWorkspace(old=>({ ...old, settings: { ...old.settings, ...patch } }));
  const newNote = useCallback(()=> { const next = createNote(); setWorkspace(old=>({ ...old, activeId: next.id, notes: [next, ...old.notes] })); navigate('writer'); setFocusVersion(v=>v+1); if (ref.current.settings.sound) mechanicalSound('paper'); notify('新纸页已创建。'); }, [notify, navigate]);
  const beginWriting = ()=> { if (!note) { newNote(); return; } navigate('writer'); setFocusVersion(v=>v+1); };
  const exportText = useCallback(()=> { const data = ref.current; const current = data.notes.find(n=>n.id === data.activeId && !n.deleted); if (!current) return; downloadFile(`${titleOf(current).replace(/[<>:"/\\|?*]/g, '-')}.txt`, current.text, 'text/plain;charset=utf-8'); setExportOpen(false); notify('纸页已导出为文字。'); }, [notify]);
  const exportImage = async()=> { if (!note || isExporting) return; setIsExporting(true); try { await exportPaper(note, settings); setExportOpen(false); notify('纸页已导出为图片。'); } catch { notify('图片未能导出，请重试或导出文字。'); } finally { setIsExporting(false); } };
  const backup = ()=> { downloadFile('inklune-letters-backup.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...ref.current }, null, 2), 'application/json'); setExportOpen(false); notify('整个信盒已备份。'); };
  const restoreNotes = (ids: string[])=> { const selected = new Set(ids); setWorkspace(old=>({ ...old, notes: old.notes.map(n=>selected.has(n.id) && n.deleted ? { ...n, deleted: false, deletedAt: undefined, updated: new Date().toISOString() } : n) })); notify(ids.length > 1 ? `${ids.length} 页已回到信盒。` : '纸页已回到信盒。'); };
  const deleteNotes = (ids: string[])=> { const selected = new Set(ids); const deletedIds = ref.current.notes.filter(n=>selected.has(n.id) && !n.deleted).map(n=>n.id); if (!deletedIds.length) return; const now = new Date().toISOString(), blank = createNote(); setWorkspace(old=> { const notes = old.notes.map(n=>selected.has(n.id) && !n.deleted ? { ...n, deleted: true, deletedAt: now } : n); const another = notes.find(n=>!n.deleted); if (!another) return { ...old, notes: [blank, ...notes], activeId: blank.id }; return { ...old, notes, activeId: selected.has(old.activeId) ? another.id : old.activeId }; }); notify(deletedIds.length > 1 ? `${deletedIds.length} 页已移至最近删除。` : '已移至最近删除。', deletedIds); };
  const renameNote = (id: string, title: string)=> { setWorkspace(old=>({ ...old, notes: old.notes.map(n=>n.id === id && !n.deleted ? { ...n, title: cleanTitle(title) || undefined, updated: new Date().toISOString() } : n) })); notify('纸页名称已更新。'); };
  const bookmarkNote = (id: string)=> setWorkspace(old=>({ ...old, notes: old.notes.map(n=>n.id === id && !n.deleted ? { ...n, bookmark: n.bookmark ? null : '#b898a6', updated: new Date().toISOString() } : n) }));
  const copyNote = (id: string)=> { const source = ref.current.notes.find(n=>n.id === id && !n.deleted); if (!source) return; const copy = duplicateNote(source); setWorkspace(old=>({ ...old, notes: [copy, ...old.notes] })); notify('纸页副本已放入信盒。'); return copy.id; };
  const exportLibraryNote = (id: string)=> { const current = ref.current.notes.find(n=>n.id === id); if (!current) return; downloadFile(`${titleOf(current).replace(/[<>:"/\\|?*]/g, '-')}.txt`, current.text, 'text/plain;charset=utf-8'); notify('这页文字已导出。'); };
  const importBackup = async(file: File)=> {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('文件过大');
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.notes) || !data.notes.every((n: Note)=>n && typeof n.id === 'string' && typeof n.text === 'string' && n.text.length <= 3000 && !isNaN(Date.parse(n.created)) && !isNaN(Date.parse(n.updated)))) throw new Error('无效备份');
      let count = 0;
      setWorkspace(old=> {
        const ids = new Set(old.notes.map(n=>n.id));
        const imported: Note[] = data.notes.filter((n: Note)=> { if (ids.has(n.id)) return false; ids.add(n.id); return true; }).map((n: Note)=> ({ id: n.id, text: n.text, created: n.created, updated: n.updated, title: typeof n.title === 'string' ? cleanTitle(n.title) || undefined : undefined, deletedAt: typeof n.deletedAt === 'string' && !isNaN(Date.parse(n.deletedAt)) ? n.deletedAt : undefined, bookmark: /^#[a-f0-9]{6}$/i.test(n.bookmark || '') ? n.bookmark : null, deleted: Boolean(n.deleted), inkSeeds: Array.isArray(n.inkSeeds) && n.inkSeeds.every(s=>Number.isSafeInteger(s) && s >= 0 && s <= 0xffffffff) ? n.inkSeeds.slice(0,3000) : undefined, traces: Array.isArray(n.traces) ? n.traces.filter(t=>typeof t.text === 'string' && t.text.length <= 3000 && Number.isFinite(t.x) && t.x >= 0 && t.x <= 1 && Number.isFinite(t.row) && t.row >= 0 && t.row <= 300).slice(-600) : [] }));
        count = imported.length; return { ...old, notes: [...imported, ...old.notes] };
      });
      setTimeout(()=>notify(`备份已恢复，相同纸页自动跳过。${count ? ` 新增 ${count} 页。` : ''}`), 50);
    } catch { notify('这份备份无法读取，请选择 Inklune 导出的 JSON 备份（兼容旧版）。'); }
  };
  useEffect(()=> { const onKey = (e: globalThis.KeyboardEvent)=> { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); } if (screen === 'writer' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportText(); } if (e.key === 'Escape') { if (aboutOpen) setAboutOpen(false); else if (exportOpen) setExportOpen(false); else if (panel) setPanel(null); else if (screen === 'writer') setFocus(v=>!v); } }; window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey); }, [aboutOpen, exportOpen, panel, screen, newNote, exportText]);
  const closePanel = ()=> { setPanel(null); if (screen === 'writer') setFocusVersion(v=>v+1); };
  const toastContent = toast&&<div className="toast" role="status"><Check size={15}/><span>{toast}</span>{toastAction&&<button onClick={()=>restoreNotes(toastAction)}>撤销</button>}</div>;

  return <div data-screen={screen} data-night={lighting.sceneNight} data-night-target={settings.night} data-room-phase={phase} data-editor-prepared={prepared} className={`app motion-${experience.transition} ${phase==='moving'?'room-moving':''} ${lighting.sceneNight ? 'night' : ''} ${focus ? 'focus-mode' : ''} ${toolsCollapsed ? 'tools-collapsed' : ''} ${panel ? 'has-panel' : ''} ${panel === 'library' ? 'has-library' : ''} ${screen === 'start' ? 'has-start' : ''}`} style={{'--writing-font-family':writingTypeface(settings),'--chosen-paper':startMaterial.color,'--start-material':`url("${materialUrl(experience.material)}")`,'--night-base':findNightMaterial(nightMaterial).color} as CSSProperties}>
    <div ref={room.start} className={`room-layer room-start-layer ${screen==='start'?'room-visible':''}`} aria-hidden={screen!=='start'} inert={screen!=='start'||phase!=='idle'}>
    <RoomMaterial material={experience.material} night={lighting.sceneNight} nightMaterial={nightMaterial}/>
    <StartPage note={note} night={lighting.sceneNight} visible={screen==='start'} returning={target==='start'&&phase==='moving'} blocked={!!panel || aboutOpen || phase!=='idle'} busy={phase==='waiting'&&target==='writer'} onContinue={beginWriting} onNew={newNote} onLibrary={()=>setPanel('library')} onTheme={()=>updateSettings({night:!settings.night})} onAbout={()=>setAboutOpen(true)}/>
    </div>
    <div ref={room.writer} className={`room-layer room-writer-layer ${screen==='writer'?'room-visible':''}`} aria-hidden={screen!=='writer'} inert={screen!=='writer'||phase!=='idle'||!!panel||aboutOpen}>
    <RoomMaterial material={experience.material} night={lighting.sceneNight} nightMaterial={nightMaterial}/>
    <header className="app-header">
      <div className="document-identity"><button className="brand" onClick={()=>navigate('start')} aria-label="回到开始页" title="回到开始页"><span className="brand-word">inklune</span></button><div className="save-state"><i className={saveStatus}/><span>{saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : '保存空间不足，请导出备份'}</span></div></div>
      <div className="header-actions"><button className="icon-button theme-toggle" onClick={()=>updateSettings({ night: !settings.night })} aria-label={settings.night ? '切换日间模式' : '切换夜间模式'} title="昼夜切换">{settings.night ? <Sun size={18}/> : <Moon size={18}/>}</button><div className={`document-counter ${note && note.text.length >= 3000 ? 'at-limit' : ''}`} aria-label="字数统计"><span>{note?.text.length || 0}</span><span className="counter-divider">/</span><span>3,000</span></div></div>
    </header>
    <main className="desk">
      <Editor flowerDesign={flowerDesign} note={warmNote} settings={sceneSettings} lampControl={lighting} active={screen==='writer'&&phase==='idle'&&!panel&&!aboutOpen} onReady={setPreparedKey} deferPaperShape={panel==='settings'} onChange={(text, traces, inkSeeds)=> { if(!note)return;setWorkspace(old=>({ ...old, notes: old.notes.map(n=>n.id === note.id ? { ...n, text, traces, inkSeeds, updated: new Date().toISOString() } : n) })); }} onNight={()=>updateSettings({ night: !ref.current.settings.night })} onLightChange={updateSettings} onBookmark={()=>{if(note)bookmarkNote(note.id);}} focusVersion={focusVersion} onFocusChange={()=> {}}/>
    </main>
    <WriterDock collapsed={toolsCollapsed} onCollapse={()=>{setToolsCollapsed(value=>!value);setExportOpen(false);}} panel={panel} exportOpen={exportOpen} isExporting={isExporting} exportRef={exportRef} onNew={newNote} onLibrary={()=>{setPanel(panel==='library'?null:'library');setExportOpen(false);}} onSettings={()=>{setPanel(panel==='settings'?null:'settings');setExportOpen(false);}} onExport={()=>{setExportOpen(!exportOpen);setPanel(null);}} onText={exportText} onImage={()=>void exportImage()} onPrint={()=>{setExportOpen(false);window.print();}} onBackup={backup} onFocus={()=>setFocus(true)}/>
    {focus&&<button className="exit-focus icon-button" onClick={()=>setFocus(false)} aria-label="退出专注模式" title="退出专注模式 · Esc"><X size={19}/></button>}
    </div>
    <div ref={room.surface} className="room-transition-surface" aria-hidden="true"><span ref={room.label} className="room-transition-label"/></div>
    {panel&&<button className="panel-backdrop" aria-label="关闭面板" onClick={closePanel}/>}
    {panel==='settings'&&<SettingsPanel sliderDesign={sliderDesign} settings={settings} onUpdate={updateSettings} onClose={closePanel}/>}
    {panel==='library'&&<Library notes={workspace.notes} activeId={workspace.activeId} onSelect={id=>{setWorkspace(old=>({...old,activeId:id}));navigate('writer');setFocusVersion(v=>v+1);if(settings.sound)mechanicalSound('paper');}} onClose={closePanel} onNew={newNote} onDelete={deleteNotes} onRestore={restoreNotes} onRename={renameNote} onBookmark={bookmarkNote} onDuplicate={copyNote} onExport={exportLibraryNote} onBackup={backup} onImport={importBackup} notice={toastContent}/>}
    {aboutOpen&&<div className="modal-backdrop" onClick={()=>setAboutOpen(false)}><section className="about-dialog" role="dialog" aria-modal="true" aria-label="关于 Inklune" onClick={e=>e.stopPropagation()}><button className="icon-button about-close" onClick={()=>setAboutOpen(false)} aria-label="关闭关于"><X size={20}/></button><Leaf className="about-leaf" size={30} strokeWidth={1}/><span className="brand-word">inklune</span><p className="about-subtitle">纸墨质感的书写空间。</p><h2>让文字落在纸上。</h2><p>笔记自动保存在当前浏览器。<br/>你可以随时导出纸页，或备份整个信盒。</p><div className="about-info"><Info size={15}/><span>独立的网页书写工具，纸页与机械体验参考原作重建。</span></div><a href="https://apps.apple.com/cn/app/platen-paper-ink/id6809529696" target="_blank" rel="noreferrer">查看原作 <ArrowUpRight size={15}/></a><button className="about-write" onClick={()=>{setAboutOpen(false);beginWriting();}}>{screen === 'start' ? '开始书写' : '回到书写'}</button></section></div>}
    {panel!=='library'&&toastContent}
  </div>;
}
