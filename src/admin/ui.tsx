import {createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref} from 'react';
import type {OrderStatus} from '../lib/db';
import {statusLabel} from './api';

/* Buttons ------------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({variant = 'secondary', className = '', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: Variant; ref?: Ref<HTMLButtonElement>}) {
  const styles: Record<Variant, string> = {
    primary: 'bg-char text-ivory hover:bg-saffron-deep',
    secondary: 'bg-white text-char ring-1 ring-char/15 hover:ring-char/40',
    danger: 'bg-white text-[#9b2c1f] ring-1 ring-[#9b2c1f]/30 hover:bg-[#9b2c1f] hover:text-white',
    ghost: 'text-char/70 hover:bg-char/6 hover:text-char',
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] px-4 text-[0.875rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}

/* Form fields -------------------------------------------------------------- */

export function Field({label, hint, error, children}: {label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-char/80">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-[0.75rem] text-char/55">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1 text-[0.75rem] text-[#9b2c1f]">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  'w-full rounded-[6px] bg-white px-3 py-2.5 text-[0.9375rem] text-char ring-1 ring-char/15 outline-none placeholder:text-char/35 focus:ring-2 focus:ring-saffron-deep aria-[invalid=true]:ring-[#9b2c1f]';

/** Rupees in, paise out. Accepts "199", "199.5", "1,299.00". */
export function parseRupees(s: string): number | null {
  const t = s.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}
export const paiseToInput = (p: number | null | undefined) => (p == null ? '' : p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2));

export function Toggle({checked, onChange, label, description}: {checked: boolean; onChange: (v: boolean) => void; label: string; description?: string}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-10 rounded-full bg-char/20 transition-colors peer-checked:bg-olive peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-saffron-deep" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-[0.875rem] font-medium">{label}</span>
        {description && <span className="block text-[0.75rem] text-char/55">{description}</span>}
      </span>
    </label>
  );
}

/* Badges ------------------------------------------------------------------- */

const statusTone: Record<OrderStatus, string> = {
  pending_payment: 'bg-char/8 text-char/70',
  payment_failed: 'bg-char/8 text-char/55',
  payment_review: 'bg-[#f5d9d2] text-[#9b2c1f]',
  paid: 'bg-[#f6e3c4] text-saffron-deep',
  packed: 'bg-[#e9e3d2] text-[#5e5a35]',
  shipped: 'bg-[#dde7f0] text-[#2c4f6e]',
  delivered: 'bg-[#dfe9d8] text-[#3c5a2c]',
  cancelled: 'bg-char/8 text-char/50 line-through',
};
export function StatusBadge({status}: {status: OrderStatus}) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium whitespace-nowrap ${statusTone[status]}`}>{statusLabel[status]}</span>;
}

/* Modal / sheet ------------------------------------------------------------ */

export function Sheet({open, onClose, title, children, footer, wide = false}: {open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    (panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel).focus();
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key !== 'Tab') return;
      const f = panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-full flex-col bg-ivory shadow-2xl outline-none ${wide ? 'max-w-[52rem]' : 'max-w-[34rem]'} animate-[drawer-in_0.3s_var(--ease-out-soft)]`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-char/10 px-5 py-3">
          <h2 id={titleId} className="truncate font-display text-[1.625rem] font-medium">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-char/8">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-char/10 bg-ivory px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({open, title, body, confirmLabel, onConfirm, onCancel, danger = false}: {open: boolean; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="relative w-full max-w-[26rem] rounded-[10px] bg-ivory p-6 shadow-2xl">
        <h2 id="confirm-title" className="font-display text-[1.5rem] font-medium">
          {title}
        </h2>
        <div className="mt-2 text-[0.9375rem] text-char/75">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={ref} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Toasts ------------------------------------------------------------------- */

type ToastMsg = {id: number; text: string; tone: 'ok' | 'error'};
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, {id, text, tone}]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-[30rem] animate-[toast-in_0.3s_var(--ease-out-soft)] rounded-[8px] px-4 py-3 text-[0.875rem] shadow-lg ${t.tone === 'error' ? 'bg-[#9b2c1f] text-white' : 'bg-char text-ivory'}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* Misc --------------------------------------------------------------------- */

export function Card({children, className = ''}: {children: ReactNode; className?: string}) {
  return <section className={`rounded-[10px] bg-white p-5 ring-1 ring-char/8 ${className}`}>{children}</section>;
}

export function PageHeader({title, subtitle, actions}: {title: string; subtitle?: string; actions?: ReactNode}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.25rem] leading-none font-medium">{title}</h1>
        {subtitle && <p className="mt-2 text-[0.875rem] text-char/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'});
