import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './setting-select.css';

type Choice<T extends string> = { id: T; title: string; family?: string };

/** A select-only combobox. Focus stays in the dialog; the menu escapes scroll clipping. */
export default function SettingSelect<T extends string>({ label, value, options, onChange, sample }: {
  label: string; value: T; options: readonly Choice<T>[]; onChange: (value: T) => void; sample?: string;
}) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const selected = Math.max(0, options.findIndex(option => option.id === value));
  const [open, setOpen] = useState(false), [active, setActive] = useState(selected);
  const search = useRef({ text: '', time: 0 });
  const show = () => { setActive(selected); setOpen(true); };
  const close = () => setOpen(false);
  const choose = (index: number) => { onChange(options[index].id); close(); trigger.current?.focus({ preventScroll: true }); };

  useLayoutEffect(() => {
    if (!open || !menu.current || !trigger.current) return;
    const popup = menu.current;
    const position = () => {
      if (!trigger.current) return;
      const anchor = trigger.current.getBoundingClientRect(), gutter = 12, gap = 7;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const menuWidth = Math.min(Math.max(anchor.width, sample ? 254 : 218), width - gutter * 2);
      const below = top + height - anchor.bottom - gutter - gap, above = anchor.top - top - gutter - gap;
      const desired = options.length * 42 + 14, upward = below < desired && above > below;
      const available = Math.max(0, upward ? above : below);
      popup.style.width = `${menuWidth}px`;
      popup.style.maxHeight = `${available}px`;
      popup.style.left = `${Math.max(left + gutter, Math.min(anchor.right - menuWidth, left + width - menuWidth - gutter))}px`;
      const menuHeight = popup.getBoundingClientRect().height || Math.min(desired, available);
      popup.style.top = `${upward ? anchor.top - gap - menuHeight : anchor.bottom + gap}px`;
      popup.dataset.direction = upward ? 'up' : 'down';
    };
    position();
    popup.showPopover();
    position();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    // Scrolling the options is allowed; moving the underlying panel closes its menu.
    const scroll = (event: Event) => { if (!popup.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      popup.hidePopover();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [open, options.length, sample]);

  useLayoutEffect(() => {
    const popup = menu.current, option = popup?.children[active] as HTMLElement | undefined;
    if (!open || !popup || !option) return;
    // scrollIntoView also moves the underlying settings panel, even in the top layer.
    // Keep keyboard navigation confined to the options' own scroll viewport.
    const top = option.offsetTop, bottom = top + option.offsetHeight;
    if (top < popup.scrollTop + 6) popup.scrollTop = Math.max(0, top - 6);
    else if (bottom > popup.scrollTop + popup.clientHeight - 6) popup.scrollTop = bottom - popup.clientHeight + 6;
  }, [open, active]);

  return <div ref={root} className="setting-select" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  }}>
    <button ref={trigger} type="button" className="setting-select-trigger" role="combobox" aria-label={label}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open ? `${id}-${active}` : undefined}
      onClick={() => open ? close() : show()} onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key === 'Tab') { close(); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (event.altKey && event.key === 'ArrowUp') { close(); return; }
          if (!open) { show(); if (event.key === 'Home') setActive(0); if (event.key === 'End') setActive(options.length - 1); }
          else setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open) choose(active); else show(); return; }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now(), key = event.key.toLocaleLowerCase();
          search.current.text = now - search.current.time > 600 ? key : search.current.text + key;
          search.current.time = now;
          const query = [...search.current.text].every(char => char === key) ? key : search.current.text;
          const start = open ? active : selected;
          const match = options.map((_, index) => (start + index + 1) % options.length).find(index => options[index].title.toLocaleLowerCase().startsWith(query));
          if (match !== undefined) { event.preventDefault(); if (open) setActive(match); else onChange(options[match].id); }
        }
      }}>
      <span>{options[selected]?.title}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    <div ref={menu} id={id} className="setting-select-menu" role="listbox" aria-label={label} popover="auto"
      onToggle={event => {
        // Toggle events are queued; a previous dismissal may arrive after reopening.
        if ((event.nativeEvent as ToggleEvent).newState === 'closed' && !event.currentTarget.matches(':popover-open')) close();
      }}
      onPointerDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={option.id} id={`${id}-${index}`} role="option" aria-selected={value === option.id}
        className={`setting-select-option ${index === active ? 'is-active' : ''}`} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
        <span className="setting-select-title">{option.title}</span>
        {sample && <span className="setting-select-sample" style={{ fontFamily: option.family }} aria-hidden="true">{sample}</span>}
        <span className="setting-select-check" aria-hidden="true">{value === option.id && <Check size={14}/>}</span>
      </div>)}
    </div>
  </div>;
}
