// A notebook rule sits just below the alphabetic baseline, leaving
// descenders free to cross it. The same proportion is used in PNG exports.
export const rulingGap = (fontSize: number) => fontSize * .12;

const steps=new WeakMap<HTMLElement,{key:string;step:number}>();
// CSS line-height can be rounded once per real line box. Use that physical
// step for ink, rules and the carriage so long pages do not accumulate drift.
export function paperLineStep(text:HTMLElement,refresh=false) {
 const doc=text.ownerDocument,style=doc.defaultView!.getComputedStyle(text);
 const key=[style.fontFamily,style.fontSize,style.lineHeight,style.fontWeight,style.fontStyle,style.fontStretch,doc.fonts.status].join('|');
 const cached=steps.get(text);if(!refresh&&cached?.key===key)return cached.step;
 const probe=text.cloneNode(false) as HTMLElement;
 probe.style.cssText='position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;min-height:0;height:auto';
 const a=doc.createElement('span'),b=doc.createElement('span');a.className=b.className='rule-baseline-marker';
 probe.append(a,doc.createElement('br'),b);text.parentElement!.append(probe);
 const measured=b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom;probe.remove();
 const step=measured>0?measured:parseFloat(style.lineHeight);steps.set(text,{key,step});return step;
}
