import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import FlowerBookmark from './FlowerBookmark';
import SettingRange from './SettingRange';
import { flowerDesigns, sliderDesigns, findFlowerDesign, findSliderDesign, defaultFlowerDesign, defaultSliderDesign } from './controlDesigns';
import type { FlowerDesign, SliderDesign } from './controlDesigns';
import { paperSkins } from './skins';
import './control-preview.css';

export default function ControlPreview() {
  const params = new URLSearchParams(location.search);
  const [flower, setFlower] = useState<FlowerDesign>(findFlowerDesign(params.get('flower'))?.id ?? defaultFlowerDesign);
  const [slider, setSlider] = useState<SliderDesign>(findSliderDesign(params.get('slider'))?.id ?? defaultSliderDesign);
  const [night, setNight] = useState(params.get('theme') !== 'day');
  const [curved, setCurved] = useState(params.get('shape') !== 'flat');
  const [view, setView] = useState<'writer'|'settings'|'library'>('writer');
  const [levels, setLevels] = useState([66,66,66]);
  const sample = `${import.meta.env.BASE_URL}?control-sample=1&flower=${flower}&slider=${slider}&theme=${night?'night':'day'}&shape=${curved?'curved':'flat'}${view==='writer'?'':`&panel=${view}`}`;
  const select = (nextFlower: FlowerDesign, nextSlider: SliderDesign) => {
    setFlower(nextFlower); setSlider(nextSlider);
    const url = new URL(location.href); url.searchParams.set('flower',nextFlower);url.searchParams.set('slider',nextSlider);history.replaceState(null,'',url);
  };
  return <main className={`app control-preview${night?' night':''}`}>
    <header className="control-preview-header"><div><a href={import.meta.env.BASE_URL} className="control-preview-brand">inklune</a><h1>纸上的花，手边的刻度</h1><p>先选花朵与滑杆，再到下方书写页查看实际大小。</p></div><div className="preview-toggle" role="group" aria-label="预览明暗"><button aria-pressed={!night} onClick={()=>setNight(false)}>日间</button><button aria-pressed={night} onClick={()=>setNight(true)}>夜间</button></div></header>
    <section className="control-gallery" aria-labelledby="flowers-title"><div className="control-gallery-heading"><h2 id="flowers-title">花朵书签</h2><p>四种笔触，均放在纸张底部居中。</p></div><div className="flower-design-grid">
      {flowerDesigns.map((item,index)=><button key={item.id} className={`flower-design-card${flower===item.id?' selected':''}`} aria-pressed={flower===item.id} onClick={()=>select(item.id,slider)}><span className="flower-card-paper" style={{backgroundImage:`url("${paperSkins.cotton.url}")`}}><FlowerBookmark design={item.id} color="#b898a6"/></span><span className="design-card-title"><span>{index+1}. {item.title}</span>{flower===item.id&&<Check size={16}/>}</span><span className="design-card-description">{item.description}</span></button>)}
    </div></section>
    <section className="control-gallery" aria-labelledby="sliders-title"><div className="control-gallery-heading"><h2 id="sliders-title">滑杆方案</h2><p>可直接拖动，也支持方向键精调。</p></div><div className="slider-design-grid">
      {sliderDesigns.map((item,index)=><article key={item.id} className={`slider-design-card settings-panel${slider===item.id?' selected':''}`}><button className="design-card-title" aria-pressed={slider===item.id} onClick={()=>select(flower,item.id)}><span>{String.fromCharCode(65+index)}. {item.title}</span>{slider===item.id&&<Check size={16}/>}</button><p className="design-card-description">{item.description}</p><SettingRange title="灯光强度" label={`${item.title}灯光强度`} min={0} max={100} value={levels[index]} output={`${levels[index]}%`} onChange={value=>setLevels(old=>old.map((level,i)=>i===index?value:level))} design={item.id}/><button className="design-select" aria-pressed={slider===item.id} onClick={()=>select(flower,item.id)}>{slider===item.id?'当前预览':'在书写页预览'}</button></article>)}
    </div></section>
    <section className="control-live" aria-labelledby="live-title"><header><div><h2 id="live-title">实际页面</h2><p>{flowerDesigns.find(item=>item.id===flower)?.title} · {sliderDesigns.find(item=>item.id===slider)?.title}</p></div><div className="control-live-tools"><div className="preview-toggle" role="group" aria-label="预览纸张形态"><button aria-pressed={curved} onClick={()=>setCurved(true)}>弯曲纸张</button><button aria-pressed={!curved} onClick={()=>setCurved(false)}>平面纸张</button></div><div className="preview-toggle" role="group" aria-label="预览内容"><button aria-pressed={view==='writer'} onClick={()=>setView('writer')}>书写</button><button aria-pressed={view==='settings'} onClick={()=>setView('settings')}>设置</button><button aria-pressed={view==='library'} onClick={()=>setView('library')}>信盒</button></div><a href={sample} target="_blank" rel="noreferrer">全屏预览<ArrowUpRight size={15}/></a></div></header><iframe key={sample} title="书签与滑杆实际页面" src={sample}/><footer>示例稿件用于比较。正式采用单线简笔与分段标尺，书签位于纸张底部居中。</footer></section>
  </main>;
}

