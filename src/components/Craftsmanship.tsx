import {useEffect, useRef} from 'react';
import {craft} from '../data/brand';
import {useMedia, useReducedMotion} from '../hooks/useReducedMotion';
import {easeInOutCubic, lerp, pinProgress, range, window4} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {Smoke} from '../lib/smoke';
import {IncenseHolder, PackMockup} from './Art';

/**
 * Macro → full composition. The stage pins; the composition starts scaled
 * up around the ember (a close-up of the glowing tip) and pulls back to
 * reveal the holder, the pack and the sculpted ground, while three short
 * captions hand over to one another.
 *
 * The zoom is a single transform about the ember: we measure the ember's
 * untransformed position once per resize and solve for the translation that
 * keeps it on the focus point at every scale.
 */

const SECTION_VH_DESKTOP = 320;
const SECTION_VH_MOBILE = 230;
const START_SCALE = 4.2;

const BEATS: [number, number, number, number][] = [
  [0.0, 0.06, 0.26, 0.32],
  [0.36, 0.44, 0.58, 0.64],
  [0.68, 0.76, 1.1, 1.2],
];

export function Craftsmanship() {
  const reduced = useReducedMotion();
  const mobile = useMedia('(max-width: 767px)');
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const emberRef = useRef<SVGCircleElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef<HTMLDivElement[]>([]);
  const dotRefs = useRef<HTMLSpanElement[]>([]);
  const lightRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const smoke = new Smoke(canvasRef.current!, {strands: 3, motes: 50, wisps: 50, seed: 41});
    const group = groupRef.current!;
    const stage = stageRef.current!;
    let local = {x: 0, y: 0};
    let origin = {x: 0, y: 0};

    const measure = () => {
      const prev = group.style.transform;
      group.style.transform = 'none';
      const g = group.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const e = emberRef.current!.getBoundingClientRect();
      origin = {x: g.left - s.left, y: g.top - s.top};
      local = {x: e.left + e.width / 2 - g.left, y: e.top + e.height / 2 - g.top};
      group.style.transform = prev;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    document.fonts?.ready.then(measure);

    let lastP = -1;
    const off = onFrame((time) => {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (!root || !canvas) return;
      const {p: raw, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      const still = reducedRef.current;
      const p = still ? 1 : raw;

      if (Math.abs(p - lastP) > 0.00005) {
        lastP = p;
        const k = easeInOutCubic(range(p, 0.04, 0.82));
        const s = lerp(START_SCALE, 1, k);
        // Focus point: where the ember sits on screen at the start of the shot.
        const sw = stage.clientWidth;
        const sh = stage.clientHeight;
        const fx = sw * (mobile ? 0.5 : 0.6);
        const fy = sh * (mobile ? 0.56 : 0.5);
        const tx0 = fx - origin.x - local.x * START_SCALE;
        const ty0 = fy - origin.y - local.y * START_SCALE;
        group.style.transform = `translate3d(${lerp(tx0, 0, k)}px, ${lerp(ty0, 0, k)}px, 0) scale(${s})`;
        if (lightRef.current) lightRef.current.style.opacity = String(lerp(0.35, 1, k));

        BEATS.forEach(([a, b, c, d], i) => {
          const el = beatRefs.current[i];
          if (!el) return;
          const v = still ? 1 : window4(p, a, b, c, d);
          el.style.opacity = v.toFixed(3);
          el.style.transform = still ? '' : `translate3d(0, ${(1 - v) * 18}px, 0)`;
          el.style.visibility = v < 0.01 ? 'hidden' : 'visible';
          const dot = dotRefs.current[i];
          if (dot) dot.style.transform = `scaleX(${still ? 1 : range(p, a, c)})`;
        });
      }

      const e = emberRef.current!.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      smoke.draw(time, {
        source: {x: e.left + e.width / 2 - c.left, y: e.top + e.height / 2 - c.top},
        intensity: 1,
        reach: 0.95,
        lean: 50,
        motes: 0.8,
        still,
      });
    });

    return () => {
      off();
      ro.disconnect();
      smoke.destroy();
    };
  }, [mobile]);

  return (
    <section
      ref={rootRef}
      id="craft"
      data-tone="dark"
      data-scroll-offset="0"
      aria-labelledby="craft-title"
      className="relative bg-ink"
      style={{height: reduced ? 'auto' : `${mobile ? SECTION_VH_MOBILE : SECTION_VH_DESKTOP}svh`}}
    >
      <div ref={stageRef} className={`grain ${reduced ? 'relative min-h-screen-s' : 'sticky top-0 h-screen-s'} overflow-hidden`}>
        {/* Sculpted ground: layered sandstone forms */}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#120c09,#1e140e_55%,#2b1d14)]" />
        <div
          ref={lightRef}
          aria-hidden="true"
          className="absolute inset-0"
          style={{opacity: 0.35, background: 'radial-gradient(45% 55% at 62% 52%, rgba(232,180,110,0.42), rgba(168,90,42,0.14) 50%, transparent 75%)'}}
        />

        <div ref={groupRef} className="absolute inset-0 origin-top-left will-change-transform">
          <svg aria-hidden="true" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
            <defs>
              <linearGradient id="craft-sand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5a4029" />
                <stop offset="1" stopColor="#24180f" />
              </linearGradient>
              <linearGradient id="craft-sand-2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#3a2818" />
                <stop offset="0.6" stopColor="#6b4c30" />
                <stop offset="1" stopColor="#3a2818" />
              </linearGradient>
            </defs>
            <path d="M0 610 C 220 560 380 600 560 590 S 960 540 1200 580 V800 H0Z" fill="url(#craft-sand)" />
            <path d="M0 660 C 260 630 520 660 760 650 S 1080 620 1200 640 V800 H0Z" fill="url(#craft-sand-2)" opacity="0.9" />
            <path d="M0 660 C 260 630 520 660 760 650 S 1080 620 1200 640" fill="none" stroke="#c7a15a" strokeOpacity="0.25" />
          </svg>
          <div className="absolute bottom-[19%] left-1/2 flex h-[50%] -translate-x-1/2 items-end md:left-[60%] md:h-[58%]">
            <IncenseHolder ref={emberRef} className="relative z-10 -mr-[5%] h-[84%] w-auto" />
            <PackMockup mood="woody" className="h-full w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]" />
          </div>
        </div>

        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_55%_45%,transparent_50%,rgba(10,7,5,0.8))]" />

        {/* Captions */}
        <div className={`${reduced ? 'relative px-4 pt-28 pb-[52svh] sm:px-6 md:absolute md:inset-y-0 md:left-[6vw] md:w-[34vw] md:px-0 md:pb-0' : 'absolute inset-x-0 top-24 px-4 sm:px-6 md:inset-y-0 md:top-0 md:right-auto md:left-[6vw] md:w-[34vw] md:px-0'} flex flex-col md:justify-center`}>
          <p className="font-mono text-label text-gold uppercase">{craft.eyebrow}</p>
          <h2 id="craft-title" className="sr-only">
            {craft.beats.map((b) => b.title).join(' ')}
          </h2>
          <div className={`${reduced ? 'space-y-8' : 'relative'} mt-5 min-h-[11rem] md:min-h-[14rem]`}>
            {craft.beats.map((b, i) => (
              <div
                key={b.title}
                ref={(el) => {
                  if (el) beatRefs.current[i] = el;
                }}
                className={reduced ? '' : 'absolute inset-x-0 top-0'}
                style={reduced ? undefined : {opacity: 0}}
              >
                <p aria-hidden="true" className="font-display text-display font-medium text-ivory">
                  {b.title}
                </p>
                <p className="mt-4 max-w-[28rem] text-lead text-ivory/70">{b.body}</p>
              </div>
            ))}
          </div>
          {!reduced && (
            <div aria-hidden="true" className="mt-8 flex gap-2 max-md:hidden">
              {craft.beats.map((b, i) => (
                <span key={b.title} className="relative h-px w-14 overflow-hidden bg-ivory/15">
                  <span
                    ref={(el) => {
                      if (el) dotRefs.current[i] = el;
                    }}
                    className="absolute inset-0 origin-left bg-gold"
                    style={{transform: 'scaleX(0)'}}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
