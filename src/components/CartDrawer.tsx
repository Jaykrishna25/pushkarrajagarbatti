import {useState} from 'react';
import {brand} from '../data/brand';
import {useShop} from '../hooks/useShop';
import {maxQtyFor} from '../lib/cart';
import {startCheckout, type CheckoutResult} from '../lib/checkout';
import {formatPaise} from '../lib/money';
import {scrollToTarget} from '../lib/scroll';
import {ProductVisual} from './Art';
import {CloseButton, Drawer} from './Drawer';
import {QtyStepper} from './Shop';

type Status = {kind: 'idle'} | {kind: 'busy'} | Exclude<CheckoutResult, {status: 'redirect'}>;

export function CartDrawer() {
  const {cartOpen, setCartOpen, lines, subtotal, count, dispatch, cart} = useShop();
  const [status, setStatus] = useState<Status>({kind: 'idle'});
  const close = () => {
    setCartOpen(false);
    setStatus({kind: 'idle'});
  };

  const checkout = async () => {
    setStatus({kind: 'busy'});
    const result = await startCheckout(cart.lines);
    if (result.status === 'redirect') {
      window.location.assign(result.url);
      return;
    }
    setStatus(result);
  };

  const enquiry = encodeURIComponent(
    `Hello ${brand.shortName}, I'd like to order:\n` + lines.map((l) => `• ${l.qty} × ${l.product.name} (${l.variant.label})`).join('\n'),
  );

  return (
    <Drawer open={cartOpen} onClose={close} labelledBy="cart-title">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-char/10 bg-ivory/90 px-5 py-2 backdrop-blur">
        <h2 id="cart-title" className="font-display text-[1.75rem] font-medium">
          Your cart <span className="font-mono text-label text-char/55">({count})</span>
        </h2>
        <CloseButton onClick={close} label="Close cart" />
      </div>

      {lines.length === 0 ? (
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
      ) : (
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

          <div className="sticky bottom-0 space-y-4 border-t border-char/10 bg-ivory px-5 pt-5 pb-6">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-label text-char/60 uppercase">Subtotal</span>
              <span className="font-display text-[1.875rem] font-medium tabular-nums">{formatPaise(subtotal)}</span>
            </div>
            <p className="text-[0.8125rem] text-char/60">Shipping and any taxes are confirmed at checkout.</p>
            {brand.previewNotice && <p className="text-[0.8125rem] text-saffron-deep">Prices shown are sample prices for this preview.</p>}

            <button
              type="button"
              onClick={checkout}
              disabled={'kind' in status && status.kind === 'busy'}
              className="w-full rounded-full bg-char px-6 py-4 font-mono text-label text-ivory uppercase transition-colors hover:bg-saffron-deep disabled:opacity-60"
            >
              {'kind' in status && status.kind === 'busy' ? 'Connecting…' : 'Proceed to checkout'}
            </button>

            <div role="status" aria-live="polite">
              {'status' in status && status.status === 'not-configured' && (
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
              {'status' in status && status.status === 'error' && <p className="rounded-[4px] bg-saffron/10 p-4 text-[0.875rem] text-saffron-deep ring-1 ring-saffron/30">{status.message}</p>}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
