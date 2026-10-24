import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, duplicateNote, libraryNotes, noteExcerpt, noteReadingBody } from '../src/libraryModel.ts';
import { createNote, titleOf } from '../src/storage.ts';
const a = { ...createNote('第一行\n\nTea in the garden.\n雨后的梧桐。', '2026-08-01T00:00:00Z'), id:'a', title:'晚风', updated:'2026-10-01T00:00:00Z', bookmark:'#b898a6', inkSeeds:[1,2], traces:[{text:'旧',x:.2,row:1,seed:13}] };
const b = { ...createNote('明天去海边', '2026-09-01T00:00:00Z'), id:'b' };
const deleted = { ...createNote('旧信', '2025-01-01T00:00:00Z'), id:'c', deleted:true, deletedAt:'2026-10-02T00:00:00Z' };
test('title and full body match multiple terms without changing the source',()=>{
 assert.deepEqual(libraryNotes([a,b,deleted],'all',' 晚风 GARDEN ', 'updated').map(n=>n.id),['a']);
 assert.deepEqual(libraryNotes([a,b,deleted],'all','雨后', 'created').map(n=>n.id),['a']);
 assert.equal(libraryNotes([a,b],'all','garden 海边','created').length,0);
 assert.equal(a.text,'第一行\n\nTea in the garden.\n雨后的梧桐。');
});
test('blank queries, bookmarks and trash stay scoped',()=>{
 assert.equal(libraryNotes([a,b,deleted],'all','  ','updated').length,2);
 assert.deepEqual(libraryNotes([a,b,deleted],'bookmarks','','updated').map(n=>n.id),['a']);
 assert.deepEqual(libraryNotes([a,b,deleted],'trash','','updated').map(n=>n.id),['c']);
});
test('created and updated order differ and do not reorder the stored array',()=>{
 const notes=[a,b];
 assert.deepEqual(libraryNotes(notes,'all','','created').map(n=>n.id),['b','a']);
 assert.deepEqual(libraryNotes(notes,'all','','updated').map(n=>n.id),['a','b']);
 assert.deepEqual(notes.map(n=>n.id),['a','b']);
});
test('recent deletion order uses deletion time with a legacy fallback',()=>{
 const legacy={...b,deleted:true,updated:'2026-10-03T00:00:00Z'};
 assert.deepEqual(libraryNotes([deleted,legacy],'trash','','updated').map(n=>n.id),['b','c']);
});
test('renaming is optional and independent of text',()=>{
 assert.equal(titleOf({...a,title:'  '}),'第一行');
 assert.equal(titleOf({...a,title:cleanTitle('  花园  ')}),'花园');
 assert.equal(cleanTitle('字'.repeat(100)).length,80);
 assert.equal(titleOf({...b,text:''}),'一页新的故事');
});
test('context excerpts include a match beyond the start of a long note',()=>{
 const long={...a,text:'平常的一句话。'.repeat(30)+'梧桐下的秘密。'};
 assert.ok(noteExcerpt(long,'梧桐').includes('梧桐'));
 assert.ok(noteExcerpt(long,'梧桐').startsWith('…'));
 assert.equal(noteExcerpt({...a,text:' \n '},''),'还没有正文');
});
test('a duplicate has a new identity and independent ink history',()=>{
 const copy=duplicateNote(a);
 assert.notEqual(copy.id,a.id); assert.equal(copy.text,a.text); assert.equal(copy.bookmark,a.bookmark);
 assert.equal(titleOf(copy),'晚风（副本）'); assert.equal(copy.deleted,false);
 assert.deepEqual(copy.inkSeeds,a.inkSeeds); assert.deepEqual(copy.traces,a.traces);
 copy.inkSeeds![0]=99; copy.traces![0].row=99;
 assert.equal(a.inkSeeds[0],1); assert.equal(a.traces[0].row,1);
 assert.ok(titleOf(duplicateNote({...a,title:'字'.repeat(80)})).endsWith('（副本）'));
});
test('reading removes only a fully repeated title and preserves the stored text',()=>{
 const note=createNote('  静夜\r\n\r\n留住窗边的风。\r\n\r\n给自己。');
 assert.equal(noteReadingBody(note),'留住窗边的风。\r\n\r\n给自己。');
 assert.equal(note.text,'  静夜\r\n\r\n留住窗边的风。\r\n\r\n给自己。');
 assert.equal(noteReadingBody({...note,title:'另一封信'}),note.text);
 const long=createNote('字'.repeat(50)+'\n正文');
 assert.equal(noteReadingBody(long),long.text);
 assert.equal(noteReadingBody(createNote('静夜')),'');
});
