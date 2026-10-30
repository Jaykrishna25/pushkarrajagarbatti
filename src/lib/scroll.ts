import Lenis from 'lenis';

/**
 * One requestAnimationFrame loop for the whole page. Lenis advances first,
 * then every scroll-driven component reads its own rect and writes styles
 * straight to the DOM through refs. Nothing here touches React state, so
 * scrolling never re-renders the tree.
 *
 * When the tab is hidden the browser stops rAF, which pauses everything.
 */

type Tick = (time: number) => void;

const subscribers = new Set<Tick>();
let lenis: Lenis | null = null;
let header = 72;
let locked = false;
let pending: (() => void) | null = null;

export function startScroll(reducedMotion: boolean): () => void {
  if (!reducedMotion) {
    lenis = new Lenis({lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.9});
  }

  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    subscribers.forEach((fn) => fn(time));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function onFrame(fn: Tick): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Pause page scrolling while a modal drawer is open. */
export function lockScroll(lock: boolean) {
  locked = lock;
  if (lenis) {
    if (lock) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = lock ? 'hidden' : '';
  if (!lock && pending) {
    const run = pending;
    pending = null;
    requestAnimationFrame(run);
  }
}

export function setHeaderOffset(px: number) {
  header = px;
}

/** Smooth-scrolls to `#id` (or the top for `#top`), or to an absolute y. */
export function scrollToTarget(target: string | number, opts: {immediate?: boolean} = {}) {
  // A menu or drawer is closing: scroll once the page is unlocked.
  if (locked) {
    pending = () => scrollToTarget(target, opts);
    return;
  }
  let y: number;
  if (typeof target === 'number') {
    y = target;
  } else if (target === '#top') {
    y = 0;
  } else {
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;
    // Sections may opt into a different landing offset (e.g. pinned stages land at their start).
    const offset = el.dataset.scrollOffset ? Number(el.dataset.scrollOffset) : header;
    y = el.getBoundingClientRect().top + window.scrollY - offset;
  }
  if (lenis) {
    lenis.scrollTo(y, {duration: opts.immediate ? 0 : 1.4, immediate: opts.immediate, force: true});
  } else {
    window.scrollTo({top: y});
  }
  if (typeof target === 'string') history.replaceState(null, '', target === '#top' ? location.pathname : target);
}
