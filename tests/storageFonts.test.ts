import test from 'node:test';
import assert from 'node:assert/strict';
import {createNote,defaults,loadWorkspace,STORAGE_KEY} from '../src/storage.ts';

function fromSaved(data:unknown){
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===STORAGE_KEY?JSON.stringify(data):null}});
  try{return loadWorkspace();}
  finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
test('loading a pre-font workspace preserves notes and existing preferences',()=>{
  const note={...createNote('中文 Ink\n纸上书写'),bookmark:'#aaaaaa',inkSeeds:[1,2,3]};
  const {chineseFont:_chinese,englishFont:_english,...legacy}=defaults;
  const loaded=fromSaved({notes:[note],activeId:note.id,settings:{...legacy,night:true,ink:91}});
  assert.deepEqual(loaded.notes,[note]);
  assert.equal(loaded.activeId,note.id);
  assert.equal(loaded.settings.night,true);
  assert.equal(loaded.settings.ink,91);
  assert.equal(loaded.settings.chineseFont,'sans');
  assert.equal(loaded.settings.englishFont,'courier');
});
test('saved mixed font choices survive reload, and unknown choices fall back independently',()=>{
  const note=createNote('书写');
  const saved={notes:[note],activeId:note.id,settings:{...defaults,chineseFont:'kai',englishFont:'serif'}};
  assert.equal(fromSaved(saved).settings.chineseFont,'kai');
  assert.equal(fromSaved(saved).settings.englishFont,'serif');
  saved.settings.chineseFont='unsupported';
  const loaded=fromSaved(saved);
  assert.equal(loaded.settings.chineseFont,'sans');
  assert.equal(loaded.settings.englishFont,'serif');
});
