import { useRef, useState } from 'react';
import { Check, Moon, Sun, Volume2, X } from 'lucide-react';
import type { Capsule, Paper, Settings } from './storage';
import { kits, paperSkins } from './skins';
import { lampTemperature, lampWarmthRange } from './lamp';
import KitGallery from './KitGallery';
import SettingRange from './SettingRange';
import SettingSelect from './SettingSelect';
import type { SliderDesign } from './controlDesigns';
import {chineseFonts,englishFonts,writingTypeface} from './writingFonts';
import {paperInkColor} from './inkRendering';
const papers = (Object.keys(paperSkins) as Paper[]).map(id => ({ id, ...paperSkins[id] }));
const capsules: { id: Capsule; title: string; color: string }[] = [{id:'ivory',title:'象牙白',color:'#ece9da'},{id:'sage',title:'鼠尾草',color:'#839580'},{id:'blue',title:'深海蓝',color:'#3d6584'},{id:'rose',title:'莓果粉',color:'#bd8f8e'},{id:'charcoal',title:'石墨黑',color:'#3e4340'}];
const sections = [{id:'paper',title:'纸张'},{id:'kit',title:'套件'},{id:'ink',title:'书写'},{id:'light',title:'灯光'}] as const;
const endcaps = [{id:'plain',title:'经典精钢'},{id:'brass',title:'黄铜'},{id:'jade',title:'玉石'},{id:'pumpkin',title:'南瓜灯'},{id:'mummy',title:'木乃伊绷带'}] as const;
const decorations = [{id:'none',title:'无装饰'},{id:'garden',title:'小花园'},{id:'cobweb',title:'蛛网与蜘蛛'}] as const;
type Section = typeof sections[number]['id'];
export default function SettingsPanel({settings,onUpdate,onClose,sliderDesign}:{settings:Settings;onUpdate:(patch:Partial<Settings>)=>void;onClose:()=>void;sliderDesign?:SliderDesign}) {
  const [section,setSection]=useState<Section>(sliderDesign?'light':'paper');
  const tabs=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null);
  const choose=(id:Section)=>{setSection(id);if(scroll.current)scroll.current.scrollTop=0;};
  const paper=paperSkins[settings.paper],lineHeight=settings.fontSize*1.5;
  const paperBackground={
    backgroundColor:paper.color,
    backgroundImage:`${settings.paper==='lined'?`repeating-linear-gradient(transparent 0 ${lineHeight-1}px, #95a39e44 ${lineHeight-1}px ${lineHeight}px), `:''}url("${paper.url}")`,
    backgroundSize:settings.paper==='lined'?'auto, 320px':'320px',
    backgroundPosition:settings.paper==='lined'?'0 22px, center':'center',
  };
  return <aside className="settings-panel" role="dialog" aria-modal="true" aria-label="书写设置">
    <div className="panel-header"><div><h2 className="panel-title">书写设置</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭设置"><X size={19}/></button></div>
    <div className="studio-tabs" role="tablist" aria-label="设置分类" ref={tabs} onKeyDown={e=>{const at=sections.findIndex(s=>s.id===section);const next=e.key==='ArrowRight'?(at+1)%4:e.key==='ArrowLeft'?(at+3)%4:e.key==='Home'?0:e.key==='End'?3:-1;if(next<0)return;e.preventDefault();choose(sections[next].id);tabs.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();}}>{sections.map(s=><button key={s.id} id={`tab-${s.id}`} role="tab" aria-selected={section===s.id} aria-controls={`settings-${s.id}`} tabIndex={section===s.id?0:-1} onClick={()=>choose(s.id)}>{s.title}</button>)}</div>
    <div className="settings-scroll" ref={scroll}><div role="tabpanel" id={`settings-${section}`} aria-labelledby={`tab-${section}`}>
      {section==='paper'&&<section className="setting-section"><div className="paper-detail" style={{...paperBackground,color:paperInkColor(82)}}><h3>{paper.title}</h3><p>{paper.caption}</p></div><div className="paper-options">{papers.map(p=><button key={p.id} className={`paper-option ${p.id===settings.paper?'selected':''}`} onClick={()=>onUpdate({paper:p.id})} aria-pressed={p.id===settings.paper}><span className={`paper-swatch swatch-${p.id}`} style={{backgroundImage:`url("${p.url}")`,backgroundColor:p.color}}/><span>{p.title}</span>{p.id===settings.paper&&<Check className="paper-option-check" size={15}/>}</button>)}</div><div className="setting-row shape-setting"><span>纸页形态</span><div className="segmented"><button aria-pressed={!settings.curved} className={!settings.curved?'active':''} onClick={()=>onUpdate({curved:false})}>平面</button><button aria-pressed={settings.curved} className={settings.curved?'active':''} onClick={()=>onUpdate({curved:true})}>弯曲</button></div></div></section>}
      {section==='kit'&&<section className="setting-section"><div className="section-intro"><h3>{kits.find(k=>k.id===settings.kit)?.title}</h3><p>{kits.find(k=>k.id===settings.kit)?.caption}</p></div><KitGallery selected={settings.kit} onSelect={id=>{const kit=kits.find(k=>k.id===id)!;onUpdate({kit:id,rail:kit.rail,endcap:kit.endcap,decoration:kit.decoration});}}/>
      {settings.kit==='classic'&&<div className="enamel-settings"><span className="setting-sublabel">搪瓷颜色</span><div className="capsule-options">{capsules.map(c=><button key={c.id} className={c.id===settings.capsule?'selected':''} onClick={()=>onUpdate({capsule:c.id})} aria-label={`胶囊${c.title}`} aria-pressed={c.id===settings.capsule}><span className="enamel-swatch" style={{backgroundColor:c.color}}/><span>{c.title}</span></button>)}</div></div>}
      <div className="kit-combinations"><div className="setting-row"><span>滑轨材质</span><div className="segmented">{([{id:'steel',title:'精钢'},{id:'brass',title:'黄铜'},{id:'blackened',title:'黑钢'}] as const).map(r=><button key={r.id} className={settings.rail===r.id?'active':''} onClick={()=>onUpdate({rail:r.id})} aria-pressed={settings.rail===r.id}>{r.title}</button>)}</div></div><div className="setting-row"><span>滑轨端饰</span><SettingSelect label="滑轨端饰" value={settings.endcap} options={endcaps} onChange={endcap=>onUpdate({endcap})}/></div><div className="setting-row"><span>纸页装饰</span><SettingSelect label="纸页装饰" value={settings.decoration} options={decorations} onChange={decoration=>onUpdate({decoration})}/></div></div></section>}
      {section==='ink'&&<section className="setting-section">
        <div className="section-intro"><h3>字与墨迹</h3><p>选一套字，写下自己的节奏。</p></div>
        <div className="ink-specimen writing-font-specimen" aria-label="中英文字体预览" style={{...paperBackground,fontFamily:writingTypeface(settings),fontSize:settings.fontSize,color:paperInkColor(settings.ink),opacity:1}}><span>让文字落在纸上。</span><span>Words on paper. 012345</span></div>
        <div className="writing-font-controls">
          <div className="setting-row"><span>中文字体</span><SettingSelect label="中文字体" value={settings.chineseFont} options={chineseFonts} sample="字" onChange={chineseFont=>onUpdate({chineseFont})}/></div>
          <div className="setting-row"><span>英文字体</span><SettingSelect label="英文字体" value={settings.englishFont} options={englishFonts} sample="Aa" onChange={englishFont=>onUpdate({englishFont})}/></div>
        </div>
        <SettingRange title="墨色深浅" label="墨色深浅" min={45} max={100} value={settings.ink} output={`${settings.ink}%`} onChange={value=>onUpdate({ink:value})} design={sliderDesign}/><SettingRange title="字号" label="字号" min={15} max={25} value={settings.fontSize} output={`${settings.fontSize} px`} onChange={value=>onUpdate({fontSize:value})} design={sliderDesign}/><div className="setting-row"><span>删除方式</span><div className="segmented"><button className={settings.deletion==='erase'?'active':''} aria-pressed={settings.deletion==='erase'} onClick={()=>onUpdate({deletion:'erase'})}>擦除</button><button className={settings.deletion==='strike'?'active':''} aria-pressed={settings.deletion==='strike'} onClick={()=>onUpdate({deletion:'strike'})}>划除</button></div></div><div className="setting-row"><span className="with-icon"><Volume2 size={16}/>机械打字声</span><button className={`switch ${settings.sound?'on':''}`} role="switch" aria-checked={settings.sound} aria-label="机械打字声" onClick={()=>onUpdate({sound:!settings.sound})}><span/></button></div><div className="keyboard-shortcuts"><span>新建纸页<kbd>Ctrl / ⌘ N</kbd></span><span>导出文字<kbd>Ctrl / ⌘ S</kbd></span><span>关闭面板<kbd>Esc</kbd></span></div>
      </section>}
      {section==='light'&&<section className="setting-section"><div className="section-intro"><h3>昼与夜</h3><p>长按胶囊，也可以点亮这一页。</p></div><div className="setting-row light-mode"><span className="with-icon">{settings.night?<Moon size={18}/>:<Sun size={18}/>}夜间书写</span><button className={`switch ${settings.night?'on':''}`} role="switch" aria-checked={settings.night} aria-label="夜间书写" onClick={()=>onUpdate({night:!settings.night})}><span/></button></div><SettingRange title="灯光强度" label="灯光强度" min={20} max={200} value={settings.brightness} output={`${settings.brightness}%`} onChange={value=>onUpdate({brightness:value})} design={sliderDesign}/><SettingRange title="扩散角度" label="灯光扩散角度" min={50} max={160} value={settings.spread} output={`${settings.spread}°`} onChange={value=>onUpdate({spread:value})} design={sliderDesign}/><SettingRange title="冷暖" label="灯光冷暖" min={lampWarmthRange.min} max={lampWarmthRange.max} value={settings.warmth} output={`${lampTemperature(settings.warmth)} K`} onChange={value=>onUpdate({warmth:value})} design={sliderDesign}/><SettingRange title="照射范围" label="灯光照射范围" min={40} max={200} value={settings.beam} output={`${settings.beam}%`} onChange={value=>onUpdate({beam:value})} design={sliderDesign}/></section>}
    </div></div><footer className="settings-footer"><span>调整即时生效</span><button className="settings-done" onClick={onClose}>完成</button></footer>
  </aside>;
}
