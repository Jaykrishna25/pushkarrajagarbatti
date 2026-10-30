/**
 * POST /functions/v1/create-order
 * body: { items: [{ productId, variantId, qty }], customer: { name, phone, email, line1, line2?, city, state, pincode } }
 *
 * Re-prices every line from the database, checks stock and limits, adds
 * shipping from the owner's settings, records the order as pending_payment
 * and opens a Razorpay order for exactly that total. The browser's idea of
 * the price is never used.
 */
import {admin, env, json, cors, razorpay} from '../_shared/util.ts';

type Item = {productId: string; variantId: string; qty: number};
type Customer = {name: string; phone: string; email: string; line1: string; line2?: string; city: string; state: string; pincode: string};

const MAX_LINES = 30;
const MAX_QTY = 20;

function validCustomer(c: unknown): c is Customer {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  const s = (k: string, max = 200) => typeof x[k] === 'string' && (x[k] as string).trim().length > 0 && (x[k] as string).length <= max;
  return (
    s('name', 120) && s('line1') && s('city', 80) && s('state', 80) &&
    typeof x.phone === 'string' && /^[6-9]\d{9}$/.test(x.phone) &&
    typeof x.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email) && x.email.length <= 200 &&
    typeof x.pincode === 'string' && /^\d{6}$/.test(x.pincode) &&
    (x.line2 === undefined || (typeof x.line2 === 'string' && x.line2.length <= 200))
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors(req)});
  if (req.method !== 'POST') return json(req, {error: 'Method not allowed'}, 405);

  let body: {items?: unknown; customer?: unknown};
  try {
    body = await req.json();
  } catch {
    return json(req, {error: 'Invalid request'}, 400);
  }

  const items = Array.isArray(body.items) ? (body.items as Item[]) : [];
  if (items.length === 0 || items.length > MAX_LINES) return json(req, {error: 'Your cart is empty.'}, 400);
  if (!items.every((i) => typeof i?.variantId === 'string' && typeof i?.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= MAX_QTY)) {
    return json(req, {error: 'Invalid cart.'}, 400);
  }
  if (!validCustomer(body.customer)) return json(req, {error: 'Please check your delivery details.'}, 400);
  const customer = body.customer;

  const db = admin();
  const {data: rows, error} = await db
    .from('variants')
    .select('id, label, price_paise, stock_status, stock_qty, max_qty, active, product:products!inner(id, name, active)')
    .in('id', items.map((i) => i.variantId));
  if (error) return json(req, {error: 'Could not load products.'}, 500);

  type Row = {id: string; label: string; price_paise: number; stock_status: string; stock_qty: number | null; max_qty: number | null; active: boolean; product: {id: string; name: string; active: boolean}};
  const byId = new Map((rows as unknown as Row[]).map((r) => [r.id, r]));

  const lines = [];
  for (const it of items) {
    const v = byId.get(it.variantId);
    if (!v || !v.active || !v.product.active || v.product.id !== it.productId) {
      return json(req, {error: 'An item in your cart is no longer available. Please refresh and try again.'}, 409);
    }
    const name = `${v.product.name} (${v.label})`;
    if (v.stock_status === 'out_of_stock') return json(req, {error: `${name} is out of stock.`}, 409);
    if (v.stock_qty !== null && it.qty > v.stock_qty) return json(req, {error: `Only ${v.stock_qty} left of ${name}.`}, 409);
    if (v.max_qty !== null && it.qty > v.max_qty) return json(req, {error: `You can order at most ${v.max_qty} of ${name}.`}, 409);
    lines.push({
      product_id: v.product.id,
      variant_id: v.id,
      product_name: v.product.name,
      variant_label: v.label,
      unit_price_paise: v.price_paise,
      qty: it.qty,
      line_total_paise: v.price_paise * it.qty,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total_paise, 0);
  const {data: settingsRow} = await db.from('settings').select('value').eq('key', 'site').maybeSingle();
  const ship = (settingsRow?.value as {shipping?: {feePaise?: number; freeOverPaise?: number | null}} | null)?.shipping ?? {};
  const fee = Number.isInteger(ship.feePaise) && ship.feePaise! > 0 ? ship.feePaise! : 0;
  const shipping = ship.freeOverPaise && subtotal >= ship.freeOverPaise ? 0 : fee;
  const total = subtotal + shipping;
  if (total < 100) return json(req, {error: 'Order total is too low for online payment.'}, 400);

  const {data: order, error: oErr} = await db
    .from('orders')
    .insert({customer: {...customer, email: customer.email.trim().toLowerCase()}, subtotal_paise: subtotal, shipping_paise: shipping, total_paise: total})
    .select('id, number')
    .single();
  if (oErr || !order) return json(req, {error: 'Could not create your order.'}, 500);

  const {error: iErr} = await db.from('order_items').insert(lines.map((l) => ({...l, order_id: order.id})));
  if (iErr) {
    await db.from('orders').update({status: 'payment_failed', admin_note: 'Could not save items'}).eq('id', order.id);
    return json(req, {error: 'Could not create your order.'}, 500);
  }

  try {
    const rp = await razorpay<{id: string; amount: number}>('/orders', {
      method: 'POST',
      body: {amount: total, currency: 'INR', receipt: `PRA-${order.number}`, notes: {order_id: order.id}},
    });
    await db.from('orders').update({razorpay_order_id: rp.id}).eq('id', order.id);
    return json(req, {
      orderId: order.id,
      orderNumber: order.number,
      razorpayOrderId: rp.id,
      amountPaise: total,
      subtotalPaise: subtotal,
      shippingPaise: shipping,
      currency: 'INR',
      keyId: env('RAZORPAY_KEY_ID'),
    });
  } catch (e) {
    console.error(e);
    await db.from('orders').update({status: 'payment_failed', admin_note: 'Payment gateway did not open'}).eq('id', order.id);
    return json(req, {error: 'The payment gateway is unavailable. Please try again shortly.'}, 502);
  }
});
