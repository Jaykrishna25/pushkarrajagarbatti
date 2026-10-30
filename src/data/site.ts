import {useSyncExternalStore} from 'react';
import {isLive, rowToProduct, supabaseAnonKey, supabaseUrl, type ProductRow, type SiteSettings, type VariantRow} from '../lib/db';
import {DEMO_KEY, readDemo} from '../lib/demoStore';
import {brand, hero, story} from './brand';
import {getProducts, sampleProducts, setProducts, type Product} from './products';

/**
 * Where the storefront's catalogue and editable settings come from:
 *
 *   live    VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set → read from the
 *           database the owner manages in /admin.
 *   demo    not connected, but the admin demo has been used in this browser
 *           → read that browser-only demo data.
 *   sample  neither → the built-in samples.
 *
 * Components read it with useSiteData(); App subscribes, so brand text
 * changes re-render the whole tree.
 */

export type SiteState = {products: Product[]; ready: boolean; source: 'live' | 'demo' | 'sample'; error: string | null; shipping: {feePaise: number; freeOverPaise: number | null}; version: number};

const defaults = {
  previewNotice: brand.previewNotice,
  tagline: brand.tagline,
  description: brand.description,
  story: [...story.paragraphs],
  pullQuote: story.pullQuote,
};

let state: SiteState = {
  products: isLive ? [] : getProducts(),
  ready: !isLive,
  source: isLive ? 'live' : 'sample',
  error: null,
  shipping: {feePaise: 0, freeOverPaise: null},
  version: 0,
};
const listeners = new Set<() => void>();
const emit = (next: Partial<SiteState>) => {
  state = {...state, ...next, version: state.version + 1};
  setProducts(state.products);
  listeners.forEach((l) => l());
};

export function useSiteData(): SiteState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

/** Copy owner-edited settings onto the brand config the components read. */
function applySettings(s: SiteSettings, live: boolean) {
  brand.tagline = s.tagline?.trim() || defaults.tagline;
  hero.headline = brand.tagline;
  brand.description = s.description?.trim() || defaults.description;
  brand.legalName = s.legalName?.trim() || null;
  brand.previewNotice = s.previewNotice !== undefined ? s.previewNotice || null : live ? null : defaults.previewNotice;
  const c = s.contact ?? {};
  brand.contact = {
    email: c.email?.trim() || null,
    phone: c.phone?.trim() || null,
    whatsapp: c.whatsapp?.replace(/\D/g, '') || null,
    address: c.address?.trim() || null,
    hours: c.hours?.trim() || null,
  };
  brand.social = (s.social ?? []).filter((l) => l.label?.trim() && /^https?:\/\//.test(l.href ?? ''));
  for (const p of brand.policies) p.body = s.policies?.[p.id]?.trim() || null;
  const paras = (s.story?.paragraphs ?? []).map((x) => x.trim()).filter(Boolean);
  story.paragraphs = paras.length ? paras : [...defaults.story];
  story.pullQuote = s.story?.pullQuote?.trim() || defaults.pullQuote;
  story.placeholder = paras.length === 0;
  return {feePaise: Math.max(0, s.shipping?.feePaise ?? 0), freeOverPaise: s.shipping?.freeOverPaise ?? null};
}

function loadDemo() {
  let has = false;
  try {
    has = localStorage.getItem(DEMO_KEY) !== null;
  } catch {
    /* storage blocked */
  }
  if (!has) {
    emit({products: sampleProducts, ready: true, source: 'sample'});
    return;
  }
  const db = readDemo();
  const products = db.products
    .filter((p) => p.active)
    .sort((a, b) => a.sort - b.sort)
    .map((p) => rowToProduct(p, db.variants, true))
    .filter((p) => p.variants.length > 0);
  const shipping = applySettings(db.settings, false);
  emit({products, ready: true, source: 'demo', shipping});
}

async function loadLive() {
  try {
    const headers = {apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`};
    // Plain REST keeps the storefront bundle small (no client library needed here).
    const [pRes, sRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=*,variants(*)&active=eq.true&order=sort.asc,created_at.asc`, {headers}),
      fetch(`${supabaseUrl}/rest/v1/settings?select=value&key=eq.site`, {headers}),
    ]);
    if (!pRes.ok) throw new Error(`products ${pRes.status}`);
    const rows = (await pRes.json()) as (ProductRow & {variants: VariantRow[]})[];
    const settings = sRes.ok ? (((await sRes.json()) as {value: SiteSettings}[])[0]?.value ?? {}) : {};
    const shipping = applySettings(settings, true);
    const products = rows.map((r) => rowToProduct(r, r.variants ?? [], false)).filter((p) => p.variants.length > 0);
    emit({products, ready: true, source: 'live', shipping, error: null});
  } catch (e) {
    console.error('Could not load the catalogue', e);
    emit({products: [], ready: true, source: 'live', error: 'The collection could not be loaded. Please refresh the page.'});
  }
}

export function loadSiteData() {
  if (isLive) {
    void loadLive();
    return;
  }
  loadDemo();
  // The owner editing in /admin (another tab) updates this tab live.
  window.addEventListener('storage', (e) => {
    if (e.key === DEMO_KEY) loadDemo();
  });
}
