import type {ReactNode} from 'react';
import {brand, trust} from '../data/brand';
import {moods, products} from '../data/products';
import {useReveals} from '../hooks/useReveals';

/**
 * Only what is actually known. Everything is derived from the catalogue
 * and brand config; anything not yet supplied says so instead of guessing.
 */
export function Trust() {
  const ref = useReveals<HTMLElement>();
  const packs = [...new Set(products.flatMap((p) => p.variants.map((v) => v.label)))];
  const shipping = brand.policies.find((p) => p.id === 'shipping');
  const returns = brand.policies.find((p) => p.id === 'returns');
  const anySample = products.some((p) => p.sample);

  return (
    <section ref={ref} id="trust" data-tone="light" aria-labelledby="trust-title" className="tone-light relative bg-ivory px-4 py-24 text-char sm:px-6 md:px-[6vw] md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_2fr] lg:gap-[5vw]">
        <div data-reveal>
          <p className="font-mono text-label text-saffron-deep uppercase">{trust.eyebrow}</p>
          <h2 id="trust-title" className="mt-4 max-w-[14ch] font-display text-display font-medium">
            {trust.heading}
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[6px] bg-char/10 ring-1 ring-char/10 sm:grid-cols-2">
          <Panel n="01" title="Fragrance moods" delay={0}>
            <ul className="flex flex-wrap gap-2">
              {[...new Set(products.map((p) => p.mood))].map((m) => (
                <li key={m} className="rounded-full bg-ivory-2 px-3 py-1.5 text-[0.8125rem]">
                  {moods[m].label}
                </li>
              ))}
            </ul>
            {anySample && <Pending>Final fragrance names come from the official catalogue.</Pending>}
          </Panel>

          <Panel n="02" title="Pack options" delay={90}>
            <ul className="space-y-1 text-[0.9375rem] text-char/75">
              {packs.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {anySample && <Pending>Pack sizes and contents to be confirmed from the catalogue.</Pending>}
          </Panel>

          <Panel n="03" title={trust.usage.title} delay={180}>
            <ol className="space-y-2 text-[0.9375rem] text-char/75">
              {trust.usage.points.map((pt, i) => (
                <li key={pt} className="flex gap-3">
                  <span className="font-mono text-label text-saffron-deep">{i + 1}</span>
                  {pt}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel n="04" title="Delivery & returns" delay={270}>
            <PolicyLine label="Shipping" body={shipping?.body ?? null} />
            <PolicyLine label="Returns" body={returns?.body ?? null} />
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({n, title, children, delay}: {n: string; title: string; children: ReactNode; delay: number}) {
  return (
    <div data-reveal style={{transitionDelay: `${delay}ms`}} className="flex flex-col gap-4 bg-ivory p-6 md:p-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-label text-saffron-deep">{n}</span>
        <h3 className="font-display text-title font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Pending({children}: {children: ReactNode}) {
  return <p className="mt-auto font-mono text-[0.625rem] tracking-[0.1em] text-char/45 uppercase">{children}</p>;
}

function PolicyLine({label, body}: {label: string; body: string | null}) {
  return (
    <div>
      <p className="font-mono text-label text-char/55 uppercase">{label}</p>
      <p className="mt-1 text-[0.9375rem] text-char/75">{body ? body.split('\n')[0] : 'Policy will be published here before online orders open.'}</p>
    </div>
  );
}
