/**
 * Razorpay → POST /functions/v1/razorpay-webhook
 * Configure in Razorpay Dashboard → Webhooks, events: payment.captured, payment.failed.
 * Deploy with --no-verify-jwt (Razorpay doesn't send a Supabase token);
 * authenticity comes from the X-Razorpay-Signature HMAC instead.
 */
import {admin, env, hmacHex, safeEqual} from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', {status: 405});
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  const expected = await hmacHex(env('RAZORPAY_WEBHOOK_SECRET'), raw);
  if (!sig || !safeEqual(expected, sig)) return new Response('Invalid signature', {status: 401});

  let evt: {event?: string; payload?: {payment?: {entity?: {id: string; order_id: string; amount: number}}}};
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', {status: 400});
  }
  const p = evt.payload?.payment?.entity;
  if (!p?.order_id) return new Response('ignored');

  const db = admin();
  if (evt.event === 'payment.captured') {
    const {error} = await db.rpc('mark_order_paid', {p_razorpay_order_id: p.order_id, p_payment_id: p.id, p_amount_paise: p.amount});
    if (error) {
      console.error(error);
      return new Response('error', {status: 500}); // Razorpay retries
    }
  } else if (evt.event === 'payment.failed') {
    await db.from('orders').update({status: 'payment_failed'}).eq('razorpay_order_id', p.order_id).eq('status', 'pending_payment');
  }
  return new Response('ok');
});
