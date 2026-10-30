import {useEffect, useRef} from 'react';
import {story} from '../data/brand';
import {useReveals} from '../hooks/useReveals';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {easeOutCubic, isOnScreen, passProgress, range} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {LivingStill} from './LivingStill';
import {HERO_OVERLAP_VH} from './SmokeHero';

/**
 * Opens on the exact ivory the hero floods to, so the cut is invisible. The
 * framed still unmasks upward as it enters; copy reveals in sequence.
 */
export function BrandStory() {
  const ref = useReveals<HTMLElement>();
  const frameRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      if (frameRef.current) frameRef.current.style.clipPath = 'none';
      return;
    }
    return onFrame(() => {
      const el = frameRef.current;
      if (!el) return;
      const {p, rect, vh} = passProgress(el);
      if (!isOnScreen(rect, vh, 100)) return;
      const k = easeOutCubic(range(p, 0.05, 0.42));
      el.style.clipPath = `inset(${(1 - k) * 22}% ${(1 - k) * 8}% 0% ${(1 - k) * 8}% round 4px)`;
    });
  }, [reduced]);

  return (
    <section ref={ref} id="story" data-tone="light" aria-labelledby="story-title" style={reduced ? undefined : {marginTop: `-${HERO_OVERLAP_VH}svh`}}
      className="tone-light relative z-10 bg-ivory px-4 pt-20 pb-28 text-char sm:px-6 md:px-[6vw] md:pt-24 md:pb-44">
      <div className="grid items-center gap-14 md:grid-cols-[1.05fr_1fr] md:gap-[6vw]">
        <div ref={frameRef} className="relative" style={{clipPath: 'inset(22% 8% 0% 8% round 4px)'}}>
          <LivingStill mood="woody" className="aspect-[4/5] rounded-[4px] md:aspect-[5/6]" />
          <p className="absolute bottom-4 left-4 font-mono text-[0.625rem] tracking-[0.16em] text-ivory/60 uppercase">Illustration · concept pack</p>
        </div>

        <div>
          <p data-reveal className="font-mono text-label text-saffron-deep uppercase">
            {story.eyebrow}
          </p>
          <h2 id="story-title" data-reveal style={{transitionDelay: '80ms'}} className="mt-5 max-w-[14ch] font-display text-display font-medium">
            {story.heading}
          </h2>
          <div data-reveal style={{transitionDelay: '160ms'}} className="rule-gold mt-8 w-24" />
          {story.paragraphs.map((para, i) => (
            <p key={i} data-reveal style={{transitionDelay: `${240 + i * 110}ms`}} className="mt-6 max-w-[36rem] text-body text-char/80">
              {para}
            </p>
          ))}
          <p data-reveal style={{transitionDelay: '480ms'}} className="mt-10 font-display text-[clamp(1.6rem,2.4vw,2.25rem)] text-saffron-deep italic">
            “{story.pullQuote}”
          </p>
          {story.placeholder && (
            <p data-reveal className="mt-8 font-mono text-[0.625rem] tracking-[0.12em] text-char/45 uppercase">
              Placeholder copy — replace with the verified brand story
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
