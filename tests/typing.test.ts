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
