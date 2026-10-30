import type {CartLine} from './cart';

/**
 * Checkout integration boundary.
 *
 * The browser sends ONLY product IDs, variant IDs and quantities. Your
 * server must look up prices, stock, shipping and tax itself, create the
 * order/payment session with the provider (Razorpay, Stripe, Cashfree, …)
 * using its SECRET key, and reply with a URL to send the customer to.
 *
 *   POST {VITE_CHECKOUT_ENDPOINT}
 *   body:     {"items":[{"productId":"…","variantId":"…","qty":1}]}
 *   200 OK →  {"redirectUrl":"https://…"}
 *
 * Until VITE_CHECKOUT_ENDPOINT is set, startCheckout() reports
 * "not-configured" and the UI says so plainly. Nothing here ever reports
 * an order as placed or a payment as taken.
 */

export type CheckoutResult =
  | {status: 'redirect'; url: string}
  | {status: 'not-configured'}
  | {status: 'error'; message: string};

export const checkoutEndpoint = (import.meta.env.VITE_CHECKOUT_ENDPOINT ?? '').trim();
export const checkoutConfigured = checkoutEndpoint.length > 0;

export async function startCheckout(lines: CartLine[]): Promise<CheckoutResult> {
  if (!checkoutConfigured) return {status: 'not-configured'};
  try {
    const res = await fetch(checkoutEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({items: lines.map(({productId, variantId, qty}) => ({productId, variantId, qty}))}),
    });
    if (!res.ok) return {status: 'error', message: `The checkout server answered ${res.status}. Please try again.`};
    const data: unknown = await res.json();
    const url = (data as {redirectUrl?: unknown}).redirectUrl;
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) return {status: 'error', message: 'The checkout server did not return a payment page.'};
    return {status: 'redirect', url};
  } catch {
    return {status: 'error', message: 'Could not reach the checkout server. Check your connection and try again.'};
  }
}
