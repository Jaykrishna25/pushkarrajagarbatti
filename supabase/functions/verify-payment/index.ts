/**
 * POST /functions/v1/verify-payment
 * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }  (from Razorpay Checkout's handler)
 *
 * Verifies Razorpay's signature with the secret key, confirms the payment
 * with Razorpay's API, then marks the order paid. The webhook does the same
 * independently, so a customer closing the tab still gets their order.
 */
import {admin, env, hmacHex, json, cors, razorpay, safeEqual} from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors(req)});
  if (req.method !== 'POST') return json(req, {error: 'Method not allowed'}, 405);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json(req, {error: 'Invalid request'}, 400);
  }
  const orderId = String(b.razorpay_order_id ?? '');
  const paymentId = String(b.razorpay_payment_id ?? '');
  const signature = String(b.razorpay_signature ?? '');
  if (!orderId || !paymentId || !signature) return json(req, {error: 'Missing payment details'}, 400);

  const expected = await hmacHex(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature)) return json(req, {status: 'invalid'}, 400);

  try {
    const pay = await razorpay<{status: string; amount: number; order_id: string}>(`/payments/${encodeURIComponent(paymentId)}`);
    if (pay.order_id !== orderId) return json(req, {status: 'invalid'}, 400);
    if (pay.status !== 'captured') return json(req, {status: 'processing'});
    const {data, error} = await admin().rpc('mark_order_paid', {p_razorpay_order_id: orderId, p_payment_id: paymentId, p_amount_paise: pay.amount});
    if (error) throw error;
    const o = data as {status: string; number: number};
    return json(req, {status: o.status === 'payment_review' ? 'review' : 'paid', orderNumber: o.number});
  } catch (e) {
    console.error(e);
    // Signature was valid; the webhook will finish the job.
    return json(req, {status: 'processing'});
  }
});
