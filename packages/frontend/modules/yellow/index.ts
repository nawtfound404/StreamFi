// Browser-only mock for a simple orderbook and drifting price.
// This keeps the Markets page functional without external APIs.

type Side = 'buy' | 'sell';
type Order = {
  id: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  type: 'limit' | 'market';
  ts: number;
};
type OrderBook = { bids: Order[]; asks: Order[] };

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';
const keyOb = (symbol: string) => `yellow:orderbook:${symbol}`;
const keyPx = (symbol: string) => `yellow:price:${symbol}`;

function getLS<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLS<T>(key: string, val: T) {
  if (!isBrowser()) return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function hashSymbol(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function now() { return Date.now(); }

function getPrice(symbol: string): { price: number; ts: number } {
  const rec = getLS<{ price: number; ts: number }>(keyPx(symbol), { price: 0, ts: 0 });
  const dt = now() - rec.ts;
  if (rec.price > 0 && dt < 5_000) return rec; // reuse within 5s

  const base = rec.price > 0 ? rec.price : (hashSymbol(symbol) % 50_000) + 10_000; // seed 10k-60k
  // random walk +/- 0.5%
  const drift = (Math.random() - 0.5) * 0.01;
  const next = Math.max(1, +(base * (1 + drift)).toFixed(2));
  const updated = { price: next, ts: now() };
  setLS(keyPx(symbol), updated);
  return updated;
}

function getOrderBook(symbol: string): OrderBook {
  return getLS<OrderBook>(keyOb(symbol), { bids: [], asks: [] });
}

function setOrderBook(symbol: string, ob: OrderBook) {
  // Keep top 100 for each side
  const clip = {
    bids: ob.bids.slice(0, 100),
    asks: ob.asks.slice(0, 100)
  };
  setLS(keyOb(symbol), clip);
}

function genId() { return Math.random().toString(36).slice(2) + now().toString(36); }

export const yellow = {
  async market(symbol: string) {
    const { price, ts } = getPrice(symbol);
    const ob = getOrderBook(symbol);
    // Ensure sorted: bids desc, asks asc
    ob.bids.sort((a, b) => b.price - a.price || a.ts - b.ts);
    ob.asks.sort((a, b) => a.price - b.price || a.ts - b.ts);
    return { symbol, price, bids: ob.bids, asks: ob.asks, ts };
  },

  async placeOrder(params: {
    symbol: string; side: Side; quantity: string | number; price?: number; type?: 'limit' | 'market'
  }) {
    const symbol = params.symbol;
    const side = params.side;
    const qty = typeof params.quantity === 'string' ? parseFloat(params.quantity) : params.quantity;
    const type = params.type ?? (params.price ? 'limit' : 'market');
    if (!symbol || !side || !qty || qty <= 0) return { ok: false, message: 'Invalid order' } as const;

    const ob = getOrderBook(symbol);
    const pxRec = getPrice(symbol);
    const px = typeof params.price === 'number' && params.price > 0 ? params.price : pxRec.price;

    const order: Order = { id: genId(), symbol, side, quantity: +qty.toFixed(6), price: +px.toFixed(2), type, ts: now() };
    if (side === 'buy') {
      ob.bids.push(order);
      ob.bids.sort((a, b) => b.price - a.price || a.ts - b.ts);
    } else {
      ob.asks.push(order);
      ob.asks.sort((a, b) => a.price - b.price || a.ts - b.ts);
    }
    setOrderBook(symbol, ob);
    return { ok: true, order } as const;
  },

  // Optional: clear book for a symbol (dev helper)
  async reset(symbol: string) {
    setOrderBook(symbol, { bids: [], asks: [] });
    setLS(keyPx(symbol), { price: 0, ts: 0 });
    return { ok: true } as const;
  }
};
