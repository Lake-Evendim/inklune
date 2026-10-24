export const sliderDesigns = [
  { id: 'engraved', title: '刻度导轨', description: '细密刻度与金属指针，轻巧而精确。' },
  { id: 'groove', title: '凹槽滑块', description: '内凹轨道与带握纹的滑块，触感更明确。' },
  { id: 'ruler', title: '分段标尺', description: '疏朗的分段刻度，读数清楚，保留连续调节。' },
] as const;
export type SliderDesign = typeof sliderDesigns[number]['id'];
export const flowerDesigns = [
  { id: 'line', title: '单线简笔', description: '一枝细线小雏菊，轻盈、克制。' },
  { id: 'sketch', title: '铅笔素描', description: '叠笔与排线，保留石墨的轻重。' },
  { id: 'freehand', title: '随手线描', description: '不规则花瓣与微弯花茎，随性柔软。' },
  { id: 'botanical', title: '植物手稿', description: '侧开的花朵与叶脉，像手账中的植物观察。' },
] as const;
export type FlowerDesign = typeof flowerDesigns[number]['id'];
export const defaultFlowerDesign: FlowerDesign = 'line';
export const defaultSliderDesign: SliderDesign = 'ruler';
export const findSliderDesign = (id: string | null) => sliderDesigns.find(item => item.id === id);
export const findFlowerDesign = (id: string | null) => flowerDesigns.find(item => item.id === id);
