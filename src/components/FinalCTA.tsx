import {closing} from '../data/brand';
import {useReveals} from '../hooks/useReveals';
import {goTo} from './Header';
import {LivingStill} from './LivingStill';

/** The hero's darkness and smoke, bookended — with a way straight back to the shop. */
export function FinalCTA() {
  const ref = useReveals<HTMLElement>();
  return (
    <section ref={ref} id="closing" data-tone="dark" aria-labelledby="closing-title" className="relative overflow-hidden bg-ink">
      <LivingStill mood="floral" composition="holder-pack" light="rgba(255,196,120,0.55)" groupClassName="bottom-[9%] h-[38%] md:h-[44%]" className="min-h-[100svh]">
        <div className="absolute inset-x-0 top-0 flex flex-col items-center px-5 pt-[14svh] text-center">
          <p data-reveal className="font-mono text-label text-gold uppercase">
            Pushkar Raj Agarbatti
          </p>
          <h2 id="closing-title" data-reveal style={{transitionDelay: '100ms'}} className="mt-5 max-w-[14ch] font-display text-display font-medium text-ivory [text-shadow:0_6px_40px_rgba(0,0,0,0.6)]">
            {closing.heading}
          </h2>
          <p data-reveal style={{transitionDelay: '200ms'}} className="mt-5 max-w-[34ch] text-lead text-ivory/75">
            {closing.body}
          </p>
          <a
            data-reveal
            style={{transitionDelay: '300ms'}}
            href="#shop"
            onClick={(e) => goTo(e)}
            className="mt-9 rounded-full bg-gold px-8 py-4 font-mono text-label text-ink uppercase transition-colors hover:bg-gold-soft"
          >
            {closing.cta}
          </a>
        </div>
      </LivingStill>
    </section>
  );
}
