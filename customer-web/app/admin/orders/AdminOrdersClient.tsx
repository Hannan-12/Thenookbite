'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPKR } from '@/lib/format';
import { elapsed, elapsedColor, useStopwatchTick } from '@/lib/useStopwatch';

type OrderItem = { item_name: string; item_price: number; quantity: number };
type Order = {
  id: string; status: string; payment_method: string; payment_status: string;
  total: number; customer_name: string; table_number: string | null;
  created_at: string; order_items: OrderItem[];
};

const STATUS_TABS = ['all', 'pending', 'preparing', 'ready', 'completed'];

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  preparing: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  ready:     'border-green-500/30 bg-green-500/10 text-green-400',
  completed: 'border-white/10 bg-white/5 text-white/30',
};

export function AdminOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders]   = useState<Order[]>(initialOrders);
  const [filter, setFilter]   = useState('all');
  const [toast, setToast]     = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  useStopwatchTick();

  const fetchOrders = useCallback(async (silent = false) => {
    const { data, error: err } = await supabaseRef.current
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) { setError('Failed to refresh orders'); return; }
    if (data) {
      setOrders(data as Order[]);
      setError(null);
      if (!silent) showToast('Orders updated');
    }
  }, []);

  useEffect(() => {
    // Poll every 30s as safety net
    const poll = setInterval(() => fetchOrders(true), 30000);

    const channel = supabaseRef.current
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => {
      clearInterval(poll);
      supabaseRef.current.removeChannel(channel);
    };
  }, [fetchOrders]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white font-heading text-xs tracking-widest px-4 py-2 rounded-sm shadow-lg">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/5 rounded-sm px-5 py-3">
          <p className="font-heading text-xs tracking-wider text-red-400">⚠ {error}</p>
        </div>
      )}

      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">MANAGE</p>
          <h1 className="font-heading text-3xl text-white">ORDERS</h1>
        </div>
        <button
          onClick={() => fetchOrders(false)}
          className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:border-white/30 hover:text-white rounded-sm transition-colors"
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-shrink-0 font-heading text-xs tracking-widest px-4 py-2 rounded-sm border transition-colors duration-150 ${
              filter === tab
                ? 'bg-[#E4002B] border-[#E4002B] text-white'
                : 'border-white/10 text-white/30 hover:text-white hover:border-white/30'
            }`}
          >
            {tab.toUpperCase()}
            {tab !== 'all' && (
              <span className="ml-2 opacity-60">
                {orders.filter(o => o.status === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-white/20 font-heading text-sm tracking-wider">
          NO ORDERS
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const shortId = order.id.slice(-6).toUpperCase();
            const date = new Date(order.created_at).toLocaleString('en-PK', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block border border-white/5 rounded-sm bg-[#111111] hover:border-white/15 transition-colors duration-150"
              >
                <div className="px-4 sm:px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-heading text-white text-base">#{shortId}</span>
                      <span className={`font-heading text-xs px-2.5 py-1 border rounded-sm ${STATUS_STYLES[order.status]}`}>
                        {order.status.toUpperCase()}
                      </span>
                      {order.table_number && (
                        <span className="font-heading text-xs text-white/30 border border-white/10 px-2 py-0.5 rounded-sm">
                          TABLE {order.table_number}
                        </span>
                      )}
                    </div>
                    <span className="font-heading text-white text-base flex-shrink-0">{formatPKR(order.total)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/30 font-heading tracking-wider flex-wrap">
                    <span>{order.customer_name}</span>
                    <span>•</span>
                    <span>{date}</span>
                    <span>•</span>
                    <span>{order.payment_method.toUpperCase()}</span>
                    {['pending','preparing','ready'].includes(order.status) && (
                      <>
                        <span>•</span>
                        <span className={`tabular-nums font-bold ${elapsedColor(order.created_at)}`}>
                          ⏱ {elapsed(order.created_at)}
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="mt-3 space-y-0.5">
                    {order.order_items?.map((item, i) => (
                      <li key={i} className="text-xs text-white/30">
                        <span className="text-white/50">{item.quantity}×</span> {item.item_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
