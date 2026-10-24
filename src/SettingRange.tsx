import type { CSSProperties } from 'react';
import type { SliderDesign } from './controlDesigns';
import { defaultSliderDesign } from './controlDesigns';
import './setting-range.css';

export default function SettingRange({ title, label = title, value, min, max, output, onChange, design = defaultSliderDesign }: { title: string; label?: string; value: number; min: number; max: number; output: string; onChange: (value: number) => void; design?: SliderDesign }) {
  const progress = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return <label className={`range-label${design ? ` instrument-range range-${design}` : ''}`}>
    <span>{title}</span><output>{output}</output>
    <span className="range-instrument" style={{ '--range-progress': `${progress}%` } as CSSProperties}>
      <span className="range-scale" aria-hidden="true"/>
      <input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} aria-label={label}/>
    </span>
  </label>;
}
