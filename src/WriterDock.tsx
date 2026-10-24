import {Archive,ChevronsLeft,ChevronsRight,Download,Expand,FileImage,FileText,Plus,Printer,SlidersHorizontal} from 'lucide-react';
import type {RefObject} from 'react';
type Props={panel:'library'|'settings'|null;collapsed:boolean;onCollapse:()=>void;exportOpen:boolean;isExporting:boolean;exportRef:RefObject<HTMLDivElement|null>;onLibrary:()=>void;onNew:()=>void;onSettings:()=>void;onExport:()=>void;onText:()=>void;onImage:()=>void;onPrint:()=>void;onBackup:()=>void;onFocus:()=>void};
export default function WriterDock({panel,collapsed,onCollapse,exportOpen,isExporting,exportRef,onLibrary,onNew,onSettings,onExport,onText,onImage,onPrint,onBackup,onFocus}:Props){
 return <nav className={`writer-dock${collapsed?' is-collapsed':''}`} aria-label="书写工具">
 <div className="dock-actions" id="writer-tools" hidden={collapsed}>
  <button className="dock-button dock-new" onClick={onNew} aria-label="新建纸页"><Plus/><span>新纸页</span></button>
  <span className="dock-divider" aria-hidden="true"/>
  <button className={`dock-button ${panel==='library'?'active':''}`} onClick={onLibrary} aria-label="打开信盒" aria-expanded={panel==='library'}><Archive/><span>信盒</span></button>
  <button className={`dock-button ${panel==='settings'?'active':''}`} onClick={onSettings} aria-label="打开书写设置" aria-expanded={panel==='settings'}><SlidersHorizontal/><span>设置</span></button>
  <div className="export-wrapper" ref={exportRef}>
   <button className={`export-trigger ${exportOpen?'active':''}`} onClick={onExport} aria-label="带走这页" aria-expanded={exportOpen} aria-controls="paper-export"><Download/><span>导出</span></button>
   {exportOpen&&<section id="paper-export" className="export-menu" aria-label="导出纸页">
    <header className="export-heading"><h2>带走这一页</h2><p>给文字一个新的去处。</p></header>
    <button onClick={onText}><FileText/><span>纯文字<small>保留完整正文</small></span><em>TXT</em></button>
    <button onClick={onImage} disabled={isExporting}><FileImage/><span>{isExporting?'正在生成图片…':'纸页图片'}<small>留下纸张与墨迹</small></span><em>PNG</em></button>
    <button onClick={onPrint}><Printer/><span>打印或保存 PDF<small>一页可收藏的文字</small></span></button>
    <div className="menu-rule"/>
    <button onClick={onBackup}><Archive/><span>备份整个信盒<small>包含纸页与书写设置</small></span><em>JSON</em></button>
   </section>}
  </div>
  <button className="dock-button" onClick={onFocus} aria-label="进入专注模式"><Expand/><span>专注</span></button>
 </div>
 <button className="dock-collapse" onClick={onCollapse} aria-expanded={!collapsed} aria-controls="writer-tools" aria-label={collapsed?'展开书写侧栏':'收起书写侧栏'} title={collapsed?'展开书写侧栏':'收起书写侧栏'}>{collapsed?<ChevronsLeft size={18}/>:<ChevronsRight size={18}/>}</button>
 </nav>;
}
