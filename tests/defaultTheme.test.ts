import test from 'node:test';
import assert from 'node:assert/strict';
import { createNote, defaults, loadWorkspace, STORAGE_KEY } from '../src/storage.ts';

test('new workspaces start in night mode and retain saved day mode', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let saved: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => key === STORAGE_KEY ? saved : null },
  });
  try {
    assert.equal(loadWorkspace().settings.night, true);
    const note = createNote('Existing note');
    saved = JSON.stringify({ notes: [note], activeId: note.id, settings: { ...defaults, night: false } });
    const workspace = loadWorkspace();
    assert.equal(workspace.settings.night, false);
    assert.deepEqual(workspace.notes, [note]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
