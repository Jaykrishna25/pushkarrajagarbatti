import {useId, useMemo, useState} from 'react';
import {brand} from '../data/brand';
import {defaultVariant, findProduct, isAvailable, moods, products, stockLabel, type Product, type Variant} from '../data/products';
import {useReveals} from '../hooks/useReveals';
import {useShop} from '../hooks/useShop';
import {maxQtyFor} from '../lib/cart';
import {formatPaise} from '../lib/money';
import {ProductVisual} from './Art';
import {CloseButton, Drawer} from './Drawer';

/* ------------------------------------------------------------------ */
/* Collection                                                          */
/* ------------------------------------------------------------------ */

export function ProductCollection() {
  const ref = useReveals<HTMLElement>();
  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], []);
  const [filter, setFilter] = useState('All');
  const shown = filter === 'All' ? products : products.filter((p) => p.category === filter);

  return (
    <section ref={ref} id="shop" data-tone="light" aria-labelledby="shop-title" className="tone-light relative bg-ivory-2 px-4 py-24 text-char sm:px-6 md:px-[6vw] md:py-36">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div data-reveal>
          <p className="font-mono text-label text-saffron-deep uppercase">The Collection</p>
          <h2 id="shop-title" className="mt-4 font-display text-display font-medium">
            Choose your fragrance.
          </h2>
        </div>
        <div data-reveal role="group" aria-label="Filter by category" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className="shrink-0 rounded-full px-4 py-2.5 font-mono text-label uppercase ring-1 ring-char/20 transition-colors hover:ring-char/50 aria-pressed:bg-char aria-pressed:text-ivory aria-pressed:ring-char"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {brand.previewNotice && (
        <p data-reveal className="mt-8 flex items-start gap-3 rounded-[4px] bg-sand/35 px-4 py-3 text-[0.875rem] text-char/80 ring-1 ring-sand">
          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saffron" />
          {brand.previewNotice}
        </p>
      )}

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 md:mt-14 lg:grid-cols-4 lg:gap-6">
        {shown.map((p, i) => (
          <li key={p.id} data-reveal style={{transitionDelay: `${i * 90}ms`}}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function ProductCard({product}: {product: Product}) {
  const {add, openDetail} = useShop();
  const [variantId, setVariantId] = useState(() => defaultVariant(product).id);
  const variant = product.variants.find((v) => v.id === variantId) ?? defaultVariant(product);
  const available = isAvailable(variant);
  const titleId = useId();
  const m = moods[product.mood];

  return (
    <article aria-labelledby={titleId} className="group flex h-full flex-col overflow-hidden rounded-[6px] bg-ivory ring-1 ring-char/8 transition-shadow duration-500 hover:shadow-[0_30px_60px_-30px_rgba(36,25,19,0.35)]">
      <button type="button" onClick={() => openDetail(product.id)} className="relative block aspect-[4/5] overflow-hidden" style={{background: `radial-gradient(70% 60% at 50% 60%, ${m.glow}, transparent 75%), ${m.panel}`}} aria-label={`View details: ${product.name}`}>
        <span className="absolute inset-0 flex items-center justify-center p-8 transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] motion-reduce:transition-none">
          <ProductVisual product={product} className="h-full w-auto drop-shadow-[0_20px_25px_rgba(0,0,0,0.5)]" />
        </span>
        <span className="absolute top-3 left-3 rounded-full bg-ink/60 px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] text-ivory uppercase backdrop-blur">{product.category}</span>
        {product.sample && <span className="absolute top-3 right-3 rounded-full bg-ivory/85 px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] text-char uppercase">Sample</span>}
      </button>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 id={titleId} className="font-display text-[1.5rem] leading-tight font-medium">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[0.875rem] text-char/65">{product.description}</p>
        </div>

        <VariantPicker product={product} value={variant.id} onChange={setVariantId} compact />

        <div className="mt-auto flex items-end justify-between gap-3">
          <Price variant={variant} />
          <StockBadge variant={variant} />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={!available}
            onClick={() => add(product.id, variant.id)}
            className="rounded-full bg-char px-4 py-3 font-mono text-label text-ivory uppercase transition-colors hover:bg-saffron-deep disabled:bg-char/15 disabled:text-char/50"
          >
            {available ? 'Add to cart' : 'Unavailable'}
            <span className="sr-only">: {product.name}, {variant.label}</span>
          </button>
          <button type="button" onClick={() => openDetail(product.id)} className="rounded-full px-4 py-3 font-mono text-label uppercase ring-1 ring-char/25 transition-colors hover:bg-char hover:text-ivory">
            Details<span className="sr-only">: {product.name}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function VariantPicker({product, value, onChange, compact = false}: {product: Product; value: string; onChange: (id: string) => void; compact?: boolean}) {
  const name = useId();
  if (product.variants.length < 2) return <p className="font-mono text-label text-char/60 uppercase">{product.variants[0]?.label}</p>;
  return (
    <fieldset>
      <legend className={compact ? 'sr-only' : 'font-mono text-label text-char/60 uppercase'}>Pack</legend>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-3'}`}>
        {product.variants.map((v) => (
          <label key={v.id} className="relative cursor-pointer">
            <input type="radio" name={name} value={v.id} checked={value === v.id} onChange={() => onChange(v.id)} className="peer sr-only" />
            <span
              className={`block rounded-full px-3.5 py-2 text-[0.8125rem] ring-1 ring-char/20 transition-colors peer-checked:bg-char peer-checked:text-ivory peer-checked:ring-char peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-saffron-deep ${
                isAvailable(v) ? '' : 'text-char/45 line-through peer-checked:text-ivory/70'
              }`}
            >
              {v.label}
              {!isAvailable(v) && <span className="sr-only"> (out of stock)</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Price({variant, large = false}: {variant: Variant; large?: boolean}) {
  return (
    <p className="flex items-baseline gap-2">
      <span className={`font-display font-medium ${large ? 'text-[2.25rem]' : 'text-[1.625rem]'} leading-none`}>{formatPaise(variant.pricePaise)}</span>
      {variant.originalPricePaise && variant.originalPricePaise > variant.pricePaise && (
        <span className="text-[0.875rem] text-char/50 line-through">
          <span className="sr-only">Was </span>
          {formatPaise(variant.originalPricePaise)}
        </span>
      )}
    </p>
  );
}

function StockBadge({variant}: {variant: Variant}) {
  const tone = variant.stock === 'out_of_stock' ? 'text-char/50' : variant.stock === 'low_stock' ? 'text-saffron-deep' : 'text-olive';
  return (
    <span className={`flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.12em] uppercase ${tone}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {stockLabel[variant.stock]}
    </span>
  );
}

export function QtyStepper({value, min = 1, max, onChange, label}: {value: number; min?: number; max: number; onChange: (n: number) => void; label: string}) {
  return (
    <div className="inline-flex items-center rounded-full ring-1 ring-char/20" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity" className="flex size-10 items-center justify-center rounded-full disabled:opacity-30">
        −
      </button>
      <span className="w-8 text-center font-mono text-[0.875rem] tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity" className="flex size-10 items-center justify-center rounded-full disabled:opacity-30">
        +
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail drawer                                                       */
/* ------------------------------------------------------------------ */

export function ProductDetails() {
  const {detailId, openDetail} = useShop();
  const product = detailId ? findProduct(detailId) : undefined;
  return (
    <Drawer open={!!product} onClose={() => openDetail(null)} labelledBy="detail-title">
      {product && <DetailBody key={product.id} product={product} onClose={() => openDetail(null)} />}
    </Drawer>
  );
}

function DetailBody({product, onClose}: {product: Product; onClose: () => void}) {
  const {add} = useShop();
  const [variantId, setVariantId] = useState(() => defaultVariant(product).id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? defaultVariant(product);
  const max = maxQtyFor(variant);
  const available = max > 0;
  const m = moods[product.mood];

  const choose = (id: string) => {
    setVariantId(id);
    const v = product.variants.find((x) => x.id === id);
    if (v) setQty((q) => Math.max(1, Math.min(q, maxQtyFor(v) || 1)));
  };

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-ivory/90 px-5 py-2 backdrop-blur">
        <p className="font-mono text-label text-char/60 uppercase">{product.category}</p>
        <CloseButton onClick={onClose} label="Close product details" />
      </div>
      <div className="relative mx-5 aspect-square overflow-hidden rounded-[6px]" style={{background: `radial-gradient(70% 60% at 50% 60%, ${m.glow}, transparent 75%), ${m.panel}`}}>
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <ProductVisual product={product} className="h-full w-auto drop-shadow-[0_24px_30px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-6 p-5 pb-8">
        <div>
          <h2 id="detail-title" className="font-display text-[2.25rem] leading-[1.05] font-medium">
            {product.name}
          </h2>
          <p className="mt-3 text-body text-char/75">{product.description}</p>
        </div>
        <VariantPicker product={product} value={variant.id} onChange={choose} />
        <div className="flex items-center justify-between gap-4">
          <Price variant={variant} large />
          <StockBadge variant={variant} />
        </div>
        {product.sample && <p className="font-mono text-[0.625rem] tracking-[0.12em] text-saffron-deep uppercase">Sample product, price and stock — for preview only</p>}
        <div className="flex flex-wrap items-center gap-3">
          {available && <QtyStepper value={qty} max={max} onChange={(n) => setQty(Math.max(1, Math.min(n, max)))} label="Quantity" />}
          <button
            type="button"
            data-autofocus
            disabled={!available}
            onClick={() => {
              if (add(product.id, variant.id, qty)) onClose();
            }}
            className="flex-1 rounded-full bg-char px-6 py-3.5 font-mono text-label text-ivory uppercase transition-colors hover:bg-saffron-deep disabled:bg-char/15 disabled:text-char/50"
          >
            {available ? `Add to cart · ${formatPaise(variant.pricePaise * qty)}` : 'Out of stock'}
          </button>
        </div>
        {variant.maxQty && available && <p className="text-[0.8125rem] text-char/60">Limit {max} per order for this pack.</p>}
        {product.details && product.details.length > 0 && (
          <div className="border-t border-char/10 pt-5">
            <h3 className="font-mono text-label text-char/60 uppercase">Details</h3>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-char/75">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-saffron" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
