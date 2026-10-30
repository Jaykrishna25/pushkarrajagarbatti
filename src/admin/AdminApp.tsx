import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {Logo} from '../components/Art';
import type {ProductRow, VariantRow} from '../lib/db';
import {resetDemo} from '../lib/demoStore';
import {getApi, type AdminApi, type OrderWithItems} from './api';
import {Orders} from './pages/Orders';
import {Overview} from './pages/Overview';
import {Products} from './pages/Products';
import {Settings} from './pages/Settings';
import {Button, Confirm, Field, ToastProvider, inputCls, useToast} from './ui';

type Tab = 'overview' | 'orders' | 'products' | 'settings';
const TABS: {id: Tab; label: string; icon: string}[] = [
  {id: 'overview', label: 'Overview', icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z'},
  {id: 'orders', label: 'Orders', icon: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8'},
  {id: 'products', label: 'Products', icon: 'M12 3c3 4.5 4.6 7.7 4.6 10.3a4.6 4.6 0 0 1-9.2 0C7.4 10.7 9 7.5 12 3Zm0 15v3'},
  {id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1c.7.6 1.4 1 2.2 1.3l.4 2.4h4l.4-2.4c.8-.3 1.5-.7 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z'},
];

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === h) ? h : 'overview';
};

export default function AdminApp() {
  return (
    <ToastProvider>
      <Gate />
    </ToastProvider>
  );
}

function Gate() {
  const [api, setApi] = useState<AdminApi | null>(null);
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const check = useCallback(async (a: AdminApi) => {
    const u = await a.currentUser();
    setUser(u?.email ?? null);
    setAllowed(u ? await a.isAdmin() : null);
  }, []);

  useEffect(() => {
    getApi().then((a) => {
      setApi(a);
      void check(a);
    });
  }, [check]);

  if (!api || user === undefined) return <Splash text="Loading…" />;
  if (!user) return <Login api={api} onDone={() => void check(api)} />;
  if (allowed === false)
    return (
      <Splash text={`${user} isn't an admin of this shop.`}>
        <Button
          onClick={() =>
            void api.signOut().then(() => {
              setUser(null);
              setAllowed(null);
            })
          }
        >
          Sign out
        </Button>
      </Splash>
    );
  if (allowed === null) return <Splash text="Checking access…" />;
  return (
    <Shell
      api={api}
      user={user}
      onSignOut={() =>
        void api.signOut().then(() => {
          setUser(null);
          setAllowed(null);
        })
      }
    />
  );
}

function Splash({text, children}: {text: string; children?: React.ReactNode}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-ivory p-6 text-center text-char">
      <Logo tone="dark" />
      <p className="text-char/70">{text}</p>
      {children}
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="bg-[#f6e3c4] px-4 py-2 text-center text-[0.8125rem] text-saffron-deep">
      <strong>Demo mode</strong> — not connected to a database. Changes are saved only in this browser and show on the website only in this browser. No real orders or payments.
    </div>
  );
}

function Login({api, onDone}: {api: AdminApi; onDone: () => void}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{text: string; tone: 'error' | 'ok'} | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.signIn(email.trim(), password);
      onDone();
    } catch (err) {
      setMsg({text: err instanceof Error ? err.message : 'Sign-in failed.', tone: 'error'});
    } finally {
      setBusy(false);
    }
  };
  const forgot = async () => {
    if (!email.trim()) {
      setMsg({text: 'Enter your email first.', tone: 'error'});
      return;
    }
    try {
      await api.sendPasswordReset(email.trim());
      setMsg({text: 'If that email is an admin account, a reset link is on its way.', tone: 'ok'});
    } catch (err) {
      setMsg({text: err instanceof Error ? err.message : 'Could not send.', tone: 'error'});
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-ivory text-char">
      {api.mode === 'demo' && <DemoBanner />}
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-[24rem]">
          <Logo tone="dark" />
          <h1 className="mt-8 font-display text-[2.25rem] leading-none font-medium">Shop admin</h1>
          {api.mode === 'demo' ? (
            <>
              <p className="mt-3 text-[0.9375rem] text-char/70">Try the panel with sample products and orders. Once Supabase is connected, this screen asks for the owner’s email and password.</p>
              <Button variant="primary" className="mt-6 w-full" onClick={() => void api.signIn('', '').then(onDone)}>
                Open demo
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <Field label="Email">{(id) => <input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />}</Field>
              <Field label="Password">{(id) => <input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />}</Field>
              <Button type="submit" variant="primary" className="w-full" disabled={busy || !email || !password}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
              <button type="button" onClick={() => void forgot()} className="text-[0.8125rem] text-char/60 underline-offset-4 hover:underline">
                Forgot password?
              </button>
            </form>
          )}
          <div role="status" aria-live="polite" className="mt-4 min-h-6">
            {msg && <p className={`text-[0.875rem] ${msg.tone === 'error' ? 'text-[#9b2c1f]' : 'text-olive'}`}>{msg.text}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Shell({api, user, onSignOut}: {api: AdminApi; user: string; onSignOut: () => void}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [catalogue, setCatalogue] = useState<{products: ProductRow[]; variants: VariantRow[]}>({products: [], variants: []});
  const [loaded, setLoaded] = useState(false);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await api.listOrders());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load orders.', 'error');
    }
  }, [api, toast]);
  const loadProducts = useCallback(async () => {
    try {
      setCatalogue(await api.listProducts());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load products.', 'error');
    }
  }, [api, toast]);
  const loadAll = useCallback(async () => {
    await Promise.all([loadOrders(), loadProducts()]);
    setLoaded(true);
  }, [loadOrders, loadProducts]);

  useEffect(() => {
    void loadAll();
    // New orders arrive without a reload.
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadOrders();
    }, 60_000);
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      clearInterval(id);
      window.removeEventListener('hashchange', onHash);
    };
  }, [loadAll, loadOrders]);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({top: 0});
  };
  const toPack = orders.filter((o) => o.status === 'paid').length;

  return (
    <div className="min-h-svh bg-ivory-2 text-char">
      <div className="lg:grid lg:grid-cols-[15rem_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-svh flex-col border-r border-char/8 bg-ivory p-5 lg:flex">
          <Logo tone="dark" />
          <nav aria-label="Admin" className="mt-10 flex flex-col gap-1">
            {TABS.map((t) => (
              <NavButton key={t.id} t={t} active={tab === t.id} onClick={() => go(t.id)} badge={t.id === 'orders' ? toPack : 0} />
            ))}
          </nav>
          <div className="mt-auto space-y-2 text-[0.8125rem]">
            <a href="/" target="_blank" rel="noreferrer" className="block text-char/60 hover:text-char">
              View website ↗
            </a>
            <p className="truncate text-char/50">{user}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="-ml-3" onClick={onSignOut}>
                Sign out
              </Button>
              {api.mode === 'demo' && (
                <Button variant="ghost" onClick={() => setConfirmReset(true)}>
                  Reset demo
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between border-b border-char/8 bg-ivory px-4 py-3 lg:hidden">
          <Logo tone="dark" />
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noreferrer" className="px-2 text-[0.8125rem] text-char/60">
              Website ↗
            </a>
            <Button variant="ghost" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {api.mode === 'demo' && (
            <div className="-mx-4 -mt-6 mb-6 sm:-mx-6 lg:-mx-10 lg:-mt-10">
              <DemoBanner />
            </div>
          )}
          {!loaded ? (
            <p className="py-20 text-center text-char/60">Loading your shop…</p>
          ) : tab === 'overview' ? (
            <Overview
              orders={orders}
              products={catalogue.products}
              variants={catalogue.variants}
              go={go}
              refresh={() => void loadAll()}
              openOrder={(id) => {
                setOpenOrder(id);
                go('orders');
              }}
            />
          ) : tab === 'orders' ? (
            <Orders api={api} orders={orders} reload={loadOrders} openId={openOrder} setOpenId={setOpenOrder} />
          ) : tab === 'products' ? (
            <Products api={api} products={catalogue.products} variants={catalogue.variants} reload={loadProducts} />
          ) : (
            <Settings api={api} user={user} />
          )}
        </main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-char/10 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined} className="relative flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] text-char/55 aria-[current=page]:text-saffron-deep">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
            {t.id === 'orders' && toPack > 0 && <span className="absolute top-1.5 left-[calc(50%+6px)] rounded-full bg-saffron px-1.5 text-[0.625rem] text-white">{toPack}</span>}
          </button>
        ))}
      </nav>

      <Confirm
        open={confirmReset}
        title="Reset the demo?"
        body="Puts back the sample products, settings and orders in this browser."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          location.reload();
        }}
      />
    </div>
  );
}

function NavButton({t, active, onClick, badge}: {t: (typeof TABS)[number]; active: boolean; onClick: () => void; badge: number}) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[0.9375rem] text-char/70 hover:bg-char/5 aria-[current=page]:bg-char aria-[current=page]:text-ivory">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d={t.icon} />
      </svg>
      <span className="flex-1">{t.label}</span>
      {badge > 0 && <span className="rounded-full bg-saffron px-2 text-[0.75rem] text-white">{badge}</span>}
    </button>
  );
}
