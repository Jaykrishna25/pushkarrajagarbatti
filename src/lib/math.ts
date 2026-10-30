/** Pure animation maths. No DOM, no React. */

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where `v` sits between `a` and `b`, clamped to 0–1. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInQuad = (t: number) => t * t;

/** Rise in over [a,b], hold, fall out over [c,d]. Handy for timed captions. */
export const window4 = (v: number, a: number, b: number, c: number, d: number) =>
  easeOutCubic(range(v, a, b)) * (1 - range(v, c, d));

/**
 * Progress through a tall section whose child is `position: sticky`:
 * 0 when the section's top meets the viewport top, 1 as the child unpins.
 */
export function pinProgress(el: HTMLElement): {p: number; rect: DOMRect; vh: number} {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const span = Math.max(1, rect.height - vh);
  return {p: clamp(-rect.top / span), rect, vh};
}

/** 0 as the element's top enters the bottom of the viewport, 1 as its bottom leaves the top. */
export function passProgress(el: HTMLElement): {p: number; rect: DOMRect; vh: number} {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return {p: clamp((vh - rect.top) / (vh + rect.height)), rect, vh};
}

export const isOnScreen = (rect: DOMRect, vh: number, margin = 0) => rect.bottom > -margin && rect.top < vh + margin;
