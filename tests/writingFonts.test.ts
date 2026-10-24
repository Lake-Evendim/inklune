import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWritingFonts,writingTypeface} from '../src/writingFonts.ts';

test('legacy and unknown font settings retain the existing default pairing',()=>{
  assert.deepEqual(normalizeWritingFonts({}),{chineseFont:'sans',englishFont:'courier'});
  assert.deepEqual(normalizeWritingFonts({chineseFont:'removed-font',englishFont:null}),{chineseFont:'sans',englishFont:'courier'});
});
test('a missing or invalid language choice does not reset the other language',()=>{
  assert.deepEqual(normalizeWritingFonts({chineseFont:'kai'}),{chineseFont:'kai',englishFont:'courier'});
  assert.deepEqual(normalizeWritingFonts({chineseFont:42,englishFont:'serif'}),{chineseFont:'sans',englishFont:'serif'});
});
test('mixed typography puts the selected Latin face before the selected CJK fallback',()=>{
  const serif=writingTypeface({chineseFont:'serif',englishFont:'typewriter'});
  assert.ok(serif.indexOf('Special Elite')<serif.indexOf('Noto Serif SC'));
  const kai=writingTypeface({chineseFont:'kai',englishFont:'typewriter'});
  assert.ok(kai.startsWith('"Special Elite"'));
  assert.ok(kai.includes('LXGW WenKai'));
  assert.ok(!kai.includes('Noto Serif SC'));
});
test('Song supplies screen ink through its CJK face without requesting a Latin weight',()=>{
  const face=writingTypeface({chineseFont:'serif',englishFont:'courier'});
  assert.ok(face.startsWith('"Courier Prime"'));
  assert.ok(face.includes('"Noto Serif SC Ink"'));
  assert.ok(!writingTypeface({chineseFont:'sans'}).includes('Noto Serif SC Ink'));
});
