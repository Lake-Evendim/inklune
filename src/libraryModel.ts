import { createNote, titleOf } from './storage.ts';
import type { Note } from './storage';

export type LibraryView = 'all' | 'bookmarks' | 'trash';
export type LibrarySort = 'updated' | 'created' | 'title';
export const searchTerms = (query: string) => query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
export const cleanTitle = (title: string) => title.trim().slice(0, 80);

export function libraryNotes(notes: Note[], view: LibraryView, query: string, sort: LibrarySort): Note[] {
  const terms = searchTerms(query);
  return notes.filter(note => Boolean(note.deleted) === (view === 'trash') && (view !== 'bookmarks' || Boolean(note.bookmark)) && terms.every(term => `${titleOf(note)}\n${note.text}`.toLocaleLowerCase().includes(term)))
    .sort((a, b) => sort === 'title' ? titleOf(a).localeCompare(titleOf(b), 'zh-CN') || a.id.localeCompare(b.id) : (sort === 'created' ? b.created.localeCompare(a.created) : (view === 'trash' ? b.deletedAt ?? b.updated : b.updated).localeCompare(view === 'trash' ? a.deletedAt ?? a.updated : a.updated)) || a.id.localeCompare(b.id));
}

export function noteExcerpt(note: Note, query: string): string {
  const text = note.text.replace(/\s+/gu, ' ').trim();
  if (!text) return '还没有正文';
  const terms = searchTerms(query), lower = text.toLocaleLowerCase();
  const matches = terms.map(term => lower.indexOf(term)).filter(index => index >= 0);
  const start = matches.length ? Math.max(0, Math.min(...matches) - 22) : 0;
  return `${start ? '…' : ''}${text.slice(start, start + 115)}${text.length > start + 115 ? '…' : ''}`;
}

/** A full first-line title is rendered above the reading body, without editing the note. */
export function noteReadingBody(note: Note): string {
  const text = note.text.trimStart(), firstLine = text.split(/\r?\n/u)[0].trim();
  return firstLine && titleOf(note) === firstLine ? text.replace(/^[^\r\n]*(?:\r?\n)?\s*/u, '') : note.text;
}

export function duplicateNote(note: Note): Note {
  return { ...createNote(note.text), title: `${titleOf(note).slice(0,76)}（副本）`, bookmark: note.bookmark, inkSeeds: note.inkSeeds?.slice(), traces: note.traces?.map(trace => ({ ...trace })) };
}
