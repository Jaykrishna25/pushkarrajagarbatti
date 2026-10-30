import {createClient} from '@supabase/supabase-js';
import {IMAGE_BUCKET, supabaseAnonKey, supabaseUrl, type OrderItemRow, type OrderRow, type ProductRow, type SiteSettings, type VariantRow} from '../lib/db';
import {compressImage, type AdminApi, type OrderWithItems} from './api';

/**
 * Live admin API. Uses the public anon key plus the owner's login session;
 * every write is checked by the database's row-level security (is_admin()).
 */
export function createSupabaseApi(): AdminApi {
  const sb = createClient(supabaseUrl, supabaseAnonKey, {auth: {persistSession: true, autoRefreshToken: true}});
  const fail = (e: {message: string} | null, what: string) => {
    if (e) throw new Error(`${what}: ${e.message}`);
  };

  return {
    mode: 'live',

    async currentUser() {
      const {data} = await sb.auth.getSession();
      const email = data.session?.user.email;
      return email ? {email} : null;
    },
    async signIn(email, password) {
      const {error} = await sb.auth.signInWithPassword({email, password});
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async isAdmin() {
      const {data, error} = await sb.rpc('is_admin');
      return !error && data === true;
    },
    async sendPasswordReset(email) {
      const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: `${location.origin}${location.pathname}`});
      fail(error, 'Could not send the reset email');
    },
    async changePassword(password) {
      const {error} = await sb.auth.updateUser({password});
      fail(error, 'Could not change the password');
    },

    async listProducts() {
      const [p, v] = await Promise.all([
        sb.from('products').select('*').order('sort').order('created_at'),
        sb.from('variants').select('*').order('sort'),
      ]);
      fail(p.error, 'Could not load products');
      fail(v.error, 'Could not load packs');
      return {products: p.data as ProductRow[], variants: v.data as VariantRow[]};
    },

    async saveProduct(draft) {
      const {variants, id, ...fields} = draft;
      let productId = id;
      if (productId) {
        const {error} = await sb.from('products').update(fields).eq('id', productId);
        fail(error, 'Could not save the product');
      } else {
        const {data, error} = await sb.from('products').insert(fields).select('id').single();
        fail(error, 'Could not create the product');
        productId = (data as {id: string}).id;
      }

      const {data: existing, error: exErr} = await sb.from('variants').select('id').eq('product_id', productId);
      fail(exErr, 'Could not load packs');
      const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
      const removed = (existing as {id: string}[]).map((r) => r.id).filter((x) => !keep.has(x));
      if (removed.length) {
        const {error} = await sb.from('variants').delete().in('id', removed);
        fail(error, 'Could not remove packs');
      }
      for (const [i, v] of variants.entries()) {
        const row = {...v, sort: i, product_id: productId};
        const {error} = v.id ? await sb.from('variants').update(row).eq('id', v.id) : await sb.from('variants').insert(row);
        fail(error, `Could not save pack "${v.label}"`);
      }
      return productId!;
    },

    async setProductActive(id, active) {
      const {error} = await sb.from('products').update({active}).eq('id', id);
      fail(error, 'Could not update the product');
    },

    async deleteProduct(id) {
      const {data} = await sb.from('products').select('images').eq('id', id).single();
      const {error} = await sb.from('products').delete().eq('id', id);
      fail(error, 'Could not delete the product');
      const paths = ((data as {images: {path?: string}[]} | null)?.images ?? []).map((i) => i.path).filter((p): p is string => !!p);
      if (paths.length) await sb.storage.from(IMAGE_BUCKET).remove(paths);
    },

    async uploadImage(file) {
      const {blob, width, height} = await compressImage(file, 1600);
      const path = `products/${crypto.randomUUID()}.webp`;
      const {error} = await sb.storage.from(IMAGE_BUCKET).upload(path, blob, {contentType: 'image/webp', cacheControl: '31536000', upsert: false});
      fail(error, 'Could not upload the photo');
      return {path, alt: '', width, height};
    },

    async listOrders() {
      const {data, error} = await sb.from('orders').select('*, order_items(*)').order('created_at', {ascending: false}).limit(500);
      fail(error, 'Could not load orders');
      return (data as (OrderRow & {order_items: OrderItemRow[]})[]).map(({order_items, ...o}) => ({...o, items: order_items})) as OrderWithItems[];
    },

    async updateOrder(id, patch) {
      const {error} = await sb.from('orders').update(patch).eq('id', id);
      fail(error, 'Could not update the order');
    },

    async getSettings() {
      const {data, error} = await sb.from('settings').select('value').eq('key', 'site').maybeSingle();
      fail(error, 'Could not load settings');
      return ((data as {value: SiteSettings} | null)?.value ?? {}) as SiteSettings;
    },

    async saveSettings(s) {
      const {error} = await sb.from('settings').upsert({key: 'site', value: s});
      fail(error, 'Could not save settings');
    },
  };
}
