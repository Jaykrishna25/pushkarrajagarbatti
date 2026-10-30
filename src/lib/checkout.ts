import {brand} from '../data/brand';
import type {CartLine} from './cart';
import {isLive, supabaseAnonKey, supabaseUrl, type Customer} from './db';

/**
 * Checkout, live mode only:
 *
 *   1. create-order (Edge Function) re-prices the cart from the database,
 *      checks stock, saves a pending order and opens a Razorpay order.
 *   2. Razorpay Checkout collects the payment (UPI, cards, netbanking …).
 *   3. verify-payment checks Razorpay's signature server-side and marks the
 *      order paid. The razorpay-webhook does the same independently.
 *
 * Nothing in the browser decides a price or declares an order paid.
 */

export const checkoutAvailable = isLive;

export type CreatedOrder = {
  orderId: string;
  orderNumber: number;
  razorpayOrderId: string;
  amountPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  currency: 'INR';
  keyId: string;
};

export type PaymentOutcome =
  | {status: 'paid'; orderNumber: number}
  | {status: 'processing'; orderNumber: number}
  | {status: 'review'; orderNumber: number}
  | {status: 'dismissed'}
  | {status: 'failed'; message: string};

async function call<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`},
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & {error?: string};
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const createOrder = (lines: CartLine[], customer: Customer) =>
  call<CreatedOrder>('create-order', {items: lines.map(({productId, variantId, qty}) => ({productId, variantId, qty})), customer});

type RazorpayResponse = {razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string};
type RazorpayInstance = {open: () => void; on: (evt: string, cb: (r: {error?: {description?: string}}) => void) => void};
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('The payment window could not be loaded. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Opens Razorpay for a created order and resolves once the server has checked the result. */
export async function pay(order: CreatedOrder, customer: Customer): Promise<PaymentOutcome> {
  await loadRazorpay();
  const response = await new Promise<RazorpayResponse | null | {error: string}>((resolve) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: brand.name,
      description: `Order #${order.orderNumber}`,
      prefill: {name: customer.name, email: customer.email, contact: `+91${customer.phone}`},
      notes: {order_number: String(order.orderNumber)},
      theme: {color: '#A85A2A'},
      handler: (r: RazorpayResponse) => resolve(r),
      modal: {ondismiss: () => resolve(null)},
    });
    rzp.on('payment.failed', (r) => resolve({error: r.error?.description || 'The payment did not go through.'}));
    rzp.open();
  });
  if (response === null) return {status: 'dismissed'};
  if ('error' in response) return {status: 'failed', message: response.error};
  try {
    const v = await call<{status: 'paid' | 'processing' | 'review' | 'invalid'; orderNumber?: number}>('verify-payment', response);
    if (v.status === 'invalid') return {status: 'failed', message: 'We could not verify this payment. If money was deducted, please contact us with your order number.'};
    return {status: v.status, orderNumber: v.orderNumber ?? order.orderNumber};
  } catch {
    // Razorpay accepted it; the webhook will confirm it on our side.
    return {status: 'processing', orderNumber: order.orderNumber};
  }
}

/* Delivery details form helpers ------------------------------------------- */

export const emptyCustomer: Customer = {name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: ''};
const KEY = 'pra-customer-v1';

export function loadCustomer(): Customer {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Customer> | null;
    return {...emptyCustomer, ...(raw ?? {})};
  } catch {
    return {...emptyCustomer};
  }
}
export function saveCustomer(c: Customer) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* convenience only */
  }
}

export function validateCustomer(c: Customer): Partial<Record<keyof Customer, string>> {
  const e: Partial<Record<keyof Customer, string>> = {};
  if (!c.name.trim()) e.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(c.phone)) e.phone = 'Enter a 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = 'Enter a valid email address.';
  if (!c.line1.trim()) e.line1 = 'Please enter your address.';
  if (!c.city.trim()) e.city = 'Please enter your city.';
  if (!c.state.trim()) e.state = 'Please enter your state.';
  if (!/^\d{6}$/.test(c.pincode)) e.pincode = 'Enter a 6-digit PIN code.';
  return e;
}
