/**
 * DEMO MODE storage — used only when the site isn't connected to Supabase.
 *
 * Holds the same tables as the real database, in this browser's
 * localStorage, so the owner can try the admin panel and see changes on the
 * storefront in the same browser. Nothing here is visible to other visitors,
 * and no real orders or payments ever pass through it.
 */
import {sampleProducts} from '../data/products';
import type {OrderItemRow, OrderRow, ProductRow, SiteSettings, VariantRow} from './db';

export const DEMO_KEY = 'pra-demo-db-v1';

export type DemoDb = {
  products: ProductRow[];
  variants: VariantRow[];
  settings: SiteSettings;
  orders: OrderRow[];
  items: OrderItemRow[];
  nextNumber: number;
};

export function seedDemo(): DemoDb {
  const products: ProductRow[] = sampleProducts.map((p, i) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    mood: p.mood,
    description: p.description,
    details: p.details ?? [],
    images: [],
    active: true,
    sort: i,
  }));
  const variants: VariantRow[] = sampleProducts.flatMap((p) =>
    p.variants.map((v, i) => ({
      id: v.id,
      product_id: p.id,
      label: v.label,
      price_paise: v.pricePaise,
      original_price_paise: v.originalPricePaise ?? null,
      stock_status: v.stock,
      stock_qty: null,
      max_qty: v.maxQty ?? null,
      active: true,
      sort: i,
    })),
  );
  const now = Date.now();
  const day = 86_400_000;
  const mk = (n: number, status: OrderRow['status'], ago: number, lines: [string, string, number][], name: string, city: string): [OrderRow, OrderItemRow[]] => {
    const id = `demo-order-${n}`;
    const items = lines.map(([pid, vid, qty], k) => {
      const v = variants.find((x) => x.id === vid)!;
      const p = products.find((x) => x.id === pid)!;
      return {id: `${id}-${k}`, order_id: id, product_id: pid, variant_id: vid, product_name: p.name, variant_label: v.label, unit_price_paise: v.price_paise, qty, line_total_paise: v.price_paise * qty};
    });
    const subtotal = items.reduce((s, x) => s + x.line_total_paise, 0);
    const created = new Date(now - ago).toISOString();
    return [
      {
        id,
        number: n,
        status,
        customer: {name, phone: '9000000000', email: 'sample.customer@example.com', line1: 'Sample address', city, state: 'Gujarat', pincode: '380001'},
        subtotal_paise: subtotal,
        shipping_paise: 0,
        total_paise: subtotal,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        tracking: status === 'shipped' ? 'Sample tracking ref' : '',
        admin_note: 'Sample order for the demo — not a real customer.',
        created_at: created,
        paid_at: status === 'pending_payment' ? null : created,
      },
      items,
    ];
  };
  const seeded = [
    mk(1001, 'shipped', day * 3, [['sample-woody', 'sample-woody-s', 2]], 'Sample Customer A', 'Ahmedabad'),
    mk(1002, 'paid', day * 0.2, [['sample-floral', 'sample-floral-l', 1], ['sample-devotional', 'sample-devotional-s', 3]], 'Sample Customer B', 'Surat'),
    mk(1003, 'pending_payment', day * 0.05, [['sample-fresh', 'sample-fresh-s', 1]], 'Sample Customer C', 'Vadodara'),
  ];
  return {
    products,
    variants,
    settings: {shipping: {feePaise: 0, freeOverPaise: null}},
    orders: seeded.map(([o]) => o),
    items: seeded.flatMap(([, i]) => i),
    nextNumber: 1004,
  };
}

export function readDemo(): DemoDb {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* fall through */
  }
  return seedDemo();
}

export function writeDemo(db: DemoDb) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db));
  } catch {
    throw new Error('This browser could not save the demo data (storage full or blocked). Try smaller photos.');
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}
