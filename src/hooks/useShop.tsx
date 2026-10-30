import {createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode} from 'react';
import {findVariant} from '../data/products';
import {CART_STORAGE_KEY, cartReducer, itemCount, loadCart, resolveLines, saveCart, subtotalPaise, type CartAction, type CartState, type ResolvedLine} from '../lib/cart';

/**
 * Real application state: cart, which drawer is open, and the add-to-cart
 * toast. Animation never goes through here.
 */

type Shop = {
  cart: CartState;
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  dispatch: (a: CartAction) => void;
  add: (productId: string, variantId: string, qty?: number) => boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  detailId: string | null;
  openDetail: (productId: string | null) => void;
  toast: string | null;
};

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({children}: {children: ReactNode}) {
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => saveCart(cart), [cart]);

  // Another tab changed the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) dispatch({type: 'replace', state: loadCart()});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const add = useCallback(
    (productId: string, variantId: string, qty = 1) => {
      const found = findVariant(productId, variantId);
      if (!found) return false;
      const before = cartRef.current.lines.find((l) => l.productId === productId && l.variantId === variantId)?.qty ?? 0;
      const next = cartReducer(cartRef.current, {type: 'add', productId, variantId, qty});
      const after = next.lines.find((l) => l.productId === productId && l.variantId === variantId)?.qty ?? 0;
      if (after === before) {
        showToast(found.variant.stock === 'out_of_stock' ? `${found.variant.label} is out of stock.` : `You already have the maximum of ${found.product.name} (${found.variant.label}).`);
        return false;
      }
      dispatch({type: 'add', productId, variantId, qty});
      const added = after - before;
      showToast(`Added ${added} × ${found.product.name} · ${found.variant.label}${added < qty ? ' (quantity limited)' : ''}`);
      return true;
    },
    [showToast],
  );

  const value = useMemo<Shop>(() => {
    const lines = resolveLines(cart);
    return {
      cart,
      lines,
      count: itemCount(cart),
      subtotal: subtotalPaise(lines),
      dispatch,
      add,
      cartOpen,
      setCartOpen,
      detailId,
      openDetail: setDetailId,
      toast,
    };
  }, [cart, add, cartOpen, detailId, toast]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
