import type { Decoration, Endcap, Kit } from './skins';
import { defaultChineseFont, defaultEnglishFont, normalizeWritingFonts } from './writingFonts.ts';
import type { ChineseFont, EnglishFont } from './writingFonts';
export type Paper = 'cotton' | 'cream' | 'blue' | 'rose' | 'lined' | 'linen' | 'parchment';
export type Capsule = 'ivory' | 'sage' | 'blue' | 'rose' | 'charcoal';
export interface Settings { paper: Paper; curved: boolean; ink: number; fontSize: number; chineseFont: ChineseFont; englishFont: EnglishFont; sound: boolean; deletion: 'erase' | 'strike'; capsule: Capsule; kit: Kit; rail: 'steel' | 'brass' | 'blackened'; endcap: Endcap; decoration: Decoration; night: boolean; brightness: number; warmth: number; beam: number; spread: number; lightingVersion: number; }
export interface InkTrace { text: string; x: number; row: number; seed?: number; }
export interface Note { id: string; text: string; created: string; updated: string; bookmark: string | null; deleted: boolean; title?: string; deletedAt?: string; traces?: InkTrace[]; inkSeeds?: number[]; }
export interface Workspace { notes: Note[]; activeId: string; settings: Settings; }
export const STORAGE_KEY = 'platen-paper-ink:v1';
export const defaults: Settings = { paper: 'cotton', curved: true, ink: 82, fontSize: 19, chineseFont:defaultChineseFont, englishFont:defaultEnglishFont, sound: true, deletion: 'erase', capsule: 'ivory', kit: 'classic', rail: 'steel', endcap: 'plain', decoration: 'none', night: false, brightness: 170, warmth: 100, beam: 120, spread: 130, lightingVersion: 2 };
export function createNote(text = '', created = new Date().toISOString()): Note { return { id: crypto.randomUUID(), text, created, updated: created, bookmark: null, deleted: false }; }
export function loadWorkspace(): Workspace {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const data = JSON.parse(raw); if (Array.isArray(data.notes) && data.notes.every((n: Note) => typeof n.id === 'string' && typeof n.text === 'string' && n.text.length <= 3000 && !isNaN(Date.parse(n.created)) && !isNaN(Date.parse(n.updated))) && typeof data.activeId === 'string') {
    const settings: Settings = { ...defaults, ...data.settings };
    Object.assign(settings,normalizeWritingFonts(settings));
    if (!['cotton','cream','blue','rose','lined','linen','parchment'].includes(settings.paper)) settings.paper = defaults.paper;
    if (!['classic','seaglass','basalt','porcelain','walnut','pumpkin','mummy','frankenstein','storm'].includes(settings.kit)) settings.kit = 'classic';
    if (!['steel','brass','blackened'].includes(settings.rail)) settings.rail = 'steel';
    if (!['plain','brass','jade','pumpkin','mummy'].includes(settings.endcap)) settings.endcap = 'plain';
    if (!['none','garden','cobweb'].includes(settings.decoration)) settings.decoration = 'none';
    // Preserve the relative level of older light settings while moving the
    // controls to the original app's intensity / angle / range units.
    if (data.settings?.lightingVersion !== 2) {
      settings.brightness = Math.round(Math.min(200, Math.max(20, (data.settings?.brightness ?? 72) * 150 / 72)));
      settings.beam = Math.round(Math.min(200, Math.max(40, (data.settings?.beam ?? 65) * 120 / 65)));
      settings.spread = 112;
      settings.lightingVersion = 2;
    }
    return { ...data, settings };
  } } } catch { /* Keep writing available when storage is unavailable. */ }
  const first = createNote();
  return { notes: [first], activeId: first.id, settings: { ...defaults } };
}
export function titleOf(note: Note) { return (typeof note.title === 'string' ? note.title.trim().slice(0, 80) : '') || note.text.split('\n').find(line => line.trim())?.trim().slice(0, 35) || '一页新的故事'; }
export function downloadFile(name: string, content: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
