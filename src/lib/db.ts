/**
 * Shapes of the database rows (supabase/migrations/0001_shop.sql) and the
 * mapping from rows to the storefront's Product type. Shared by the site and
 * the admin panel.
 */
import type {Mood, Product, StockStatus} from '../data/products';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
/** True when the site is connected to a real Supabase project. */
export const isLive = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const IMAGE_BUCKET = 'product-images';

export type ImageRef = {
  /** Path inside the product-images bucket (live). */
  path?: string;
  /** Direct URL or data: URL (demo mode, or an external CDN). */
  src?: string;
  alt: string;
  width: number;
  height: number;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  mood: Mood;
  description: string;
  details: string[];
  images: ImageRef[];
  active: boolean;
  sort: number;
  created_at?: string;
  updated_at?: string;
};

export type VariantRow = {
  id: string;
  product_id: string;
  label: string;
  price_paise: number;
  original_price_paise: number | null;
  stock_status: StockStatus;
  stock_qty: number | null;
  max_qty: number | null;
  active: boolean;
  sort: number;
};

export type OrderStatus = 'pending_payment' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed' | 'payment_review';

export type Customer = {name: string; phone: string; email: string; line1: string; line2?: string; city: string; state: string; pincode: string};

export type OrderRow = {
  id: string;
  number: number;
  status: OrderStatus;
  customer: Customer;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  tracking: string;
  admin_note: string;
  created_at: string;
  paid_at: string | null;
  updated_at?: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string;
  unit_price_paise: number;
  qty: number;
  line_total_paise: number;
};

export type SiteSettings = {
  tagline?: string;
  description?: string;
  legalName?: string | null;
  previewNotice?: string | null;
  contact?: {email?: string | null; phone?: string | null; whatsapp?: string | null; address?: string | null; hours?: string | null};
  social?: {label: string; href: string}[];
  policies?: {shipping?: string | null; returns?: string | null; privacy?: string | null; terms?: string | null};
  story?: {paragraphs?: string[]; pullQuote?: string};
  shipping?: {feePaise?: number; freeOverPaise?: number | null};
};

export const imageUrl = (img: ImageRef): string =>
  img.src ?? (img.path ? `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${img.path.split('/').map(encodeURIComponent).join('/')}` : '');

export function rowToProduct(p: ProductRow, variants: VariantRow[], sample: boolean): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category || 'Fragrance',
    mood: p.mood,
    description: p.description,
    details: p.details?.length ? p.details : undefined,
    images: (p.images ?? []).map((i) => ({src: imageUrl(i), alt: i.alt || p.name, width: i.width || 1200, height: i.height || 1500})).filter((i) => i.src),
    variants: variants
      .filter((v) => v.product_id === p.id && v.active)
      .sort((a, b) => a.sort - b.sort)
      .map((v) => ({
        id: v.id,
        label: v.label,
        pricePaise: v.price_paise,
        originalPricePaise: v.original_price_paise ?? undefined,
        stock: v.stock_status,
        // Never let a shopper put more in the cart than is counted in stock.
        maxQty: v.stock_qty !== null && v.stock_qty > 0 ? Math.min(v.stock_qty, v.max_qty ?? Infinity) : (v.max_qty ?? undefined),
      })),
    sample,
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
