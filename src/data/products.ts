/**
 * Product catalogue.
 *
 * Every entry below is SAMPLE DATA (`sample: true`) standing in for the
 * official catalogue: names, descriptions, pack sizes, prices and stock are
 * placeholders so the shop can be built and tested. When the catalogue
 * arrives, replace these entries with the real products — keep real names
 * exactly as printed, and leave a field undefined rather than guessing.
 *
 * Money is integer paise (₹1 = 100 paise). Client prices are for display
 * only; the checkout server must re-price every order (see lib/checkout.ts).
 */

export type Mood = 'floral' | 'woody' | 'devotional' | 'fresh';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type Variant = {
  id: string;
  /** e.g. pack size as printed on the pack. */
  label: string;
  pricePaise: number;
  originalPricePaise?: number;
  stock: StockStatus;
  /** Max units per order for this variant, if the business sets one. */
  maxQty?: number;
};

export type ProductImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  mood: Mood;
  description: string;
  details?: string[];
  /** Real product photography. Empty → the concept packaging mockup is drawn. */
  images: ProductImage[];
  variants: Variant[];
  /** True while this is placeholder data. Drives the "sample" labels. */
  sample: boolean;
};

/** Visual identity per mood: colours for the concept pack and the panel light. */
export const moods: Record<Mood, {label: string; pack: string; packDeep: string; accent: string; glow: string; panel: string}> = {
  floral: {label: 'Floral', pack: '#7A2E3A', packDeep: '#4A1820', accent: '#E8B7A6', glow: 'rgba(232,170,150,0.55)', panel: '#2A1518'},
  woody: {label: 'Woody', pack: '#4A2E1C', packDeep: '#2A190F', accent: '#C7A15A', glow: 'rgba(199,140,80,0.5)', panel: '#1E140D'},
  devotional: {label: 'Devotional', pack: '#8A3A16', packDeep: '#55220B', accent: '#F0C674', glow: 'rgba(240,170,80,0.6)', panel: '#24130A'},
  fresh: {label: 'Fresh', pack: '#55573A', packDeep: '#33351F', accent: '#DCE0B8', glow: 'rgba(210,220,170,0.45)', panel: '#1A1B12'},
};

export const products: Product[] = [
  {
    id: 'sample-floral',
    slug: 'sample-floral',
    name: 'Sample Fragrance — Floral',
    category: 'Floral',
    mood: 'floral',
    description: 'Placeholder description. Replace with the official fragrance notes from the catalogue.',
    details: ['Pack contents, burn time and usage notes will appear here once supplied.'],
    images: [],
    variants: [
      {id: 'sample-floral-s', label: 'Small pack (sample)', pricePaise: 9900, stock: 'in_stock'},
      {id: 'sample-floral-l', label: 'Large pack (sample)', pricePaise: 19900, stock: 'in_stock'},
    ],
    sample: true,
  },
  {
    id: 'sample-woody',
    slug: 'sample-woody',
    name: 'Sample Fragrance — Woody',
    category: 'Woody',
    mood: 'woody',
    description: 'Placeholder description. Replace with the official fragrance notes from the catalogue.',
    details: ['Pack contents, burn time and usage notes will appear here once supplied.'],
    images: [],
    variants: [
      {id: 'sample-woody-s', label: 'Small pack (sample)', pricePaise: 11900, stock: 'in_stock'},
      {id: 'sample-woody-l', label: 'Large pack (sample)', pricePaise: 22900, stock: 'low_stock', maxQty: 3},
    ],
    sample: true,
  },
  {
    id: 'sample-devotional',
    slug: 'sample-devotional',
    name: 'Sample Fragrance — Devotional',
    category: 'Devotional',
    mood: 'devotional',
    description: 'Placeholder description. Replace with the official fragrance notes from the catalogue.',
    details: ['Pack contents, burn time and usage notes will appear here once supplied.'],
    images: [],
    variants: [
      {id: 'sample-devotional-s', label: 'Small pack (sample)', pricePaise: 9900, stock: 'in_stock'},
      {id: 'sample-devotional-l', label: 'Large pack (sample)', pricePaise: 19900, originalPricePaise: 21900, stock: 'in_stock'},
    ],
    sample: true,
  },
  {
    id: 'sample-fresh',
    slug: 'sample-fresh',
    name: 'Sample Fragrance — Fresh',
    category: 'Fresh',
    mood: 'fresh',
    description: 'Placeholder description. Replace with the official fragrance notes from the catalogue.',
    details: ['Pack contents, burn time and usage notes will appear here once supplied.'],
    images: [],
    variants: [
      {id: 'sample-fresh-s', label: 'Small pack (sample)', pricePaise: 10900, stock: 'in_stock'},
      {id: 'sample-fresh-l', label: 'Large pack (sample)', pricePaise: 20900, stock: 'out_of_stock'},
    ],
    sample: true,
  },
];

export const findProduct = (id: string) => products.find((p) => p.id === id);

export function findVariant(productId: string, variantId: string): {product: Product; variant: Variant} | undefined {
  const product = findProduct(productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  return product && variant ? {product, variant} : undefined;
}

export const isAvailable = (v: Variant) => v.stock !== 'out_of_stock';

/** First purchasable variant, or the first one if none are. */
export const defaultVariant = (p: Product): Variant => (p.variants.find(isAvailable) ?? p.variants[0])!;

export const stockLabel: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Few left',
  out_of_stock: 'Out of stock',
};
