// Shared helpers for the Edge Functions. Secrets come from `supabase secrets set`,
// never from the browser.
import {createClient} from 'npm:@supabase/supabase-js@2';

export const env = (name: string): string => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};

/** Service-role client: bypasses RLS. Only ever used inside these functions. */
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {auth: {persistSession: false}});

const allowed = () => (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim()).filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const list = allowed();
  const allow = list.includes('*') ? '*' : list.includes(origin) ? origin : list[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {...cors(req), 'Content-Type': 'application/json'}});

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function razorpay<T>(path: string, init: {method?: string; body?: unknown} = {}): Promise<T> {
  const auth = btoa(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? 'GET',
    headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/json'},
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`Razorpay ${path} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}
