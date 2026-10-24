export type Glyph = { text: string; start: number; end: number; seed: number };
export type EditRange = { start: number; end: number };
export type TextEdit = { start: number; oldEnd: number; newEnd: number; removed: string; inserted: string };
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function hashInk(value: string) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return hash >>> 0;
}

export function glyphsFor(text: string, seeds?: number[], noteId = ''): Glyph[] {
  return Array.from(segmenter.segment(text), (part, index) => ({
    text: part.segment, start: part.index, end: part.index + part.segment.length,
    seed: seeds?.[index] ?? hashInk(`${noteId}:${index}:${part.segment}`),
  }));
}

// beforeinput ranges disambiguate edits in repeated text. Fallback boundaries
// are expanded to whole graphemes, including surrogate pairs and combining marks.
export function diffText(before: string, after: string, caret: number, inputType = '', range?: EditRange): TextEdit {
  let start = 0, oldEnd = before.length, newEnd = after.length;
  if (range) {
    start = range.start; oldEnd = range.end;
    if (start === oldEnd && inputType.startsWith('delete')) {
      if (/Backward$/.test(inputType)) start = caret;
      else oldEnd += before.length - after.length;
    }
    newEnd = start + after.length - before.length + oldEnd - start;
    if (newEnd < start || before.slice(0, start) !== after.slice(0, start) || before.slice(oldEnd) !== after.slice(newEnd)) start = -1;
  } else start = -1;
  if (start === -1) {
    start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start++;
    oldEnd = before.length; newEnd = after.length;
    while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  }
  const oldParts = glyphsFor(before), newParts = glyphsFor(after);
  const oldStart = oldParts.find(g => g.start < start && g.end > start)?.start ?? start;
  const newStart = newParts.find(g => g.start < start && g.end > start)?.start ?? start;
  start = Math.min(oldStart, newStart);
  const oldExpanded = oldParts.find(g => g.start < oldEnd && g.end > oldEnd)?.end ?? oldEnd;
  const newExpanded = newParts.find(g => g.start < newEnd && g.end > newEnd)?.end ?? newEnd;
  const extra = Math.max(oldExpanded - oldEnd, newExpanded - newEnd);
  oldEnd += extra; newEnd += extra;
  return { start, oldEnd, newEnd, removed: before.slice(start, oldEnd), inserted: after.slice(start, newEnd) };
}

export function reconcileInk(before: Glyph[], after: string, edit: TextEdit, nextSeed: () => number): Glyph[] {
  const prefix = before.filter(g => g.end <= edit.start);
  const suffix = before.filter(g => g.start >= edit.oldEnd);
  const inserted = glyphsFor(edit.inserted).map(g => ({ ...g, seed: nextSeed() }));
  const seeds = [...prefix, ...inserted, ...suffix].map(g => g.seed);
  return glyphsFor(after, seeds);
}

export function inkStyle(seed: number) {
  return {
    opacity: 1,
    tone: (seed % 5) - 2,
    offsetY: ((seed >>> 8) % 5 - 2) * .02,
    maskX: (seed >>> 12) % 97,
    maskY: (seed >>> 20) % 97,
  };
}
