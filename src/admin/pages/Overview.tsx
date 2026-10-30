import {useMemo} from 'react';
import type {ProductRow, VariantRow} from '../../lib/db';
import {formatPaise} from '../../lib/money';
import {PAID_STATUSES, type OrderWithItems} from '../api';
import {Button, Card, PageHeader, StatusBadge, fmtDate} from '../ui';

export function Overview({orders, products, variants, go, openOrder, refresh}: {orders: OrderWithItems[]; products: ProductRow[]; variants: VariantRow[]; go: (tab: 'orders' | 'products') => void; openOrder: (id: string) => void; refresh: () => void}) {
  const stats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay);
    startOfMonth.setDate(1);
    const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
    return {
      today: paid.filter((o) => new Date(o.paid_at ?? o.created_at) >= startOfDay).length,
      month: paid.filter((o) => new Date(o.paid_at ?? o.created_at) >= startOfMonth).reduce((s, o) => s + o.total_paise, 0),
      toPack: orders.filter((o) => o.status === 'paid').length,
      toShip: orders.filter((o) => o.status === 'packed').length,
      review: orders.filter((o) => o.status === 'payment_review').length,
    };
  }, [orders]);

  const stockAlerts = variants
    .filter((v) => v.active && v.stock_status !== 'in_stock')
    .map((v) => ({v, p: products.find((p) => p.id === v.product_id)}))
    .filter((x) => x.p?.active);

  return (
    <>
      <PageHeader title="Overview" subtitle="Your shop at a glance." actions={<Button onClick={refresh}>Refresh</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Paid orders today" value={String(stats.today)} />
        <Stat label="Sales this month" value={formatPaise(stats.month)} hint="Paid, packed, shipped & delivered" />
        <Stat label="Waiting to be packed" value={String(stats.toPack)} action={stats.toPack > 0 ? () => go('orders') : undefined} highlight={stats.toPack > 0} />
        <Stat label="Packed, waiting to ship" value={String(stats.toShip)} action={stats.toShip > 0 ? () => go('orders') : undefined} />
      </div>

      {stats.review > 0 && (
        <p className="mt-4 rounded-[8px] bg-[#f5d9d2] p-4 text-[0.875rem] text-[#9b2c1f]">
          {stats.review} order{stats.review > 1 ? 's need' : ' needs'} a payment check — the amount paid didn’t match the order total. Compare it with your Razorpay dashboard.
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[1.375rem] font-medium">Latest orders</h2>
            <Button variant="ghost" onClick={() => go('orders')}>
              All orders →
            </Button>
          </div>
          {orders.length === 0 ? (
            <p className="py-6 text-center text-[0.875rem] text-char/55">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-char/8">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => openOrder(o.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-char/3">
                    <span className="w-14 font-mono text-[0.8125rem] text-char/60">#{o.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">{o.customer.name}</span>
                      <span className="block text-[0.75rem] text-char/55">{fmtDate(o.created_at)}</span>
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="w-20 text-right font-mono text-[0.875rem] tabular-nums">{formatPaise(o.total_paise)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[1.375rem] font-medium">Stock alerts</h2>
            <Button variant="ghost" onClick={() => go('products')}>
              Products →
            </Button>
          </div>
          {stockAlerts.length === 0 ? (
            <p className="py-6 text-center text-[0.875rem] text-char/55">Everything visible is in stock.</p>
          ) : (
            <ul className="space-y-2">
              {stockAlerts.map(({v, p}) => (
                <li key={v.id} className="flex items-center justify-between gap-3 text-[0.875rem]">
                  <span className="min-w-0 truncate">
                    {p!.name} · <span className="text-char/60">{v.label}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-medium ${v.stock_status === 'out_of_stock' ? 'bg-[#f5d9d2] text-[#9b2c1f]' : 'bg-[#f6e3c4] text-saffron-deep'}`}>
                    {v.stock_status === 'out_of_stock' ? 'Out of stock' : `Low${v.stock_qty !== null ? ` · ${v.stock_qty} left` : ''}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({label, value, hint, action, highlight = false}: {label: string; value: string; hint?: string; action?: () => void; highlight?: boolean}) {
  const body = (
    <>
      <span className="block text-[0.8125rem] text-char/60">{label}</span>
      <span className={`mt-2 block font-display text-[2.25rem] leading-none font-medium tabular-nums ${highlight ? 'text-saffron-deep' : ''}`}>{value}</span>
      {hint && <span className="mt-1.5 block text-[0.6875rem] text-char/45">{hint}</span>}
    </>
  );
  return action ? (
    <button type="button" onClick={action} className="rounded-[10px] bg-white p-5 text-left ring-1 ring-char/8 transition-shadow hover:ring-char/25">
      {body}
    </button>
  ) : (
    <div className="rounded-[10px] bg-white p-5 ring-1 ring-char/8">{body}</div>
  );
}
