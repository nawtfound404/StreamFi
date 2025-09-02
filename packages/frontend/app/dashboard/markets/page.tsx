"use client";
import React from 'react';
import { yellow } from '../../../modules/yellow';

export default function MarketsPage() {
  const [symbol, setSymbol] = React.useState('BTC-USDT');
  const [market, setMarket] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [side, setSide] = React.useState<'buy'|'sell'>('buy');
  const [qty, setQty] = React.useState('0.001');
  const [price, setPrice] = React.useState('');
  const [orderResp, setOrderResp] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMarket = React.useCallback(async () => {
    setLoading(true); setError(null); setOrderResp(null);
    try { const data = await yellow.market(symbol); setMarket(data); }
    catch (e: unknown){ setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [symbol]);

  const place = React.useCallback(async () => {
    setError(null); setOrderResp(null);
    try {
      const resp = await yellow.placeOrder({ symbol, side, quantity: qty, price: price ? Number(price) : undefined, type: price ? 'limit' : 'market' });
      setOrderResp(resp);
    } catch(e: unknown){ setError(e instanceof Error ? e.message : 'Order failed'); }
  }, [price, qty, side, symbol]);

  React.useEffect(() => { fetchMarket(); /* on mount and when symbol changes */ }, [fetchMarket]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Markets</h1>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Symbol</label>
          <input value={symbol} onChange={e=>setSymbol(e.target.value)} className="border rounded px-2 py-1" placeholder="BTC-USDT" />
        </div>
        <button onClick={fetchMarket} className="px-3 py-1 rounded bg-black text-white">Refresh</button>
      </div>
      {loading ? <div>Loading…</div> : error ? <div className="text-red-600">{error}</div> : (
        <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">{market ? JSON.stringify(market, null, 2) : 'No data'}</pre>
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-medium">Place order (demo)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col">
            <label htmlFor="order-side" className="text-sm">Side</label>
            <select id="order-side" title="Order side" value={side} onChange={e=>setSide(e.target.value as 'buy'|'sell')} className="border rounded px-2 py-1">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="order-qty" className="text-sm">Quantity</label>
            <input id="order-qty" placeholder="0.001" title="Order quantity" value={qty} onChange={e=>setQty(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="order-price" className="text-sm">Price (optional for limit)</label>
            <input id="order-price" placeholder="e.g. 60000" title="Order price (optional)" value={price} onChange={e=>setPrice(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div className="flex items-end">
            <button onClick={place} className="px-3 py-1 rounded bg-emerald-600 text-white">Submit</button>
          </div>
        </div>
        {orderResp !== null && (
          <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">{String(JSON.stringify(orderResp, null, 2))}</pre>
        )}
      </div>
    </div>
  );
}
