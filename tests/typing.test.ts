import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphsFor, diffText, reconcileInk } from '../src/typing.ts';

test('beforeinput anchors edits in repeated text',()=>{
 assert.deepEqual(diffText('aaaa','aaa',1,'deleteContentBackward',{start:2,end:2}),{start:1,oldEnd:2,newEnd:1,removed:'a',inserted:''});
 assert.equal(diffText('banana','baXna',3,'insertText',{start:2,end:4}).removed,'na');
});
test('replacement and multiline deletion',()=>{
 assert.equal(diffText('one\ntwo\nthree','one\nthree',4,'deleteContentForward',{start:4,end:8}).removed,'two\n');
 const edit=diffText('abcd','aXYZd',4,'insertFromPaste',{start:1,end:3});
 assert.equal(edit.removed,'bc');assert.equal(edit.inserted,'XYZ');
});
test('graphemes keep emoji, accents and CJK intact',()=>{
 assert.equal(glyphsFor('A👨‍👩‍👧é中').length,4);
 const edit=diffText('A😀B','A😃B',3);assert.equal(edit.removed,'😀');assert.equal(edit.inserted,'😃');
 const accent=diffText('cafe','cafe\u0301',5);assert.equal(accent.removed,'e');assert.equal(accent.inserted,'e\u0301');
});
test('ink identity survives prefix insert, delete and replacement',()=>{
 const before=glyphsFor('abc',[10,20,30]);
 const inserted=reconcileInk(before,'Xabc',diffText('abc','Xabc',1),()=>99);
 assert.deepEqual(inserted.map(g=>g.seed),[99,10,20,30]);
 const deleted=reconcileInk(inserted,'Xac',diffText('Xabc','Xac',2,'deleteContentForward',{start:2,end:2}),()=>100);
 assert.deepEqual(deleted.map(g=>g.seed),[99,10,30]);
});
test('composition confirmation reconciles one committed result',()=>{
 const before=glyphsFor('Hello ',[1,2,3,4,5,6]);
 const next=reconcileInk(before,'Hello 中文',diffText('Hello ','Hello 中文',8),()=>50);
 assert.deepEqual(next.slice(0,6).map(g=>g.seed),[1,2,3,4,5,6]);assert.equal(next.slice(6).map(g=>g.text).join(''),'中文');
});

test('incremental reconciliation preserves complete Unicode graphemes across edits',()=>{
 for(const text of ['abc中文','cafe\u0301','A👨‍👩‍👧B','🇦🇧🇨🇩🇪🇫','A😀B']){
  const before=glyphsFor(text);
  for(const part of before)for(const replacement of ['', 'X', '中', '\u0301', '👩‍👧','🇿']){
   const after=text.slice(0,part.start)+replacement+text.slice(part.end);
   const edit=diffText(text,after,part.start+replacement.length,'insertText',{start:part.start,end:part.end},before);
   const result=reconcileInk(before,after,edit,()=>123);
   const bounds=(glyphs:ReturnType<typeof glyphsFor>)=>glyphs.map(({text,start,end})=>({text,start,end}));
   assert.deepEqual(bounds(result),bounds(glyphsFor(after)),JSON.stringify({text,after,edit}));
  }
 }
});

test('typing at the end and deleting it retain the unaffected glyph objects',()=>{
 const before=glyphsFor('Stable 中文',[10,20,30,40,50,60,70,80,90]);
 const added=reconcileInk(before,'Stable 中文X',diffText('Stable 中文','Stable 中文X',10,'insertText',{start:9,end:9},before),()=>99);
 before.forEach((glyph,i)=>assert.strictEqual(added[i],glyph));
 const removed=reconcileInk(added,'Stable 中文',diffText('Stable 中文X','Stable 中文',9,'deleteContentBackward',{start:10,end:10},added),()=>100);
 assert.deepEqual(removed,before);removed.forEach((glyph,i)=>assert.strictEqual(glyph,before[i]));
});
