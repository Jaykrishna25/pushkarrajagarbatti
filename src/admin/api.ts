import {isLive, type ImageRef, type OrderItemRow, type OrderRow, type OrderStatus, type ProductRow, type SiteSettings, type VariantRow} from '../lib/db';

/**
 * Everything the admin panel can do, behind one interface with two
 * implementations: Supabase (live) and the browser-only demo.
 */

export type VariantDraft = Omit<VariantRow, 'id' | 'product_id'> & {id?: string};
export type ProductDraft = Omit<ProductRow, 'id'> & {id?: string; variants: VariantDraft[]};
export type OrderWithItems = OrderRow & {items: OrderItemRow[]};
export type OrderPatch = Partial<Pick<OrderRow, 'status' | 'tracking' | 'admin_note'>>;

export interface AdminApi {
  mode: 'live' | 'demo';
  currentUser(): Promise<{email: string} | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  isAdmin(): Promise<boolean>;
  sendPasswordReset(email: string): Promise<void>;
  changePassword(password: string): Promise<void>;

  listProducts(): Promise<{products: ProductRow[]; variants: VariantRow[]}>;
  saveProduct(draft: ProductDraft): Promise<string>;
  setProductActive(id: string, active: boolean): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  uploadImage(file: File): Promise<ImageRef>;

  listOrders(): Promise<OrderWithItems[]>;
  updateOrder(id: string, patch: OrderPatch): Promise<void>;

  getSettings(): Promise<SiteSettings>;
  saveSettings(s: SiteSettings): Promise<void>;
}

/** Which status an order may move to next, from the owner's side. Mirrors the database guard. */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  payment_failed: ['cancelled'],
  payment_review: ['cancelled'],
  paid: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const statusLabel: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  payment_failed: 'Payment failed',
  payment_review: 'Check payment',
  paid: 'Paid · to pack',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAID_STATUSES: OrderStatus[] = ['paid', 'packed', 'shipped', 'delivered'];

let instance: Promise<AdminApi> | null = null;
export function getApi(): Promise<AdminApi> {
  instance ??= isLive ? import('./supabaseApi').then((m) => m.createSupabaseApi()) : import('./demoApi').then((m) => m.createDemoApi());
  return instance;
}

/** Resize + re-encode a photo in the browser before upload (keeps pages fast and storage small). */
export async function compressImage(file: File, maxSide: number, quality = 0.85): Promise<{blob: Blob; width: number; height: number}> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('That photo is larger than 25 MB.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not process the photo.'))), 'image/webp', quality));
  return {blob, width, height};
}
