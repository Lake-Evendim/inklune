import type { Note, Settings } from './storage';
import { titleOf } from './storage';
import { paperSkins } from './skins';
import inkWearUrl from './ink-wear.png';
import { glyphsFor, hashInk, inkStyle } from './typing';
import type { Glyph } from './typing';
import { rulingGap } from './ruling';
import {loadWritingFonts,writingTypeface} from './writingFonts';
import {paperInkColor,protectedInkWear,inkGrainTone} from './inkRendering';
export async function exportPaper(note: Note, settings: Settings) {
  await document.fonts.ready;
  await document.fonts.load('30px Borel');
  const canvas = document.createElement('canvas'); canvas.width = 1400;
  const ctx = canvas.getContext('2d')!; const size = settings.fontSize * canvas.width / 430; const leading = size * 1.02; const margin = 280, firstBaseline = 225;
  const typeface = writingTypeface(settings);
  const printFont = `${size}px ${typeface}`;
  await loadWritingFonts(settings,size,note.text+(note.traces||[]).map(trace=>trace.text).join(''));
  ctx.font = printFont;
  const lines: Glyph[][] = []; let line: Glyph[] = [], width = 0;
  for (const glyph of glyphsFor(note.text, note.inkSeeds, note.id)) {
    if (glyph.text === '\n') { lines.push(line); line = []; width = 0; continue; }
    const advance = ctx.measureText(glyph.text).width;
    if (width + advance > canvas.width - margin * 2) { lines.push(line); line = []; width = 0; }
    line.push(glyph); width += advance;
  }
  lines.push(line);
  canvas.height = Math.max(1800, 430 + lines.length * leading);
  ctx.fillStyle = paperSkins[settings.paper].color; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const material = new Image(); material.src = paperSkins[settings.paper].url; await material.decode();
  const tile = document.createElement('canvas'); tile.width = tile.height = Math.round(512 * canvas.width / 430);
  tile.getContext('2d')!.drawImage(material, 0, 0, tile.width, tile.height);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (settings.paper === 'lined') { ctx.strokeStyle = '#bdc7bc'; ctx.lineWidth = 1; for (let y = firstBaseline + rulingGap(size); y < canvas.height - 100; y += leading) { ctx.beginPath(); ctx.moveTo(margin - 35, y); ctx.lineTo(canvas.width - margin + 35, y); ctx.stroke(); } }
  ctx.fillStyle = '#7d806e'; ctx.font = '22px "DM Sans", sans-serif'; ctx.fillText(new Date(note.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Shanghai' }), margin, 100);
  const wear = new Image(); wear.src = inkWearUrl; await wear.decode();
  const stamp = document.createElement('canvas'); stamp.width = Math.ceil(size * 4); stamp.height = Math.ceil(size * 2);
  const stampContext = stamp.getContext('2d')!;
  const wearCanvas=document.createElement('canvas');wearCanvas.width=wear.width;wearCanvas.height=wear.height;
  const wearContext=wearCanvas.getContext('2d')!;wearContext.drawImage(wear,0,0);
  const wearPixels=wearContext.getImageData(0,0,wear.width,wear.height).data;
  const pixelScale=canvas.width/430,radius=Math.max(1,Math.round(.65*pixelScale));
  const print = (text: string, seed: number, x: number, y: number, alpha: number) => {
    const ink = inkStyle(seed);
    const padding=Math.ceil(size*.2),baseline=Math.ceil(size);
    stampContext.font=printFont;
    stamp.width=Math.ceil(stampContext.measureText(text).width+padding*2+size*.2);
    stampContext.font = printFont; stampContext.fillStyle = paperInkColor(settings.ink,ink.tone);stampContext.globalAlpha=ink.opacity;stampContext.fillText(text,padding,baseline);
    const image=stampContext.getImageData(0,0,stamp.width,stamp.height),coverage=new Uint8ClampedArray(image.data);
    const left=Math.round(x-padding),top=Math.round(y-baseline+ink.offsetY*pixelScale);
    const a=(px:number,py:number)=>px<0||py<0||px>=stamp.width||py>=stamp.height?0:coverage[(py*stamp.width+px)*4+3]/255;
    for(let py=0;py<stamp.height;py++)for(let px=0;px<stamp.width;px++){
      const i=(py*stamp.width+px)*4+3;if(!coverage[i])continue;
      const neighbours=Math.min(a(px-radius,py),a(px+radius,py),a(px,py-radius),a(px,py+radius));
      const wx=((Math.floor((left+px)/pixelScale)%wear.width)+wear.width)%wear.width,wy=((Math.floor((top+py)/pixelScale)%wear.height)+wear.height)%wear.height;
      const wearAlpha=wearPixels[(wy*wear.width+wx)*4+3]/255,grain=inkGrainTone(neighbours,wearAlpha);
      image.data[i]=Math.round(coverage[i]*protectedInkWear(neighbours,wearAlpha));
      for(let channel=1;channel<=3;channel++)image.data[i-channel]=Math.min(255,coverage[i-channel]+grain);
    }
    stampContext.putImageData(image,0,0);ctx.globalAlpha=alpha;ctx.drawImage(stamp,left,top);
  };
  ctx.font = printFont;
  lines.forEach((row,i)=> { let x = margin; for (const glyph of row) { print(glyph.text,glyph.seed,x,firstBaseline+i*leading,1); x += ctx.measureText(glyph.text).width; } });
  for (const trace of note.traces || []) { const x = margin + trace.x * (canvas.width - margin * 2), y = firstBaseline + trace.row * leading; print(trace.text,trace.seed??hashInk(trace.text),x,y,.64); ctx.beginPath(); ctx.moveTo(x, y - size * .32); ctx.lineTo(x + ctx.measureText(trace.text).width, y - size * .32); ctx.lineWidth = 2; ctx.strokeStyle = paperInkColor(settings.ink); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = '#8c8d7d'; ctx.font = '30px Borel, cursive'; ctx.fillText('inklune', margin, canvas.height - 90); ctx.font = '19px "DM Sans", sans-serif'; ctx.textAlign = 'right'; ctx.fillText('留一点时间给自己', canvas.width - margin, canvas.height - 90);
  const name = titleOf(note).replace(/[<>:"/\\|?*]/g, '-');
  await new Promise<void>((resolve, reject)=>canvas.toBlob(blob=> { if (!blob) { reject(new Error('图片生成失败')); return; } const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${name}.png`; link.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000); resolve(); }, 'image/png'));
}
