import {useEffect, useRef, type ReactNode} from 'react';
import {lockScroll} from '../lib/scroll';

/**
 * Accessible side drawer: modal semantics, focus moves in on open and back
 * to the opener on close, Tab stays inside, Escape and the backdrop close it.
 */
export function Drawer({open, onClose, labelledBy, children, side = 'right'}: {open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; side?: 'right' | 'bottom'}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    lockScroll(true);
    const panel = panelRef.current!;
    (panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
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
      lockScroll(false);
      returnTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="tone-light fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-[fade-in_0.3s_ease-out] bg-ink/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-lenis-prevent
        className={`absolute flex flex-col overflow-y-auto overscroll-contain bg-ivory text-char shadow-[0_0_80px_rgba(0,0,0,0.35)] outline-none ${
          side === 'right'
            ? 'inset-y-0 right-0 w-full max-w-[30rem] animate-[drawer-in_0.45s_var(--ease-out-soft)]'
            : 'inset-x-0 bottom-0 max-h-[92svh] animate-[toast-in_0.4s_var(--ease-out-soft)] rounded-t-2xl'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({onClick, label = 'Close'}: {onClick: () => void; label?: string}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex size-11 items-center justify-center rounded-full text-char transition-colors hover:bg-char/8">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
