import {useEffect, useRef, useState} from 'react';
import {brand, journey} from '../data/brand';
import {defaultVariant, isAvailable, moods, products, type Mood, type Product} from '../data/products';
import {useMedia, useReducedMotion} from '../hooks/useReducedMotion';
import {useShop} from '../hooks/useShop';
import {clamp, pinProgress} from '../lib/math';
import {formatPaise} from '../lib/money';
import {onFrame, scrollToTarget} from '../lib/scroll';
import {archPath, ProductVisual} from './Art';

/**
 * The collection as a sequence of lit panels, one mood each.
 *
 * Desktop (≥1024px, motion allowed): the section pins and the panels slide
 * sideways with vertical scroll. Everywhere else it is a native horizontal
 * scroller with snap points — touch, trackpad and shift-wheel all work.
 * Both modes have previous/next buttons, and focusing a control inside a
 * panel brings that panel into view, so keyboard users never get lost.
 */
export function FragranceJourney() {
  const reduced = useReducedMotion();
  const wide = useMedia('(min-width: 1024px)');
  const pinned = wide && !reduced;

  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const panelRefs = useRef<HTMLLIElement[]>([]);
  const visualRefs = useRef<HTMLDivElement[]>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  const travelRef = useRef(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  // Pinned mode: section height = one screen + the horizontal travel.
  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    if (!pinned) {
      root.style.height = '';
      track.style.transform = '';
      return;
    }
    const measure = () => {
      const vw = window.innerWidth;
      const last = panelRefs.current[panelRefs.current.length - 1];
      // Travel until the last panel is centred.
      const travel = last ? Math.max(0, last.offsetLeft + last.offsetWidth / 2 - vw / 2) : 0;
      travelRef.current = travel;
      root.style.height = `${window.innerHeight + travel * 0.95}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pinned]);

  useEffect(() => {
    let lastKey = '';
    return onFrame(() => {
      const root = rootRef.current;
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!root || !track || !viewport) return;
      const {p, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      const vw = window.innerWidth;

      let k: number;
      if (pinned) {
        const x = p * travelRef.current;
        track.style.transform = `translate3d(${-x}px, 0, 0)`;
        k = p;
      } else {
        const max = viewport.scrollWidth - viewport.clientWidth;
        k = max > 0 ? viewport.scrollLeft / max : 0;
      }
      const key = `${k.toFixed(4)}|${vw}`;
      if (key === lastKey) return;
      lastKey = key;

      let nearest = 0;
      let best = Infinity;
      panelRefs.current.forEach((panel, i) => {
        const r = panel.getBoundingClientRect();
        const off = (r.left + r.width / 2 - vw / 2) / vw;
        if (Math.abs(off) < best) {
          best = Math.abs(off);
          nearest = i;
        }
        if (reduced) return;
        const vis = visualRefs.current[i];
        if (vis) vis.style.transform = `translate3d(${off * -90}px, 0, 0) rotate(${off * -4}deg)`;
        panel.style.opacity = String(1 - clamp(Math.abs(off) * 0.9) * 0.45);
      });
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0.02, k)})`;
      if (nearest !== indexRef.current) {
        indexRef.current = nearest;
        setIndex(nearest);
      }
    });
  }, [pinned, reduced]);

  const goToPanel = (i: number, immediate = false) => {
    const target = clamp(i, 0, products.length - 1);
    const panel = panelRefs.current[target];
    const root = rootRef.current;
    if (!panel || !root) return;
    if (pinned) {
      const travel = travelRef.current;
      const x = clamp(panel.offsetLeft + panel.offsetWidth / 2 - window.innerWidth / 2, 0, travel);
      const span = root.offsetHeight - window.innerHeight;
      const top = root.getBoundingClientRect().top + window.scrollY;
      scrollToTarget(top + (travel > 0 ? (x / travel) * span : 0), {immediate});
    } else {
      const vp = viewportRef.current!;
      vp.scrollTo({left: panel.offsetLeft - (vp.clientWidth - panel.offsetWidth) / 2, behavior: reduced || immediate ? 'auto' : 'smooth'});
    }
  };

  return (
    <section
      ref={rootRef}
      id="fragrances"
      data-tone="dark"
      aria-labelledby="journey-title"
      aria-roledescription="carousel"
      className="relative bg-ink text-ivory"
    >
      <div className={`${pinned ? 'sticky top-0 h-screen-s' : ''} flex flex-col overflow-hidden pt-24 pb-10 md:pt-28`}>
        <div className="flex flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between md:px-[6vw]">
          <div>
            <p className="font-mono text-label text-gold uppercase">{journey.eyebrow}</p>
            <h2 id="journey-title" className="mt-4 font-display text-display font-medium">
              {journey.heading}
            </h2>
            <p className="mt-4 max-w-[34rem] text-body text-ivory/65">{journey.body}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-label text-ivory/60 tabular-nums" aria-live="polite">
              <span className="text-ivory">{String(index + 1).padStart(2, '0')}</span> / {String(products.length).padStart(2, '0')}
              <span className="sr-only"> — {moods[products[index]!.mood].label}</span>
            </span>
            <span aria-hidden="true" className="relative hidden h-px w-28 bg-ivory/15 sm:block">
              <span ref={barRef} className="absolute inset-0 origin-left bg-gold" style={{transform: 'scaleX(0.02)'}} />
            </span>
            <div className="flex gap-2">
              <ArrowButton dir="prev" disabled={index === 0} onClick={() => goToPanel(index - 1)} />
              <ArrowButton dir="next" disabled={index === products.length - 1} onClick={() => goToPanel(index + 1)} />
            </div>
          </div>
        </div>

        <div
          ref={viewportRef}
          className={`no-scrollbar mt-8 min-h-0 flex-1 md:mt-10 ${pinned ? '' : 'snap-x snap-mandatory overflow-x-auto overscroll-x-contain'}`}
        >
          <ol ref={trackRef} className="flex h-full gap-4 px-4 will-change-transform sm:px-6 md:gap-6 md:px-[6vw]">
            {products.map((product, i) => (
              <li
                key={product.id}
                ref={(el) => {
                  if (el) panelRefs.current[i] = el;
                }}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${products.length}: ${moods[product.mood].label}`}
                className="w-[86vw] shrink-0 snap-center sm:w-[70vw] lg:w-[min(74vw,70rem)]"
                onFocusCapture={() => {
                  if (indexRef.current !== i) goToPanel(i, true);
                }}
              >
                <Panel product={product} visualRef={(el) => {
                    if (el) visualRefs.current[i] = el;
                  }} />
              </li>
            ))}
            <li aria-hidden="true" className="w-px shrink-0" />
          </ol>
        </div>
      </div>
    </section>
  );
}

function Panel({product, visualRef}: {product: Product; visualRef: (el: HTMLDivElement | null) => void}) {
  const {add, openDetail} = useShop();
  const m = moods[product.mood];
  const v = defaultVariant(product);
  const available = isAvailable(v);
  return (
    <article className="grain relative grid h-full min-h-[34rem] overflow-hidden rounded-[6px] lg:min-h-0 lg:grid-cols-[1.1fr_1fr]" style={{background: m.panel}}>
      {/* Visual */}
      <div className="relative min-h-[17rem] overflow-hidden lg:min-h-0">
        <div aria-hidden="true" className="absolute inset-0" style={{background: `radial-gradient(60% 65% at 50% 58%, ${m.glow}, transparent 75%)`}} />
        <MoodBackdrop mood={product.mood} />
        <div ref={visualRef} className="absolute inset-0 flex items-center justify-center p-6 will-change-transform lg:p-10">
          <ProductVisual product={product} className="h-[86%] max-h-[30rem] w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]" />
        </div>
      </div>

      {/* Copy */}
      <div className="relative flex flex-col justify-end gap-5 p-6 sm:p-8 lg:p-12">
        <p className="font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.9] font-normal italic" style={{color: m.accent}}>
          {m.label}
        </p>
        <div>
          <h3 className="font-display text-title font-medium text-ivory">{product.name}</h3>
          <p className="mt-2 max-w-[30rem] text-body text-ivory/65">{product.description}</p>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-ivory/12 pt-5">
          <span className="font-mono text-label text-ivory/60 uppercase">{v.label}</span>
          <span className="font-display text-[1.75rem] text-ivory">{formatPaise(v.pricePaise)}</span>
          {product.sample && brand.previewNotice && <span className="font-mono text-[0.625rem] tracking-[0.14em] text-gold/80 uppercase">Sample price</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!available}
            onClick={() => add(product.id, v.id)}
            className="rounded-full bg-gold px-6 py-3.5 font-mono text-label text-ink uppercase transition-colors hover:bg-gold-soft disabled:bg-ivory/15 disabled:text-ivory/50"
          >
            {available ? 'Add to cart' : 'Out of stock'}
          </button>
          <button type="button" onClick={() => openDetail(product.id)} className="rounded-full px-6 py-3.5 font-mono text-label text-ivory uppercase ring-1 ring-ivory/30 transition-colors hover:bg-ivory hover:text-ink">
            View details<span className="sr-only">: {product.name}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ArrowButton({dir, disabled, onClick}: {dir: 'prev' | 'next'; disabled: boolean; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous fragrance' : 'Next fragrance'}
      className="flex size-11 items-center justify-center rounded-full ring-1 ring-ivory/25 transition-colors hover:bg-ivory hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ivory"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-4 ${dir === 'prev' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

/** Large faint linework that gives each mood its own texture. */
function MoodBackdrop({mood}: {mood: Mood}) {
  const c = moods[mood].accent;
  const common = {className: 'absolute inset-0 size-full', 'aria-hidden': true as const, preserveAspectRatio: 'xMidYMid slice', viewBox: '0 0 600 600'};
  switch (mood) {
    case 'floral':
      return (
        <svg {...common} fill="none" stroke={c} strokeOpacity="0.16">
          {Array.from({length: 14}, (_, i) => {
            const x = (i * 157) % 600;
            const y = (i * 241) % 600;
            return <ellipse key={i} cx={x} cy={y} rx={16 + (i % 4) * 6} ry={40 + (i % 3) * 10} transform={`rotate(${i * 37} ${x} ${y})`} />;
          })}
        </svg>
      );
    case 'woody':
      return (
        <svg {...common} fill="none" stroke={c} strokeOpacity="0.13">
          {Array.from({length: 22}, (_, i) => (
            <ellipse key={i} cx="140" cy="520" rx={30 + i * 26} ry={18 + i * 20} transform={`rotate(-14 140 520)`} />
          ))}
        </svg>
      );
    case 'devotional':
      return (
        <svg {...common} fill="none" stroke={c} strokeOpacity="0.16">
          {[130, 170, 210, 250].map((rr) => (
            <path key={rr} d={archPath(300, 330, rr, 9, 640)} />
          ))}
        </svg>
      );
    case 'fresh':
      return (
        <svg {...common} fill="none" stroke={c} strokeOpacity="0.15">
          {Array.from({length: 9}, (_, i) => (
            <path key={i} d={`M${-40 + i * 80} 640 C ${20 + i * 80} 420, ${-30 + i * 80} 260, ${60 + i * 80} 0`} />
          ))}
        </svg>
      );
  }
}
