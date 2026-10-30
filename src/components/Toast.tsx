import {useShop} from '../hooks/useShop';

export function Toast() {
  const {toast, setCartOpen, cartOpen} = useShop();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      {toast && !cartOpen && (
        <div key={toast} className="pointer-events-auto flex max-w-[34rem] animate-[toast-in_0.35s_var(--ease-out-soft)] items-center gap-4 rounded-full bg-char py-2.5 pr-2.5 pl-5 text-[0.875rem] text-ivory shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-gold/30">
          <span className="min-w-0">{toast}</span>
          <button type="button" onClick={() => setCartOpen(true)} className="shrink-0 rounded-full bg-gold px-4 py-2 font-mono text-label text-ink uppercase">
            View cart
          </button>
        </div>
      )}
    </div>
  );
}
