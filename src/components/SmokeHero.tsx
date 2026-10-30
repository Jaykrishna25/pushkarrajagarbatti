import {useEffect, useRef} from 'react';
import {brand, hero} from '../data/brand';
import {useMedia, useReducedMotion} from '../hooks/useReducedMotion';
import {easeInOutCubic, easeOutCubic, lerp, pinProgress, range} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {Smoke} from '../lib/smoke';
import {ArchWall, IncenseHolder, PackMockup, Pillars} from './Art';

/**
 * THE SMOKE REVEAL — a pinned stage, one scroll range, many layers:
 *
 *   0.00–0.20  Atmosphere  Darkness. An ember, a thread of smoke, a haze of
 *                          smoke across the lens, motes catching light.
 *   0.14–0.50  Reveal      The haze lifts, light opens behind the arch, the
 *                          pack and holder rise into it; headline arrives.
 *   0.50–0.76  Fragrance   The product settles into focus; the smoke climbs
 *                          and leans around it; the message arrives.
 *   0.76–1.00  Transition  The camera pushes through the arch, pillars sweep
 *                          past, and the light floods to ivory — which is
 *                          exactly the colour the story section opens on.
 *
 * Far layers move least, near layers most. All writes are transform/opacity.
 */

const STAGE_VH_DESKTOP = 420;
const STAGE_VH_MOBILE = 300;
/** How far the story section slides up over the hero's last frame (svh). */
export const HERO_OVERLAP_VH = 50;

export function SmokeHero() {
  const reduced = useReducedMotion();
  const mobile = useMedia('(max-width: 767px)');
  const stageVh = reduced ? 100 : mobile ? STAGE_VH_MOBILE : STAGE_VH_DESKTOP;

  const rootRef = useRef<HTMLElement>(null);
  const r = {
    scene: useRef<HTMLDivElement>(null),
    wall: useRef<HTMLDivElement>(null),
    glow: useRef<HTMLDivElement>(null),
    dark: useRef<HTMLDivElement>(null),
    veil: useRef<HTMLDivElement>(null),
    product: useRef<HTMLDivElement>(null),
    pillars: useRef<HTMLDivElement>(null),
    intro: useRef<HTMLDivElement>(null),
    headline: useRef<HTMLDivElement>(null),
    message: useRef<HTMLParagraphElement>(null),
    flood: useRef<HTMLDivElement>(null),
    cue: useRef<HTMLDivElement>(null),
    canvas: useRef<HTMLCanvasElement>(null),
    ember: useRef<SVGCircleElement>(null),
  };
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const canvas = r.canvas.current!;
    const smoke = new Smoke(canvas, {strands: 4, motes: 80, wisps: 80, seed: 3});
    let lastP = -1;
    const st = (el: HTMLElement | null, transform: string, opacity?: number) => {
      if (!el) return;
      el.style.transform = transform;
      if (opacity !== undefined) el.style.opacity = opacity.toFixed(3);
    };

    const off = onFrame((time) => {
      const root = rootRef.current;
      if (!root) return;
      const still = reducedRef.current;
      const {p: raw, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      // Reduced motion: hold the composed frame, no pin.
      const p = still ? 0.56 : raw;
      // END: the flood must be complete before the story section (pulled up by
      // HERO_OVERLAP_VH) starts covering the stage, so the hand-over is seamless.
      const END = still ? 1 : 1 - HERO_OVERLAP_VH / Math.max(100, stageVh - 100) - 0.02;

      // Smoke follows the ember wherever layout put it.
      const ember = r.ember.current?.getBoundingClientRect();
      const crect = canvas.getBoundingClientRect();
      const source = ember ? {x: ember.left + ember.width / 2 - crect.left, y: ember.top + ember.height / 2 - crect.top} : null;
      const exit = easeInOutCubic(range(p, END - 0.2, END));
      smoke.draw(time, {
        source,
        intensity: lerp(0.7, 1, range(p, 0.1, 0.5)) * (1 - range(p, END - 0.12, END)),
        reach: mobile ? 0.62 : 0.85,
        lean: lerp(10, 70, range(p, 0.3, 0.8)) * (mobile ? 0.5 : 1),
        motes: (0.35 + 0.65 * range(p, 0.1, 0.45)) * (1 - range(p, END - 0.1, END)),
        still,
      });

      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const reveal = easeOutCubic(range(p, 0.12, 0.45));
      const focus = easeOutCubic(range(p, 0.45, END - 0.12));

      // Whole scene: a slow camera drift, then the push through the arch.
      st(r.scene.current, `translate3d(0, ${lerp(0, -1.5, p)}vh, 0) scale(${1 + exit * 0.32})`);

      // Far: the wall breathes in slightly as light arrives.
      st(r.wall.current, `translate3d(0, ${lerp(3, -2, p)}vh, 0) scale(${lerp(1.14, 1, reveal)})`, lerp(0.55, 1, reveal));
      st(r.glow.current, `scale(${lerp(0.6, 1.05, reveal) + focus * 0.08})`, reveal * (0.85 + focus * 0.15));

      // Darkness lifts; smoke haze rises off the lens.
      if (r.dark.current) r.dark.current.style.opacity = (1 - easeOutCubic(range(p, 0.12, 0.46)) * 0.96).toFixed(3);
      const lift = easeOutCubic(range(p, 0.1, 0.42));
      st(r.veil.current, `translate3d(0, ${-lift * 38}vh, 0) scale(${1 + lift * 0.35})`, (1 - lift) * 0.9);

      // Mid: the product rises into the light, then settles into focus.
      st(r.product.current, `translate3d(0, ${lerp(9, 0, reveal) - exit * 4}vh, 0) scale(${lerp(0.9, 1, reveal) + focus * 0.04})`, lerp(0.25, 1, reveal));

      // Near: pillars move fastest, then sweep out of frame.
      st(r.pillars.current, `translate3d(0, ${lerp(12, -4, p)}vh, 0) scale(${lerp(1.18, 1.05, reveal) + exit * 0.9})`, easeOutCubic(range(p, 0.18, 0.4)) * (1 - range(p, END - 0.06, END)));

      // Copy.
      const introOut = range(p, 0.08, 0.2);
      st(r.intro.current, `translate3d(0, ${-introOut * 6}vh, 0)`, 1 - introOut);
      if (r.cue.current) r.cue.current.style.opacity = (1 - range(p, 0.02, 0.1)).toFixed(3);
      const hIn = easeOutCubic(range(p, 0.26, 0.4));
      const out = range(p, END - 0.18, END - 0.1);
      st(r.headline.current, `translate3d(0, ${lerp(4, 0, hIn) - out * 3}vh, 0)`, hIn * (1 - out));
      const mIn = easeOutCubic(range(p, 0.44, 0.56));
      st(r.message.current, `translate3d(0, ${lerp(2.5, 0, mIn)}vh, 0)`, still ? 1 : mIn * (1 - out));

      // The light floods to ivory — the story section's background.
      if (r.flood.current) r.flood.current.style.opacity = easeInOutCubic(range(p, END - 0.12, END)).toFixed(3);
      root.dataset.tone = p > END - 0.03 ? 'light' : 'dark';
    });

    return () => {
      off();
      smoke.destroy();
    };
  }, [mobile, stageVh]);

  return (
    <section id="top" ref={rootRef} data-tone="dark" data-scroll-offset="0" aria-labelledby="hero-title" className="relative bg-ink" style={{height: `${stageVh}svh`}}>
      <div className="grain sticky top-0 h-screen-s overflow-hidden bg-ink">
        <div ref={r.scene} className="absolute inset-0 will-change-transform">
          {/* Far: architecture and the light beyond it */}
          <div ref={r.wall} className="absolute inset-[-4%] will-change-transform" style={{opacity: 0.55}}>
            <ArchWall className="size-full" />
          </div>
          <div
            ref={r.glow}
            aria-hidden="true"
            className="absolute top-[10%] left-1/2 aspect-square w-[min(120vw,120vh)] -translate-x-1/2 rounded-full will-change-transform lg:left-[62%] lg:w-[min(80vw,110vh)]"
            style={{opacity: 0, background: 'radial-gradient(closest-side, rgba(255,214,150,0.55), rgba(199,140,70,0.22) 45%, rgba(120,60,20,0) 75%)'}}
          />

          {/* Mid: pack, holder and plinth */}
          <div
            ref={r.product}
            className="absolute bottom-[5svh] left-1/2 flex h-[46svh] -translate-x-1/2 items-end will-change-transform lg:right-[9vw] lg:bottom-[6vh] lg:left-auto lg:h-[64vh] lg:translate-x-0"
            style={{opacity: 0.25}}
          >
            <div aria-hidden="true" className="absolute -inset-x-[18%] -bottom-[3%] h-[9%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(215,193,160,0.38),rgba(215,193,160,0.08)_70%,transparent)]" />
            <IncenseHolder ref={r.ember} className="relative z-10 -mr-[6%] h-[80%] w-auto" />
            <PackMockup mood="devotional" className="relative h-full w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]" />
          </div>

          {/* Darkness over everything behind the smoke */}
          <div ref={r.dark} aria-hidden="true" className="absolute inset-0 bg-ink" />

          {/* Near: pillars */}
          <div ref={r.pillars} className="absolute inset-[-6%] will-change-transform" style={{opacity: 0}}>
            <Pillars className="size-full" />
          </div>
        </div>

        {/* Smoke and motes */}
        <canvas ref={r.canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

        {/* Haze on the lens */}
        <div ref={r.veil} aria-hidden="true" className="pointer-events-none absolute inset-[-10%] will-change-transform" style={{opacity: 0.9}}>
          <div className="absolute top-[18%] left-[8%] h-[60%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(233,225,212,0.16),transparent)] blur-2xl" />
          <div className="absolute top-[34%] right-[6%] h-[55%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgba(199,161,90,0.12),transparent)] blur-2xl" />
          <div className="absolute bottom-[4%] left-[26%] h-[45%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(233,225,212,0.12),transparent)] blur-2xl" />
        </div>

        {/* Vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(10,7,5,0.75))]" />

        {/* Phase 1 copy */}
        <div ref={r.intro} className="pointer-events-none absolute inset-x-0 top-[22%] px-6 text-center md:top-[30%]" style={reduced ? {opacity: 0} : undefined}>
          <p className="font-mono text-label text-gold/90 uppercase">{hero.eyebrow}</p>
          <p className="mx-auto mt-5 max-w-[16ch] font-display text-[clamp(2rem,4.6vw,4rem)] leading-[1.05] font-normal text-ivory italic">{hero.intro}</p>
        </div>

        {/* Phase 2–3 copy */}
        <div className="pointer-events-none absolute inset-x-0 top-[13svh] px-5 text-center sm:px-8 lg:top-1/2 lg:right-auto lg:left-[6vw] lg:w-[44vw] lg:-translate-y-1/2 lg:px-0 lg:text-left">
          <div ref={r.headline} style={{opacity: reduced ? 1 : 0}}>
            <p className="font-mono text-label text-gold uppercase">{brand.name}</p>
            <h1 id="hero-title" className="mt-4 font-display text-hero font-medium text-ivory [text-shadow:0_6px_40px_rgba(0,0,0,0.6)] max-md:text-[clamp(2.4rem,11vw,3.4rem)] md:max-lg:mx-auto md:max-lg:max-w-[14ch]">
              {hero.headline}
            </h1>
          </div>
          <p ref={r.message} className="mx-auto mt-6 max-w-[34ch] text-lead text-ivory/80 max-md:hidden lg:mx-0" style={{opacity: reduced ? 1 : 0}}>
            {hero.message}
          </p>
        </div>

        {/* Scroll cue */}
        {!reduced && (
          <div ref={r.cue} className="pointer-events-none absolute inset-x-0 bottom-[6svh] flex flex-col items-center gap-3 text-center">
            <span className="font-mono text-label text-ivory/70 uppercase">{hero.prompt}</span>
            <span aria-hidden="true" className="relative block h-10 w-px overflow-hidden bg-ivory/15">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.2s_ease-in-out_infinite] bg-gold" />
            </span>
          </div>
        )}

        {/* Light floods to ivory */}
        <div ref={r.flood} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_55%,#fbf6ec,#f6f0e6_60%)]" style={{opacity: 0}} />
      </div>
    </section>
  );
}
