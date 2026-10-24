import {ArchiveRestore,ArrowLeft,Check,Copy,Download,Feather,Pencil,Plus,Search,SlidersHorizontal,Trash2,Upload,X} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Note } from './storage';
import { titleOf } from './storage';
import { libraryNotes, noteExcerpt, noteReadingBody, searchTerms } from './libraryModel';
import type { LibrarySort, LibraryView } from './libraryModel';
import ActionMenu from './ActionMenu';
import FlowerBookmark from './FlowerBookmark';
import './library.css';

type Props = { notes: Note[]; activeId: string; onSelect: (id: string) => void; onClose: () => void; onNew: () => void; onDelete: (ids: string[]) => void; onRestore: (ids: string[]) => void; onRename: (id: string, title: string) => void; onBookmark: (id: string) => void; onDuplicate: (id: string) => string | undefined; onExport: (id: string) => void; onBackup: () => void; onImport: (file: File) => Promise<void>; notice?: ReactNode };
const viewTitles: Record<LibraryView, string> = {all:'全部',bookmarks:'书签',trash:'最近删除'};
const dateOf = (value: string, full = false) => new Date(value).toLocaleDateString('zh-CN', { ...(full ? { year: 'numeric' as const } : {}), month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = searchTerms(query), lower = text.toLocaleLowerCase(), pieces = [];
  let offset = 0;
  while (offset < text.length) {
    const hits = terms.map(term => ({ term, at: lower.indexOf(term, offset) })).filter(hit => hit.at >= 0).sort((a, b) => a.at - b.at || b.term.length - a.term.length);
    if (!hits.length) { pieces.push(text.slice(offset)); break; }
    const hit = hits[0];
    pieces.push(text.slice(offset, hit.at), <mark key={hit.at}>{text.slice(hit.at, hit.at + hit.term.length)}</mark>);
    offset = hit.at + hit.term.length;
  }
  return <>{pieces}</>;
}

export default function Library({ notes, activeId, onSelect, onClose, onNew, onDelete, onRestore, onRename, onBookmark, onDuplicate, onExport, onBackup, onImport, notice }: Props) {
  const [query, setQuery] = useState(''), [view, setView] = useState<LibraryView>('all'), [sort, setSort] = useState<LibrarySort>('updated');
  const [previewId, setPreviewId] = useState(activeId), [mobilePreview, setMobilePreview] = useState(false);
  const [organizing, setOrganizing] = useState(false), [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null), [name, setName] = useState(''), [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null), search = useRef<HTMLInputElement>(null), index = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null), wasMobilePreview = useRef(false);
  const rows = libraryNotes(notes, view, query, sort);
  const preview = rows.find(note => note.id === previewId) ?? rows.find(note => note.id === activeId) ?? rows[0];
  const readingText = preview ? noteReadingBody(preview) : '';
  useLayoutEffect(() => {
    if (!matchMedia('(max-width:760px)').matches) return;
    if (mobilePreview && preview) panel.current?.querySelector<HTMLButtonElement>('.folio-back')?.focus({ preventScroll:true });
    else if (wasMobilePreview.current) Array.from(index.current?.querySelectorAll<HTMLButtonElement>('.letter-open') ?? []).find(button=>button.dataset.id===preview?.id)?.focus({ preventScroll:true });
    wasMobilePreview.current = mobilePreview && Boolean(preview);
  }, [mobilePreview, preview?.id]);
  const selectedIds = selected.filter(id => rows.some(note => note.id === id));
  const counts = { all: notes.filter(note => !note.deleted).length, bookmarks: notes.filter(note => !note.deleted && note.bookmark).length, trash: notes.filter(note => note.deleted).length };
  const groups = rows.reduce<{ label: string; notes: Note[] }[]>((all, note) => {
    const date = sort === 'created' ? note.created : view === 'trash' ? note.deletedAt ?? note.updated : note.updated;
    const label = sort === 'title' ? '按名称排列' : new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', timeZone: 'Asia/Shanghai' });
    if (all.at(-1)?.label === label) all.at(-1)!.notes.push(note); else all.push({ label, notes: [note] });
    return all;
  }, []);
  const changeView = (next: LibraryView) => { setView(next); setSelected([]); setMobilePreview(false); setRenaming(null); };
  const choose = (id: string, mobile = true) => { setPreviewId(id); setRenaming(null); setMobilePreview(mobile); };
  const toggleSelected = (id: string) => setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]);
  const changeQuery = (value: string) => { setQuery(value); setSelected([]); };
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); search.current?.focus(); return; }
    if (event.key === 'Escape' && renaming) { event.stopPropagation(); setRenaming(null); return; }
    if (event.key === 'Escape' && mobilePreview && matchMedia('(max-width: 760px)').matches) { event.stopPropagation(); setMobilePreview(false); return; }
    if (!(event.target as HTMLElement).classList.contains('letter-open') || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(index.current?.querySelectorAll<HTMLButtonElement>('.letter-open') ?? []), at = buttons.indexOf(event.target as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)));
    buttons[next]?.focus(); if (buttons[next]?.dataset.id) choose(buttons[next].dataset.id!, false);
  };
  const emptyTitle = query.trim() ? '没有找到这段文字' : view === 'trash' ? '最近删除是空的' : view === 'bookmarks' ? '留住喜欢的一页' : '从一页新纸开始';

  return <aside ref={panel} className={`library-panel folio-library${mobilePreview && preview ? ' shows-preview' : ''}`} role="dialog" aria-modal="true" aria-labelledby="library-title" onKeyDown={keyDown}>
    <header className="folio-header"><div className="folio-heading"><h2 id="library-title">信盒</h2></div><div className="folio-header-actions"><button className="folio-new" onClick={onNew}><Plus size={17}/>新纸页</button><ActionMenu label="信盒设置" className="folio-settings-menu"><button onClick={onBackup}><Download size={15}/>备份信盒</button><button disabled={importing} onClick={()=>fileInput.current?.click()}><Upload size={15}/>{importing?'正在导入…':'导入'}</button></ActionMenu><button className="folio-icon" onClick={onClose} aria-label="关闭信盒" title="关闭信盒"><X size={20}/></button></div></header>
    <div className="folio-layout">
      <section className="folio-index" aria-label="纸页目录">
        <nav className="folio-sidebar" aria-label="信盒分类"><div className="folio-collections">{(['all','bookmarks','trash'] as const).map(value=><button key={value} aria-pressed={view===value} onClick={()=>changeView(value)}><span>{viewTitles[value]}</span><small>{counts[value]}</small></button>)}</div></nav>
        <div className="folio-search-tools"><label className="folio-search"><Search size={17}/><input ref={search} data-autofocus value={query} onChange={event => changeQuery(event.target.value)} placeholder="搜索纸页" aria-label="搜索纸页"/>{query && <button className="folio-icon" onClick={() => { changeQuery(''); search.current?.focus(); }} aria-label="清除搜索"><X size={15}/></button>}</label><ActionMenu label="目录选项" className="folio-index-menu"><div className="action-menu-caption"><SlidersHorizontal size={14}/>排列方式</div>{([{id:'updated',title:view==='trash'?'最近删除':'最近修改'},{id:'created',title:'创建时间'},{id:'title',title:'名称'}] as const).map(item=><button key={item.id} aria-pressed={sort===item.id} onClick={()=>setSort(item.id)}>{item.title}{sort===item.id&&<Check size={15}/>}</button>)}<div className="action-menu-rule"/><button onClick={()=>{setOrganizing(value=>!value);setSelected([]);}}>{organizing?'完成整理':'整理纸页'}</button></ActionMenu></div>
        {query.trim()&&<div className="folio-search-results" aria-live="polite">找到 {rows.length} 页</div>}
        {organizing && <div className="folio-batch"><label><input type="checkbox" aria-label="选择全部结果" checked={rows.length > 0 && selectedIds.length === rows.length} disabled={!rows.length} onChange={() => setSelected(selectedIds.length === rows.length ? [] : rows.map(note => note.id))}/><span>{selectedIds.length ? `已选 ${selectedIds.length} 页` : '选择纸页'}</span></label><button disabled={!selectedIds.length} className={view === 'trash' ? '' : 'folio-danger'} onClick={() => { (view === 'trash' ? onRestore : onDelete)(selectedIds); setSelected([]); }}>{view === 'trash' ? <ArchiveRestore size={14}/> : <Trash2 size={14}/>} {view === 'trash' ? '恢复' : '移至最近删除'}</button></div>}
        <div className="folio-list" ref={index}>{groups.map(group => <section className="letter-group" key={group.label}><h3>{group.label}</h3>{group.notes.map(note => <div key={note.id} className={`letter-row${preview?.id === note.id ? ' selected' : ''}${selectedIds.includes(note.id) ? ' checked' : ''}`}>
          {organizing && <input className="letter-checkbox" type="checkbox" aria-label={`选择纸页 ${titleOf(note)}`} checked={selectedIds.includes(note.id)} onChange={() => toggleSelected(note.id)}/>}
          <button className="letter-open" data-id={note.id} aria-label={`预览纸页 ${titleOf(note)}`} aria-pressed={preview?.id === note.id} onClick={() => organizing ? toggleSelected(note.id) : choose(note.id)} onDoubleClick={() => { if (!organizing && !note.deleted) onSelect(note.id); }}><span className="letter-row-heading"><strong><Highlight text={titleOf(note)} query={query}/></strong>{note.bookmark && <FlowerBookmark compact className="letter-bookmark"/>}</span><p><Highlight text={noteExcerpt(query.trim()?note:{...note,text:noteReadingBody(note)}, query)} query={query}/></p><span className="letter-row-meta"><time>{dateOf(sort === 'created' ? note.created : view === 'trash' ? note.deletedAt ?? note.updated : note.updated)}</time><span>{note.text.length} 字</span>{note.id === activeId && !note.deleted && <em>书写中</em>}</span></button>
        </div>)}</section>)}{!rows.length && <div className="folio-empty"><Feather size={31} strokeWidth={1}/><h3>{emptyTitle}</h3><p>{query.trim() ? '标题和正文都会搜索。试试另一个词语。' : view === 'trash' ? '删除的纸页会留在这里，随时可以恢复。' : view === 'bookmarks' ? '在预览中点亮花朵，就能在这里找到它。' : '写下第一句话，再慢慢收集你的故事。'}</p><button onClick={() => query.trim() ? changeQuery('') : view === 'all' ? onNew() : changeView('all')}>{query.trim() ? '清除搜索' : view === 'all' ? '创建纸页' : '查看所有纸页'}</button></div>}</div>
      </section>
      <section className="folio-preview" aria-label="纸页预览">{preview ? <>
        <div className="folio-preview-toolbar"><button className="folio-back" onClick={() => { setMobilePreview(false); setRenaming(null); }}><ArrowLeft size={18}/>目录</button><span className="folio-preview-status">{preview.deleted ? '最近删除' : preview.id === activeId ? '书写中' : ''}</span><div>{!preview.deleted && <button className={`folio-icon${preview.bookmark ? ' is-bookmarked' : ''}`} aria-label={preview.bookmark ? '移除花朵书签' : '添加花朵书签'} aria-pressed={Boolean(preview.bookmark)} title="书签" onClick={() => onBookmark(preview.id)}><FlowerBookmark compact/></button>}<ActionMenu key={preview.id} label="纸页选项">{!preview.deleted&&<button onClick={()=>{setName(typeof preview.title==='string'?preview.title:titleOf(preview));setRenaming(preview.id);}}><Pencil size={16}/>修改名称</button>}{!preview.deleted&&<button onClick={()=>{const id=onDuplicate(preview.id);if(id){setPreviewId(id);changeQuery('');}}}><Copy size={16}/>复制纸页</button>}<button onClick={()=>onExport(preview.id)}><Download size={16}/>导出文字</button>{!preview.deleted&&<><div className="action-menu-rule"/><button className="folio-danger" onClick={()=>{onDelete([preview.id]);setMobilePreview(false);}}><Trash2 size={16}/>移至最近删除</button></>}</ActionMenu></div></div>
        <div className="folio-preview-scroll" tabIndex={0} aria-label="预览正文"><div className="folio-reading"><div className="folio-paper-date"><time>{dateOf(preview.created, true)}</time></div><div className="folio-caption">{renaming === preview.id ? <form className="folio-rename" onSubmit={event => { event.preventDefault(); onRename(preview.id, name); setRenaming(null); }}><label><span>纸页名称</span><input value={name} onChange={event => setName(event.target.value)} maxLength={80} autoFocus aria-label="纸页名称" placeholder="留空则使用正文第一行"/></label><button className="folio-icon" type="submit" aria-label="保存名称" title="保存名称"><Check size={18}/></button><button className="folio-icon" type="button" onClick={() => setRenaming(null)} aria-label="取消命名"><X size={18}/></button></form> : <h3><Highlight text={titleOf(preview)} query={query}/></h3>}</div><article className="folio-paper"><div className="folio-paper-text">{preview.text ? <Highlight text={readingText} query={query}/> : <span className="folio-blank">这张纸还空着。<br/>下一句话，从这里开始。</span>}</div></article></div></div>
        <footer className="folio-preview-footer"><div><span>{preview.text.length} 字</span><span>{preview.deleted?`删除于 ${dateOf(preview.deletedAt??preview.updated)}`:`修改于 ${dateOf(preview.updated)}`}</span></div><button className="folio-primary" onClick={()=>{if(preview.deleted){onRestore([preview.id]);setMobilePreview(false);}else onSelect(preview.id);}}>{preview.deleted?<><ArchiveRestore size={17}/>恢复纸页</>:preview.id===activeId?'继续书写':'打开书写'}</button></footer>
      </> : <div className="folio-preview-empty"><div className="folio-empty-sheet"><Feather size={30} strokeWidth={1}/></div><h3>{emptyTitle}</h3><p>{query.trim() ? '清除搜索，重新翻阅你的纸页。' : view === 'trash' ? '这里的纸页可以恢复到信盒。' : view === 'bookmarks' ? '花朵标记的纸页会收在这里。' : '你的文字，会一页一页留在这里。'}</p></div>}</section>
    </div>
    <input type="file" ref={fileInput} accept="application/json,.json" hidden aria-label="导入信盒备份" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file || importing) return; setImporting(true); try { await onImport(file); } finally { setImporting(false); } }}/>
    {notice}
  </aside>;
}

