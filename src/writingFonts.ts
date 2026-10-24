export const chineseFonts = [
  {id:'sans',title:'清晰黑体',family:'"Microsoft YaHei", "PingFang SC", "Noto Sans SC"',fallback:'sans-serif'},
  {id:'serif',title:'书卷宋体',family:'"Noto Serif SC Ink", "Noto Serif SC", "Songti SC", SimSun',fallback:'serif'},
  {id:'kai',title:'手写楷体',family:'"LXGW WenKai", "Kaiti SC", KaiTi',fallback:'serif'},
  {id:'fangsong',title:'端正仿宋',family:'FangSong, STFangsong, "Noto Serif SC"',fallback:'serif'},
  {id:'lishu',title:'古典隶书',family:'LiSu, "Noto Serif SC"',fallback:'serif'},
  {id:'youyuan',title:'柔和幼圆',family:'YouYuan, "Noto Sans SC"',fallback:'sans-serif'},
] as const;
export const englishFonts = [
  {id:'courier',title:'经典打字机',family:'"Courier Prime"'},
  {id:'typewriter',title:'旧式打字机',family:'"Special Elite"'},
  {id:'serif',title:'书卷衬线',family:'"Cormorant Garamond"'},
  {id:'sans',title:'简洁无衬线',family:'"DM Sans"'},
  {id:'georgia',title:'Georgia 衬线',family:'Georgia'},
  {id:'times',title:'Times New Roman',family:'"Times New Roman"'},
  {id:'handwritten',title:'Segoe Print 手写',family:'"Segoe Print"'},
] as const;
export type ChineseFont = typeof chineseFonts[number]['id'];
export type EnglishFont = typeof englishFonts[number]['id'];
export const defaultChineseFont:ChineseFont='sans';
export const defaultEnglishFont:EnglishFont='courier';
type FontSettings={chineseFont?:unknown;englishFont?:unknown};


export function normalizeWritingFonts(settings:FontSettings){
  return {
    chineseFont:chineseFonts.find(font=>font.id===settings.chineseFont)?.id??defaultChineseFont,
    englishFont:englishFonts.find(font=>font.id===settings.englishFont)?.id??defaultEnglishFont,
  };
}

// Latin faces take precedence; their missing CJK glyphs fall through to the
// chosen Chinese face. DOM layout and canvas drawing use this exact stack.
export function writingTypeface(settings:FontSettings){
  const normalized=normalizeWritingFonts(settings);
  const chinese=chineseFonts.find(font=>font.id===normalized.chineseFont)!;
  const english=englishFonts.find(font=>font.id===normalized.englishFont)!;
  return `${english.family}, ${chinese.family}, ${chinese.fallback}`;
}

export async function loadWritingFonts(settings:FontSettings,size:number,text:string){
  const typeface=writingTypeface(settings);
  // FontFaceSet.load defaults to a Latin space; pass actual text so CJK
  // unicode-range subsets are ready before exporting or revealing the room.
  await document.fonts.load(`${size}px ${typeface}`,text||'书写 Ink');
}
