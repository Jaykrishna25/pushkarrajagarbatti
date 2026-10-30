import {readDemo, writeDemo, type DemoDb} from '../lib/demoStore';
import type {VariantRow} from '../lib/db';
import {compressImage, nextStatuses, type AdminApi} from './api';

/**
 * Demo admin API: the same operations against browser-only storage, with the
 * same rules as the database (stock status from quantity, order-status
 * transitions, payment fields read-only).
 */
const SESSION = 'pra-demo-session';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const delay = () => new Promise((r) => setTimeout(r, 120));

function withStock(v: VariantRow): VariantRow {
  if (v.stock_qty === null) return v;
  return {...v, stock_status: v.stock_qty === 0 ? 'out_of_stock' : v.stock_qty <= 5 ? 'low_stock' : 'in_stock'};
}

export function createDemoApi(): AdminApi {
  const mutate = (fn: (db: DemoDb) => void) => {
    const db = readDemo();
    fn(db);
    writeDemo(db);
  };

  return {
    mode: 'demo',
    async currentUser() {
      try {
        return localStorage.getItem(SESSION) ? {email: 'demo@preview'} : null;
      } catch {
        return null;
      }
    },
    async signIn() {
      try {
        localStorage.setItem(SESSION, '1');
      } catch {
        /* ignore */
      }
      // Materialise the seed so the storefront in this browser follows the demo.
      writeDemo(readDemo());
    },
    async signOut() {
      try {
        localStorage.removeItem(SESSION);
      } catch {
        /* ignore */
      }
    },
    async isAdmin() {
      return true;
    },
    async sendPasswordReset() {
      throw new Error('Password reset works once the panel is connected to Supabase.');
    },
    async changePassword() {
      throw new Error('Passwords are managed once the panel is connected to Supabase.');
    },

    async listProducts() {
      await delay();
      const db = readDemo();
      return {products: [...db.products].sort((a, b) => a.sort - b.sort), variants: db.variants};
    },
    async saveProduct(draft) {
      await delay();
      const {variants, id, ...fields} = draft;
      const productId = id ?? uid();
      mutate((db) => {
        if (db.products.some((p) => p.slug === fields.slug && p.id !== productId)) throw new Error('Another product already uses this web address (slug).');
        const row = {...fields, id: productId};
        const i = db.products.findIndex((p) => p.id === productId);
        if (i >= 0) db.products[i] = {...db.products[i]!, ...row};
        else db.products.push(row);
        db.variants = db.variants.filter((v) => v.product_id !== productId);
        variants.forEach((v, k) => db.variants.push(withStock({...v, id: v.id ?? uid(), product_id: productId, sort: k})));
      });
      return productId;
    },
    async setProductActive(id, active) {
      mutate((db) => {
        const p = db.products.find((x) => x.id === id);
        if (p) p.active = active;
      });
    },
    async deleteProduct(id) {
      await delay();
      mutate((db) => {
        db.products = db.products.filter((p) => p.id !== id);
        db.variants = db.variants.filter((v) => v.product_id !== id);
      });
    },
    async uploadImage(file) {
      // Small, because it lives in this browser's storage.
      const {blob, width, height} = await compressImage(file, 900, 0.8);
      const src = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('Could not read the photo.'));
        r.readAsDataURL(blob);
      });
      return {src, alt: '', width, height};
    },

    async listOrders() {
      await delay();
      const db = readDemo();
      return [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((o) => ({...o, items: db.items.filter((i) => i.order_id === o.id)}));
    },
    async updateOrder(id, patch) {
      await delay();
      mutate((db) => {
        const o = db.orders.find((x) => x.id === id);
        if (!o) throw new Error('Order not found.');
        if (patch.status && patch.status !== o.status && !nextStatuses[o.status].includes(patch.status)) {
          throw new Error(`An order that is "${o.status}" can't be moved to "${patch.status}".`);
        }
        Object.assign(o, patch, {updated_at: new Date().toISOString()});
      });
    },

    async getSettings() {
      return readDemo().settings ?? {};
    },
    async saveSettings(s) {
      await delay();
      mutate((db) => {
        db.settings = s;
      });
    },
  };
}
