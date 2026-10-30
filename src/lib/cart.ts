import {findVariant, isAvailable, type Product, type Variant} from '../data/products';

/**
 * Cart logic: pure functions, no React. The cart stores only identifiers and
 * quantities — prices are always looked up from the catalogue, so a stale or
 * edited localStorage entry can never set its own price.
 */

export const MAX_QTY_DEFAULT = 20;
export const CART_STORAGE_KEY = 'pra-cart-v1';

export type CartLine = {productId: string; variantId: string; qty: number};
export type CartState = {lines: CartLine[]};

export type ResolvedLine = CartLine & {product: Product; variant: Variant; lineTotalPaise: number};

export type CartAction =
  | {type: 'add'; productId: string; variantId: string; qty: number}
  | {type: 'setQty'; productId: string; variantId: string; qty: number}
  | {type: 'remove'; productId: string; variantId: string}
  | {type: 'clear'}
  | {type: 'replace'; state: CartState};

export const maxQtyFor = (v: Variant) => (isAvailable(v) ? Math.min(v.maxQty ?? MAX_QTY_DEFAULT, MAX_QTY_DEFAULT) : 0);

const sameLine = (l: CartLine, productId: string, variantId: string) => l.productId === productId && l.variantId === variantId;

/** Clamp a requested quantity to what the variant allows; 0 means "can't have it". */
export function allowedQty(productId: string, variantId: string, qty: number): number {
  const found = findVariant(productId, variantId);
  if (!found) return 0;
  const q = Math.floor(Number.isFinite(qty) ? qty : 0);
  return Math.max(0, Math.min(q, maxQtyFor(found.variant)));
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => sameLine(l, action.productId, action.variantId));
      const qty = allowedQty(action.productId, action.variantId, (existing?.qty ?? 0) + action.qty);
      if (qty === 0) return state;
      if (existing) {
        return {lines: state.lines.map((l) => (l === existing ? {...l, qty} : l))};
      }
      return {lines: [...state.lines, {productId: action.productId, variantId: action.variantId, qty}]};
    }
    case 'setQty': {
      const qty = allowedQty(action.productId, action.variantId, action.qty);
      if (qty === 0) return {lines: state.lines.filter((l) => !sameLine(l, action.productId, action.variantId))};
      return {lines: state.lines.map((l) => (sameLine(l, action.productId, action.variantId) ? {...l, qty} : l))};
    }
    case 'remove':
      return {lines: state.lines.filter((l) => !sameLine(l, action.productId, action.variantId))};
    case 'clear':
      return {lines: []};
    case 'replace':
      return sanitize(action.state);
  }
}

export function resolveLines(state: CartState): ResolvedLine[] {
  return state.lines.flatMap((l) => {
    const found = findVariant(l.productId, l.variantId);
    if (!found) return [];
    return [{...l, ...found, lineTotalPaise: found.variant.pricePaise * l.qty}];
  });
}

export const subtotalPaise = (lines: ResolvedLine[]) => lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
export const itemCount = (state: CartState) => state.lines.reduce((n, l) => n + l.qty, 0);

/** Re-validate a stored cart against today's catalogue: drops unknown/unavailable lines, clamps quantities. */
export function sanitize(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as CartState).lines)) return {lines: []};
  const lines: CartLine[] = [];
  for (const l of (raw as CartState).lines) {
    if (!l || typeof l.productId !== 'string' || typeof l.variantId !== 'string') continue;
    const qty = allowedQty(l.productId, l.variantId, Number(l.qty));
    if (qty > 0 && !lines.some((x) => sameLine(x, l.productId, l.variantId))) lines.push({productId: l.productId, variantId: l.variantId, qty});
  }
  return {lines};
}

/** Shape-check only — the catalogue may not have loaded yet, so `sanitize` runs later. */
export function loadCart(): CartState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as CartState).lines)) return {lines: []};
    return {
      lines: (raw as CartState).lines
        .filter((l) => l && typeof l.productId === 'string' && typeof l.variantId === 'string' && Number.isInteger(l.qty) && l.qty > 0)
        .slice(0, 50)
        .map((l) => ({productId: l.productId, variantId: l.variantId, qty: Math.min(l.qty, MAX_QTY_DEFAULT)})),
    };
  } catch {
    return {lines: []};
  }
}

export function saveCart(state: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode) — the cart still works for this visit */
  }
}
