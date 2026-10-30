import {useEffect, useMemo, useState} from 'react';
import type {OrderStatus} from '../../lib/db';
import {formatPaise} from '../../lib/money';
import {nextStatuses, statusLabel, type AdminApi, type OrderWithItems} from '../api';
import {Button, Confirm, Field, PageHeader, Sheet, StatusBadge, fmtDate, inputCls, useToast} from '../ui';

const FILTERS: {id: string; label: string; match: (s: OrderStatus) => boolean}[] = [
  {id: 'todo', label: 'To pack', match: (s) => s === 'paid'},
  {id: 'packed', label: 'Packed', match: (s) => s === 'packed'},
  {id: 'shipped', label: 'Shipped', match: (s) => s === 'shipped'},
  {id: 'delivered', label: 'Delivered', match: (s) => s === 'delivered'},
  {id: 'unpaid', label: 'Unpaid', match: (s) => s === 'pending_payment' || s === 'payment_failed'},
  {id: 'issues', label: 'Needs check', match: (s) => s === 'payment_review'},
  {id: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled'},
  {id: 'all', label: 'All', match: () => true},
];

export function Orders({api, orders, reload, openId, setOpenId}: {api: AdminApi; orders: OrderWithItems[]; reload: () => Promise<void>; openId: string | null; setOpenId: (id: string | null) => void}) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, orders.filter((o) => f.match(o.status)).length])), [orders]);
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const term = q.trim().toLowerCase().replace(/^#/, '');
    return orders.filter((o) => f.match(o.status) && (!term || String(o.number).includes(term) || o.customer.name.toLowerCase().includes(term) || o.customer.phone.includes(term) || o.customer.email.toLowerCase().includes(term)));
  }, [orders, filter, q]);
  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Orders" subtitle="Pack, ship and track every order." actions={<Button onClick={() => void reload()}>Refresh</Button>} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter orders" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="shrink-0 rounded-full px-3.5 py-2 text-[0.8125rem] ring-1 ring-char/15 aria-pressed:bg-char aria-pressed:text-ivory aria-pressed:ring-char"
            >
              {f.label} <span className="opacity-60">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order #, name, phone" aria-label="Search orders" className={`${inputCls} lg:max-w-[18rem]`} />
      </div>

      <div className="overflow-hidden rounded-[10px] bg-white ring-1 ring-char/8">
        {shown.length === 0 ? (
          <p className="p-10 text-center text-[0.875rem] text-char/55">No orders here.</p>
        ) : (
          <table className="w-full text-left text-[0.875rem]">
            <thead className="border-b border-char/8 text-[0.75rem] text-char/55 max-md:hidden">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-char/8">
              {shown.map((o) => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer hover:bg-char/3 max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:px-4 max-md:py-3">
                  <td className="px-4 py-3 max-md:p-0">
                    <button type="button" onClick={() => setOpenId(o.id)} className="font-mono font-medium hover:underline">
                      #{o.number}
                    </button>
                    <span className="block text-[0.75rem] text-char/55">{fmtDate(o.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 max-md:col-start-1 max-md:p-0">
                    <span className="block font-medium">{o.customer.name}</span>
                    <span className="block text-[0.75rem] text-char/55">
                      {o.customer.city} · {o.customer.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-char/70 max-md:hidden">{o.items.reduce((n, i) => n + i.qty, 0)} items</td>
                  <td className="px-4 py-3 max-md:col-start-2 max-md:row-start-1 max-md:p-0 max-md:text-right">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-2 max-md:p-0">{formatPaise(o.total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <OrderSheet key={open?.id} api={api} order={open} onClose={() => setOpenId(null)} reload={reload} />
    </>
  );
}

function OrderSheet({api, order, onClose, reload}: {api: AdminApi; order: OrderWithItems | null; onClose: () => void; reload: () => Promise<void>}) {
  const toast = useToast();
  const [tracking, setTracking] = useState(order?.tracking ?? '');
  const [note, setNote] = useState(order?.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setTracking(order?.tracking ?? '');
    setNote(order?.admin_note ?? '');
  }, [order?.tracking, order?.admin_note]);

  if (!order) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const c = order.customer;
  const address = [c.name, c.line1, c.line2, `${c.city}, ${c.state} ${c.pincode}`, `Phone: ${c.phone}`].filter(Boolean).join('\n');

  const save = async (status?: OrderStatus) => {
    setBusy(true);
    try {
      await api.updateOrder(order.id, {tracking: tracking.trim(), admin_note: note.trim(), ...(status ? {status} : {})});
      await reload();
      toast(status ? `Order #${order.number} marked ${statusLabel[status].toLowerCase()}.` : 'Order saved.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const moves = nextStatuses[order.status].filter((s) => s !== 'cancelled');
  const canCancel = nextStatuses[order.status].includes('cancelled');
  const wasPaid = ['paid', 'packed', 'payment_review'].includes(order.status);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Order #${order.number}`}
      footer={
        <>
          {canCancel && (
            <Button variant="danger" disabled={busy} onClick={() => setConfirmCancel(true)} className="mr-auto">
              Cancel order
            </Button>
          )}
          <Button disabled={busy} onClick={() => void save()}>
            Save notes
          </Button>
          {moves.map((s) => (
            <Button key={s} variant="primary" disabled={busy} onClick={() => void save(s)}>
              Mark {statusLabel[s].toLowerCase()}
            </Button>
          ))}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
        <span className="text-[0.8125rem] text-char/55">Placed {fmtDate(order.created_at)}</span>
        {order.paid_at && <span className="text-[0.8125rem] text-char/55">· Paid {fmtDate(order.paid_at)}</span>}
      </div>
      {order.status === 'payment_review' && (
        <p className="mt-4 rounded-[8px] bg-[#f5d9d2] p-3 text-[0.8125rem] text-[#9b2c1f]">The amount received didn’t match this order’s total. Check payment {order.razorpay_payment_id} in your Razorpay dashboard before sending anything.</p>
      )}

      <h3 className="mt-6 mb-2 text-[0.75rem] font-medium tracking-wide text-char/55 uppercase">Items</h3>
      <ul className="divide-y divide-char/8 rounded-[8px] bg-white ring-1 ring-char/8">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[0.9375rem]">
            <span>
              <span className="font-medium">{i.qty} ×</span> {i.product_name} <span className="text-char/55">· {i.variant_label}</span>
            </span>
            <span className="font-mono tabular-nums">{formatPaise(i.line_total_paise)}</span>
          </li>
        ))}
        <li className="space-y-1 px-4 py-3 text-[0.875rem]">
          <div className="flex justify-between text-char/65">
            <span>Subtotal</span>
            <span className="font-mono">{formatPaise(order.subtotal_paise)}</span>
          </div>
          <div className="flex justify-between text-char/65">
            <span>Delivery</span>
            <span className="font-mono">{order.shipping_paise ? formatPaise(order.shipping_paise) : 'Free'}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="font-mono">{formatPaise(order.total_paise)}</span>
          </div>
        </li>
      </ul>

      <h3 className="mt-6 mb-2 text-[0.75rem] font-medium tracking-wide text-char/55 uppercase">Deliver to</h3>
      <div className="rounded-[8px] bg-white p-4 text-[0.9375rem] ring-1 ring-char/8">
        <p className="whitespace-pre-line">{address}</p>
        <p className="mt-1 text-char/60">{c.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              navigator.clipboard?.writeText(address).then(
                () => toast('Address copied.'),
                () => toast('Copy failed — select the text instead.', 'error'),
              )
            }
          >
            Copy address
          </Button>
          <a href={`tel:+91${c.phone}`} className="inline-flex min-h-10 items-center rounded-[6px] px-4 text-[0.875rem] ring-1 ring-char/15 hover:ring-char/40">
            Call
          </a>
          <a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hello ${c.name}, about your order #${order.number}:`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-[6px] px-4 text-[0.875rem] ring-1 ring-char/15 hover:ring-char/40">
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Field label="Courier / tracking reference" hint="Shown only here, for your records.">
          {(id, d) => <input id={id} aria-describedby={d} value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} placeholder="e.g. DTDC Z12345678" />}
        </Field>
        <Field label="Private note">
          {(id) => <textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} />}
        </Field>
      </div>

      {order.razorpay_payment_id && <p className="mt-6 font-mono text-[0.75rem] text-char/50">Razorpay payment: {order.razorpay_payment_id}</p>}

      <Confirm
        open={confirmCancel}
        danger
        title={`Cancel order #${order.number}?`}
        body={wasPaid ? <>The customer has paid. Cancelling here <strong>does not refund them</strong> — issue the refund from your Razorpay dashboard as well.</> : 'This order was never paid. It will be marked cancelled.'}
        confirmLabel="Cancel order"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void save('cancelled');
        }}
      />
    </Sheet>
  );
}
