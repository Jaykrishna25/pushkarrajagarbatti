import {useState, type FormEvent} from 'react';
import {brand} from '../data/brand';
import {useSiteData} from '../data/site';
import {useShop} from '../hooks/useShop';
import {maxQtyFor} from '../lib/cart';
import {checkoutAvailable, createOrder, loadCustomer, pay, saveCustomer, validateCustomer, type PaymentOutcome} from '../lib/checkout';
import type {Customer} from '../lib/db';
import {formatPaise} from '../lib/money';
import {scrollToTarget} from '../lib/scroll';
import {ProductVisual} from './Art';
import {CloseButton, Drawer} from './Drawer';
import {QtyStepper} from './Shop';

type Step = 'cart' | 'details' | 'result';

export function CartDrawer() {
  const {cartOpen, setCartOpen, lines, subtotal, count, dispatch, cart} = useShop();
  const {shipping} = useSiteData();
  const [step, setStep] = useState<Step>('cart');
  const [customer, setCustomer] = useState<Customer>(loadCustomer);
  const [errors, setErrors] = useState<Partial<Record<keyof Customer, string>>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  const shippingFee = shipping.freeOverPaise && subtotal >= shipping.freeOverPaise ? 0 : shipping.feePaise;
  const total = subtotal + shippingFee;

  const close = () => {
    setCartOpen(false);
    if (step === 'result') setStep('cart');
    setProblem(null);
    setNotConnected(false);
  };

  const proceed = () => {
    if (!checkoutAvailable) {
      setNotConnected(true);
      return;
    }
    setProblem(null);
    setStep('details');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean: Customer = {...customer, phone: customer.phone.replace(/\D/g, '').slice(-10), pincode: customer.pincode.replace(/\D/g, ''), email: customer.email.trim()};
    const errs = validateCustomer(clean);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`c-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    saveCustomer(clean);
    setBusy(true);
    setProblem(null);
    try {
      const order = await createOrder(cart.lines, clean);
      const result = await pay(order, clean);
      if (result.status === 'dismissed') {
        setProblem('Payment window closed. You have not been charged — your cart is still here.');
      } else if (result.status === 'failed') {
        setProblem(result.message);
      } else {
        dispatch({type: 'clear'});
        setOutcome(result);
        setStep('result');
      }
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const enquiry = encodeURIComponent(`Hello ${brand.shortName}, I'd like to order:\n` + lines.map((l) => `• ${l.qty} × ${l.product.name} (${l.variant.label})`).join('\n'));

  const field = (key: keyof Customer, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`c-${key}`} className="mb-1 block font-mono text-label text-char/60 uppercase">
        {label}
      </label>
      <input
        id={`c-${key}`}
        value={customer[key] ?? ''}
        onChange={(e) => setCustomer((c) => ({...c, [key]: e.target.value}))}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `c-${key}-err` : undefined}
        className="w-full rounded-[4px] bg-white px-3.5 py-3 text-[0.9375rem] ring-1 ring-char/15 outline-none focus:ring-2 focus:ring-saffron-deep aria-[invalid=true]:ring-saffron"
        {...props}
      />
      {errors[key] && (
        <span id={`c-${key}-err`} className="mt-1 block text-[0.8125rem] text-saffron-deep">
          {errors[key]}
        </span>
      )}
    </div>
  );

  const title = step === 'details' ? 'Delivery details' : step === 'result' ? 'Thank you' : 'Your cart';

  return (
    <Drawer open={cartOpen} onClose={close} labelledBy="cart-title">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-char/10 bg-ivory/90 px-5 py-2 backdrop-blur">
        <div className="flex items-center gap-1">
          {step === 'details' && (
            <button type="button" onClick={() => setStep('cart')} aria-label="Back to cart" className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-char/8">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
          <h2 id="cart-title" className="font-display text-[1.75rem] font-medium">
            {title} {step === 'cart' && <span className="font-mono text-label text-char/55">({count})</span>}
          </h2>
        </div>
        <CloseButton onClick={close} label="Close cart" />
      </div>

      {step === 'result' && outcome && 'orderNumber' in outcome && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center" role="status">
          <svg viewBox="0 0 24 32" aria-hidden="true" className="h-12 text-gold">
            <path d="M12 2c3.4 5 5.2 8.6 5.2 11.6a5.2 5.2 0 0 1-10.4 0C6.8 10.6 8.6 7 12 2Z" fill="currentColor" />
          </svg>
          <p className="font-display text-[2rem] leading-tight">{outcome.status === 'paid' ? 'Payment received.' : 'Payment being confirmed.'}</p>
          <p className="font-mono text-label text-char/60 uppercase">Order #{outcome.orderNumber}</p>
          <p className="max-w-[30ch] text-body text-char/70">
            {outcome.status === 'paid'
              ? 'Your order is confirmed. Please keep your order number for any questions about delivery.'
              : outcome.status === 'review'
                ? 'Your payment was received and is being reviewed by the store. Please keep your order number.'
                : 'Razorpay has your payment and we are confirming it. Your order will show as paid shortly — please keep your order number.'}
          </p>
          <button type="button" data-autofocus onClick={close} className="mt-4 rounded-full bg-char px-6 py-3.5 font-mono text-label text-ivory uppercase hover:bg-saffron-deep">
            Continue browsing
          </button>
        </div>
      )}

      {step !== 'result' && lines.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-20 text-center">
          <svg viewBox="0 0 24 32" aria-hidden="true" className="h-12 text-sand">
            <path d="M12 2c3.4 5 5.2 8.6 5.2 11.6a5.2 5.2 0 0 1-10.4 0C6.8 10.6 8.6 7 12 2Z" fill="currentColor" />
          </svg>
          <p className="font-display text-[1.75rem] leading-tight">Your cart is empty.</p>
          <p className="max-w-[24ch] text-body text-char/65">Find a fragrance for your mornings, your prayers and your quiet evenings.</p>
          <button
            type="button"
            data-autofocus
            onClick={() => {
              close();
              scrollToTarget('#shop');
            }}
            className="rounded-full bg-char px-6 py-3.5 font-mono text-label text-ivory uppercase hover:bg-saffron-deep"
          >
            Explore the collection
          </button>
        </div>
      )}

      {step === 'cart' && lines.length > 0 && (
        <>
          <ul className="flex-1 divide-y divide-char/10 px-5">
            {lines.map((l) => (
              <li key={`${l.productId}/${l.variantId}`} className="flex gap-4 py-5">
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-char p-2">
                  <ProductVisual product={l.product} className="h-full w-auto" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[1.25rem] leading-tight font-medium">{l.product.name}</p>
                      <p className="text-[0.8125rem] text-char/60">
                        {l.variant.label} · {formatPaise(l.variant.pricePaise)} each
                      </p>
                    </div>
                    <p className="font-mono text-[0.875rem] tabular-nums">{formatPaise(l.lineTotalPaise)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <QtyStepper
                      value={l.qty}
                      max={maxQtyFor(l.variant)}
                      onChange={(qty) => dispatch({type: 'setQty', productId: l.productId, variantId: l.variantId, qty})}
                      label={`Quantity for ${l.product.name}, ${l.variant.label}`}
                    />
                    <button
                      type="button"
                      onClick={() => dispatch({type: 'remove', productId: l.productId, variantId: l.variantId})}
                      className="font-mono text-label text-char/60 uppercase underline-offset-4 hover:text-char hover:underline"
                    >
                      Remove<span className="sr-only"> {l.product.name}, {l.variant.label}</span>
                    </button>
                  </div>
                  {l.qty >= maxQtyFor(l.variant) && <p className="text-[0.75rem] text-saffron-deep">Maximum quantity for this pack.</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 space-y-3 border-t border-char/10 bg-ivory px-5 pt-5 pb-6">
            <Totals subtotal={subtotal} shipping={shippingFee} total={total} />
            {brand.previewNotice && <p className="text-[0.8125rem] text-saffron-deep">Prices shown are sample prices for this preview.</p>}
            <button type="button" onClick={proceed} className="w-full rounded-full bg-char px-6 py-4 font-mono text-label text-ivory uppercase transition-colors hover:bg-saffron-deep">
              Proceed to checkout
            </button>
            <div role="status" aria-live="polite">
              {notConnected && (
                <div className="rounded-[4px] bg-sand/40 p-4 text-[0.875rem] text-char/85 ring-1 ring-sand">
                  <p className="font-medium">Online checkout isn’t connected yet.</p>
                  <p className="mt-1">No order has been placed and no payment taken. Your cart is saved on this device.</p>
                  {(brand.contact.whatsapp || brand.contact.email) && (
                    <p className="mt-3 flex flex-wrap gap-3">
                      {brand.contact.whatsapp && (
                        <a className="underline underline-offset-4" href={`https://wa.me/${brand.contact.whatsapp}?text=${enquiry}`} target="_blank" rel="noreferrer">
                          Send this order by WhatsApp
                        </a>
                      )}
                      {brand.contact.email && (
                        <a className="underline underline-offset-4" href={`mailto:${brand.contact.email}?subject=${encodeURIComponent('Order enquiry')}&body=${enquiry}`}>
                          Send by email
                        </a>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {step === 'details' && lines.length > 0 && (
        <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 px-5 py-5">
            {field('name', 'Full name', {autoComplete: 'name', 'data-autofocus': true})}
            <div className="grid gap-3 sm:grid-cols-2">
              {field('phone', 'Mobile', {autoComplete: 'tel-national', inputMode: 'numeric', placeholder: '10 digits'})}
              {field('email', 'Email', {type: 'email', autoComplete: 'email'})}
            </div>
            {field('line1', 'Address', {autoComplete: 'address-line1', placeholder: 'House / flat, street'})}
            {field('line2', 'Area / landmark (optional)', {autoComplete: 'address-line2'})}
            <div className="grid grid-cols-2 gap-3">
              {field('city', 'City', {autoComplete: 'address-level2'})}
              {field('pincode', 'PIN code', {autoComplete: 'postal-code', inputMode: 'numeric'})}
            </div>
            {field('state', 'State', {autoComplete: 'address-level1'})}
          </div>
          <div className="sticky bottom-0 space-y-3 border-t border-char/10 bg-ivory px-5 pt-5 pb-6">
            <Totals subtotal={subtotal} shipping={shippingFee} total={total} />
            <p className="text-[0.75rem] text-char/55">The final amount is confirmed by the store before payment opens.</p>
            <button type="submit" disabled={busy} className="w-full rounded-full bg-char px-6 py-4 font-mono text-label text-ivory uppercase transition-colors hover:bg-saffron-deep disabled:opacity-60">
              {busy ? 'Opening secure payment…' : `Pay ${formatPaise(total)}`}
            </button>
            <div role="status" aria-live="polite">
              {problem && <p className="rounded-[4px] bg-saffron/10 p-3 text-[0.875rem] text-saffron-deep ring-1 ring-saffron/30">{problem}</p>}
            </div>
            <p className="text-center font-mono text-[0.625rem] tracking-[0.12em] text-char/45 uppercase">Payments secured by Razorpay · UPI · Cards · Netbanking</p>
          </div>
        </form>
      )}
    </Drawer>
  );
}

function Totals({subtotal, shipping, total}: {subtotal: number; shipping: number; total: number}) {
  return (
    <dl className="space-y-1">
      <div className="flex items-baseline justify-between text-[0.875rem] text-char/70">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPaise(subtotal)}</dd>
      </div>
      <div className="flex items-baseline justify-between text-[0.875rem] text-char/70">
        <dt>Delivery</dt>
        <dd className="tabular-nums">{shipping > 0 ? formatPaise(shipping) : 'Free'}</dd>
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <dt className="font-mono text-label text-char/60 uppercase">Total</dt>
        <dd className="font-display text-[1.875rem] font-medium tabular-nums">{formatPaise(total)}</dd>
      </div>
    </dl>
  );
}
