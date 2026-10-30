import {useEffect, useRef, useState, type MouseEvent} from 'react';
import {brand, nav} from '../data/brand';
import {useShop} from '../hooks/useShop';
import {lockScroll, onFrame, scrollToTarget} from '../lib/scroll';
import {Logo} from './Art';

/** Intercept in-page links so they go through Lenis. */
export function goTo(e: MouseEvent<HTMLAnchorElement>, then?: () => void) {
  const hash = e.currentTarget.getAttribute('href');
  if (!hash?.startsWith('#')) return;
  e.preventDefault();
  then?.();
  scrollToTarget(hash);
}

/**
 * Transparent over the hero; once the hero is behind us it takes on the
 * tone of whatever section sits under it (`data-tone` on each section) —
 * ivory glass over light sections, ink glass over dark ones. The tone is
 * written to a data attribute from the rAF loop, never through state.
 */
export function Header() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const {count, setCartOpen} = useShop();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let last = '';
    return onFrame(() => {
      const el = ref.current;
      if (!el) return;
      const y = el.offsetHeight / 2;
      let tone = 'dark';
      let mode = 'hero';
      const sections = document.querySelectorAll<HTMLElement>('main [data-tone], footer[data-tone]');
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) {
          tone = s.dataset.tone ?? 'dark';
          mode = s.id === 'top' && tone === 'dark' ? 'hero' : 'solid';
          break;
        }
      }
      const key = `${tone}/${mode}`;
      if (key !== last) {
        last = key;
        el.dataset.tone = tone;
        el.dataset.mode = mode;
      }
    });
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      ref={ref}
      data-tone="dark"
      data-mode="hero"
      className="group/h fixed inset-x-0 top-0 z-50 text-ivory transition-[background-color,color,box-shadow,backdrop-filter] duration-500 data-[mode=solid]:backdrop-blur-xl data-[mode=solid]:data-[tone=dark]:bg-ink/75 data-[mode=solid]:data-[tone=light]:bg-ivory/85 data-[mode=solid]:data-[tone=light]:text-char data-[mode=solid]:data-[tone=light]:shadow-[0_1px_0_rgba(36,25,19,0.08)]"
    >
      <a href="#main" className="sr-only rounded bg-gold px-4 py-2 text-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3">
        Skip to content
      </a>
      <div className="flex h-16 items-center justify-between gap-6 px-4 sm:px-6 md:h-[4.5rem] md:px-[4vw]">
        <a href="#top" onClick={(e) => goTo(e)} aria-label={`${brand.name} — home`} className="shrink-0">
          <Logo tone="light" className="group-data-[mode=solid]/h:group-data-[tone=light]/h:[&_svg]:text-saffron-deep" />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a key={item.href} href={item.href} onClick={(e) => goTo(e)} className="font-mono text-label uppercase opacity-75 transition-opacity hover:opacity-100">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex size-11 items-center justify-center rounded-full transition-colors hover:bg-current/10"
            aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
            {count > 0 && (
              <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 font-mono text-[0.625rem] font-medium text-ink tabular-nums">
                {count}
              </span>
            )}
          </button>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="relative z-10 flex size-11 items-center justify-center lg:hidden"
          >
            <span aria-hidden="true" className="relative block h-3 w-6">
              <span className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-300 ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
              <span className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-300 ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      <div
        ref={menuRef}
        id="mobile-menu"
        inert={!open}
        className={`fixed inset-0 -z-10 flex flex-col justify-between bg-ink px-6 pt-28 pb-10 text-ivory transition-opacity duration-500 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {nav.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => goTo(e, () => setOpen(false))}
              className="flex items-baseline gap-4 border-b border-ivory/10 py-3.5 font-display text-[2rem] leading-none"
            >
              <span className="font-mono text-label text-gold">0{i + 1}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <p className="font-mono text-label text-ivory/50 uppercase">{brand.name}</p>
      </div>
    </header>
  );
}
