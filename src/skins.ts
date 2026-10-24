import type { Paper, Settings } from './storage';
import cotton from './assets/paper-cotton.webp';
import cream from './assets/paper-cream.webp';
import blue from './assets/paper-blue.webp';
import rose from './assets/paper-rose.webp';
import linen from './assets/paper-linen.webp';
import parchment from './assets/paper-parchment.webp';

export type Kit = 'classic' | 'seaglass' | 'basalt' | 'porcelain' | 'walnut' | 'pumpkin' | 'mummy' | 'frankenstein' | 'storm';
export type Endcap = 'plain' | 'brass' | 'jade' | 'pumpkin' | 'mummy';
export type Decoration = 'none' | 'garden' | 'cobweb';
export const paperSkins: Record<Paper, { title: string; caption: string; color: string; ambient: number[]; url: string }> = {
 cotton: { title: '棉纤纸', caption: '细纤维、微小纸屑与柔软的压痕', color: '#eeece1', ambient: [56,56,56], url: cotton },
 cream: { title: '旧时信纸', caption: '暖米色纸浆，留着浅浅的天然纤维', color: '#f1e8c8', ambient: [62,58,49], url: cream },
 blue: { title: '云蓝纸', caption: '冷蓝纸面，更细密的压纹', color: '#dbe6eb', ambient: [53,58,60], url: blue },
 rose: { title: '蔷薇纸', caption: '淡玫瑰色，细腻的纸浆纹理', color: '#f4dad2', ambient: [61,54,52], url: rose },
 lined: { title: '横线纸', caption: '棉纸上的淡线，随字号保持行距', color: '#eeece1', ambient: [56,56,56], url: cotton },
 linen: { title: '亚麻纸', caption: '交织的细纹与略带灰度的本色', color: '#e7e1d0', ambient: [56,55,50], url: linen },
 parchment: { title: '月夜羊皮纸', caption: '蜜褐色纸面，天然斑点与细纤维', color: '#e5d3b5', ambient: [61,55,46], url: parchment },
};
export const kits: { id: Kit; title: string; caption: string; seasonal?: boolean; rail: Settings['rail']; endcap: Endcap; decoration: Decoration }[] = [
 { id:'classic', title:'经典搪瓷', caption:'温白搪瓷 · 抛光精钢', rail:'steel', endcap:'plain', decoration:'none' },
 { id:'seaglass', title:'海玻璃', caption:'半透青绿 · 玉石端饰', rail:'steel', endcap:'jade', decoration:'none' },
 { id:'basalt', title:'火山岩', caption:'细密孔隙 · 深色金属', rail:'blackened', endcap:'plain', decoration:'none' },
 { id:'porcelain', title:'青花瓷', caption:'釉下蓝花 · 温润黄铜', rail:'brass', endcap:'brass', decoration:'none' },
 { id:'walnut', title:'胡桃木', caption:'流动木纹 · 黄铜镶边', rail:'brass', endcap:'brass', decoration:'none' },
 { id:'pumpkin', title:'南瓜灯', caption:'雕刻眼窝 · 摇曳烛光', seasonal:true, rail:'blackened', endcap:'pumpkin', decoration:'cobweb' },
 { id:'mummy', title:'木乃伊', caption:'交叠织带 · 垂落的绷带', seasonal:true, rail:'steel', endcap:'mummy', decoration:'cobweb' },
 { id:'frankenstein', title:'弗兰肯斯坦', caption:'缝合皮革 · 触键电火花', seasonal:true, rail:'blackened', endcap:'brass', decoration:'cobweb' },
 { id:'storm', title:'水晶风暴', caption:'紫色晶体 · 落字时的闪电', seasonal:true, rail:'blackened', endcap:'jade', decoration:'cobweb' },
];
