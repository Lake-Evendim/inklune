import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Settings } from './storage';
import { paperSkins } from './skins';
import { lampAperture, lampContour, lampTint } from './lamp';
import type { LampFrame } from './lampIgnition';

type LightingRefs = {
  root: RefObject<HTMLDivElement | null>; paper: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>; draw: RefObject<(() => void) | null>;
  drawPaper: RefObject<(() => void) | null>;
};
const materials = Object.fromEntries(Object.entries(paperSkins).map(([id,stock])=>[id,{ day:[1,3,5].map(i=>parseInt(stock.color.slice(i,i+2),16)),ambient:stock.ambient }]));
// Measured from the official App Store night image at 150% / 112° / 120%.
// The centre stays bright near the slit, while lateral shading increases
// before the longitudinal fade. Geometry stays independent of these knots.
const sections = [
  // height, center level, lateral rolloff
  [0, .88, .00], [5, .92, .00], [15, .96, .00],
  [30, 1, .03], [50, 1, .10], [70, .95, .33],
  [90, .70, .37], [110, .50, .41], [130, .36, .50],
  [150, .225, .60], [175, .07, .65], [200, 0, .65],
  [225, 0, .65],
];
function profile(height: number) {
  for (let i=1;i<sections.length;i++) {
    if (height > sections[i][0]) continue;
    const a=sections[i-1], b=sections[i];
    const t=Math.max(0,Math.min(1,(height-a[0])/(b[0]-a[0])));
    return a.slice(1).map((v,j)=> {
      const column=j+1, delta=(b[column]-v)/(b[0]-a[0]);
      const slope=(row:number)=> {
        const prev=sections[Math.max(0,row-1)], next=sections[Math.min(sections.length-1,row+1)], at=sections[row];
        if(row===0 || row===sections.length-1) return (next[column]-prev[column])/(next[0]-prev[0]);
        const left=(at[column]-prev[column])/(at[0]-prev[0]);
        const right=(next[column]-at[column])/(next[0]-at[0]);
        if(left*right<=0)return 0;
        return 2*left*right/(left+right);
      };
      const span=b[0]-a[0];
      const m0=Math.abs(delta)<1e-8?0:slope(i-1), m1=Math.abs(delta)<1e-8?0:slope(i);
      return (2*t*t*t-3*t*t+1)*v+(t*t*t-2*t*t+t)*span*m0+(-2*t*t*t+3*t*t)*b[column]+(t*t*t-t*t)*span*m1;
    });
  }
  return [0,.65];
}
export default function usePaperLighting(refs: LightingRefs, settings: Settings, ignition: RefObject<LampFrame>) {
  const field=useRef<HTMLCanvasElement | null>(null);
  useLayoutEffect(()=> {
    const paper=refs.paper.current, canvas=refs.canvas.current;
    if (!paper || !canvas) return;
    const material=materials[settings.paper];
    const ambient=material.ambient.map((v,i)=>Math.round(v/material.day[i]*255));
    const power=settings.brightness/150, reach=settings.beam/120;
    // Angular spread changes width only; range changes both projection axes.
    const spread=Math.tan(settings.spread/2*Math.PI/180)/Math.tan(56*Math.PI/180);
    const tint=lampTint(settings.warmth);
    let scale=1, fieldWidth=0, fieldHeight=0, upperHeight=0, sheetWidth=0, sheetHeight=0,lastPaint='';
    const rebuild=()=> {
      if (paper.clientWidth<=0 || paper.clientHeight<=0) return;
      const ratio=Math.min(devicePixelRatio || 1,2);
      sheetWidth=paper.clientWidth;sheetHeight=paper.clientHeight;
      scale=sheetWidth/430;
      lastPaint='';
      canvas.width=Math.round(paper.clientWidth*ratio); canvas.height=Math.round(paper.clientHeight*ratio);
      // Anything farther than a full sheet to either side cannot be visible
      // for a carriage constrained to that sheet. Avoid huge offscreen fields.
      fieldWidth=Math.min(680*scale*reach*Math.max(1,spread),paper.clientWidth*2+80*scale);
      upperHeight=226*scale*reach;
      // Continue below the aperture with a short smooth tail. The former
      // sprite ended with nonzero alpha at its bottom, creating a straight
      // seam across the paper when the spread was enlarged.
      fieldHeight=upperHeight+32*scale;
      const sprite=field.current || document.createElement('canvas'); field.current=sprite;
      sprite.width=Math.ceil(fieldWidth*ratio); sprite.height=Math.ceil(fieldHeight*ratio);
      const context=sprite.getContext('2d')!;
      const pixels=context.createImageData(sprite.width,sprite.height);
      for(let y=0;y<sprite.height;y++) {
        const height=(upperHeight-y/ratio)/scale;
        const distance=Math.max(0,height/reach);
        const [baseLevel,rolloff]=profile(distance);
        const level=baseLevel*(height<0?Math.exp(-Math.pow(height/3.5,2)):1);
        // Range and angle enlarge the cone, never the physical aperture.
        const halfSource=lampAperture.length/2;
        // Curvature ends after the short aperture transition; the remainder
        // of the cone and both feather boundaries continue as straight lines.
        const {expansion,feather}=lampContour(distance);
        const radius=halfSource+expansion*reach*spread;
        // Angle controls the cone, not a second broad halo. Bounded growth
        // keeps the distant edge legible while intensity fades along the beam.
        const softness=.55+feather*reach*Math.sqrt(spread);
        for(let x=0;x<sprite.width;x++) {
          const offset=Math.abs(x-sprite.width/2)/ratio/scale;
          // Compact quintic feather: zero light outside the penumbra and
          // continuous first/second derivatives at both of its boundaries.
          const t=Math.max(0,Math.min(1,.5+(radius-offset)/(6*softness)));
          const edge=t*t*t*(t*(6*t-15)+10);
          const lateral=Math.exp(-rolloff*Math.pow(offset/Math.max(radius,1),2));
          // The reference has a cream pool with a soft gray upper falloff.
          // Exponential exposure keeps intensity adjustment continuous.
          const exposure=Math.min(1,level*edge*lateral*.97);
          const amount=1-Math.pow(1-exposure,power);
          const index=(y*sprite.width+x)*4;
          for(let c=0;c<3;c++) {
            // At a different paper color the lamp illuminates that stock;
            // use its reflectance instead of whitening every sheet to cream.
            pixels.data[index+c]=Math.min(255,tint[c]/materials.cotton.day[c]*255);
          }
          pixels.data[index+3]=Math.round(amount*255);
        }
      }
      context.putImageData(pixels,0,0);
    };
    const draw=()=> {
      // Motion/font observers can draw before our ResizeObserver runs. Never
      // place a new source into the previous layout's canvas/sprite geometry.
      if(sheetWidth!==paper.clientWidth || sheetHeight!==paper.clientHeight)rebuild();
      const root=refs.root.current,sprite=field.current;
      if(!root || !sprite?.width || !canvas.width || !paper.clientWidth)return;
      const ratio=canvas.width/paper.clientWidth;
      const x=parseFloat(root.style.getPropertyValue('--carriage-x')) || 80;
      const y=parseFloat(root.style.getPropertyValue('--carriage-y')) || 135;
      const origin=y+lampAperture.origin*scale;
      const { amount, projection } = ignition.current;
      const projected=amount>0&&projection>0;
      const state=[sheetWidth,sheetHeight,canvas.width,canvas.height,amount,projection,projected?x:0,projected?y:0].join('|');
      if(state===lastPaint)return;
      lastPaint=state;
      const context=canvas.getContext('2d')!;
      context.setTransform(1,0,0,1,0,0);
      context.fillStyle=`rgb(${ambient.join(' ')})`;
      // Fill every physical pixel, including a fractional CSS bottom row,
      // so previous frames cannot accumulate at the canvas boundary.
      context.fillRect(0,0,canvas.width,canvas.height);
      context.setTransform(ratio,0,0,ratio,0,0);
      // Only the aperture's projected field can raise the paper above its
      // ambient level. A separate reflection pool would light unexposed areas.
      context.save();context.globalAlpha=amount;
      // Project from the physical slit: its width stays fixed while the cone
      // grows in depth and breadth. A whole-field fade has no direction.
      if (projection >= 1) context.drawImage(sprite,x-fieldWidth/2,origin-upperHeight,fieldWidth,fieldHeight);
      else if (projection > 0) {
        const aperture=lampAperture.length*scale, source=aperture*sprite.width/fieldWidth;
        const wing=(sprite.width-source)/2, projectedWing=(fieldWidth-aperture)/2*projection;
        context.save();context.translate(x,origin);context.scale(1,projection);
        context.drawImage(sprite,0,0,wing,sprite.height,-aperture/2-projectedWing,-upperHeight,projectedWing,fieldHeight);
        context.drawImage(sprite,wing,0,source,sprite.height,-aperture/2,-upperHeight,aperture,fieldHeight);
        context.drawImage(sprite,wing+source,0,wing,sprite.height,aperture/2,-upperHeight,projectedWing,fieldHeight);
        context.restore();
      }
      context.restore();
      canvas.dataset.lampAmount=String(amount);
      canvas.dataset.lampProjection=String(projection);
      canvas.dataset.version=String(Number(canvas.dataset.version||0)+1);
      canvas.dataset.carriageX=String(x);canvas.dataset.carriageY=String(y);
      canvas.dataset.sheetWidth=String(sheetWidth);canvas.dataset.sheetHeight=String(sheetHeight);
      refs.drawPaper.current?.();
    };
    refs.draw.current=draw;rebuild();draw();
    const observer=new ResizeObserver(draw);observer.observe(paper);
    return ()=>{observer.disconnect();refs.draw.current=null;};
  },[refs.root,refs.paper,refs.canvas,refs.draw,refs.drawPaper,ignition,settings.paper,settings.brightness,settings.warmth,settings.beam,settings.spread]);
}
