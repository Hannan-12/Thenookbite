'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  customer_name: string;
  table_number: string | null;
  status: string;
  created_at: string;
}

function useOrders() {
  const [preparing, setPreparing] = useState<Order[]>([]);
  const [ready, setReady]         = useState<Order[]>([]);
  const [reconnect, setReconnect] = useState(false);
  const [collecting, setCollecting] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());
  const isFirst     = useRef(true);

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/display');
    if (!res.ok) return;
    const rows: Order[] = await res.json();
    setPreparing(rows.filter(o => o.status === 'preparing'));
    setReady(rows.filter(o => o.status === 'ready'));
  }, []);

  const markCollected = useCallback(async (id: string) => {
    setCollecting(prev => new Set(prev).add(id));
    setReady(prev => prev.filter(o => o.id !== id));
    try {
      await fetch('/api/display', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } finally {
      setCollecting(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  useEffect(() => {
    fetch_();

    // Poll every 5s as fallback in case Realtime misses an event
    const poll = setInterval(fetch_, 5000);

    const channel = supabaseRef.current
      .channel('order-status-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetch_();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !isFirst.current) {
          setReconnect(true);
          fetch_().then(() => setTimeout(() => setReconnect(false), 4000));
        }
        isFirst.current = false;
      });

    return () => {
      clearInterval(poll);
      supabaseRef.current.removeChannel(channel);
    };
  }, [fetch_]);

  return { preparing, ready, reconnect, markCollected, collecting };
}

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }));
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function OrderStatusDisplay() {
  const { preparing, ready, reconnect, markCollected, collecting } = useOrders();
  const time = useClock();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono overflow-hidden flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-black border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#E4002B] text-white font-heading text-xl px-4 py-2 tracking-widest">TNB</div>
          <span className="text-white/30 text-sm tracking-[0.3em]">ORDER STATUS</span>
        </div>
        <div className="flex items-center gap-6">
          {reconnect && (
            <span className="text-yellow-400 text-xs tracking-widest animate-pulse">SYNCING…</span>
          )}
          <span className="text-white/30 text-sm">{time}</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/30 text-xs tracking-widest">LIVE</span>
          </span>
        </div>
      </div>

      {/* Two columns */}
      <div className="flex-1 grid grid-cols-2 min-h-0">

        {/* PREPARING */}
        <div className="border-r border-white/10 flex flex-col">
          <div className="px-8 py-5 border-b border-white/10 bg-yellow-500/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
              <span className="font-heading text-yellow-400 text-2xl tracking-[0.3em]">PREPARING</span>
            </div>
            <span className="font-heading text-yellow-400/50 text-xl">{preparing.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {preparing.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/10 text-lg tracking-widest text-center">NO ORDERS PREPARING</p>
              </div>
            ) : (
              preparing.map(order => (
                <OrderTile key={order.id} order={order} variant="preparing" />
              ))
            )}
          </div>
        </div>

        {/* READY */}
        <div className="flex flex-col">
          <div className="px-8 py-5 border-b border-white/10 bg-green-500/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="font-heading text-green-400 text-2xl tracking-[0.3em]">READY TO COLLECT</span>
            </div>
            <span className="font-heading text-green-400/50 text-xl">{ready.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {ready.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/10 text-lg tracking-widest text-center">NO ORDERS READY YET</p>
              </div>
            ) : (
              ready.map(order => (
                <OrderTile
                  key={order.id}
                  order={order}
                  variant="ready"
                  onCollect={() => markCollected(order.id)}
                  collecting={collecting.has(order.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-black border-t border-white/5 flex items-center justify-center flex-shrink-0">
        <p className="text-white/20 text-xs tracking-widest">PLEASE COLLECT YOUR ORDER FROM THE COUNTER WHEN YOUR NUMBER IS CALLED</p>
      </div>
    </div>
  );
}

function OrderTile({
  order,
  variant,
  onCollect,
  collecting,
}: {
  order: Order;
  variant: 'preparing' | 'ready';
  onCollect?: () => void;
  collecting?: boolean;
}) {
  const isReady = variant === 'ready';

  return (
    <div className={`rounded-sm border overflow-hidden ${
      isReady
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-yellow-500/20 bg-yellow-500/5'
    }`}>
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className={`font-heading text-5xl leading-none tracking-widest ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
            #{order.id.slice(-4).toUpperCase()}
          </p>
          <p className="text-white/50 text-base mt-2">{order.customer_name}</p>
          {order.table_number && (
            <p className="text-white/30 text-sm mt-1 tracking-wider">TABLE {order.table_number}</p>
          )}
        </div>

        {isReady && (
          <div className="flex-shrink-0 text-right">
            <div className="bg-green-500/20 border border-green-500/40 rounded-sm px-4 py-3">
              <p className="text-green-400 font-heading text-sm tracking-widest">COLLECT NOW</p>
              <p className="text-green-400/50 text-xs mt-1">AT THE COUNTER</p>
            </div>
          </div>
        )}
      </div>

      {isReady && onCollect && (
        <button
          onClick={onCollect}
          disabled={collecting}
          className="w-full py-3 bg-green-600/80 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-heading text-sm tracking-[0.2em] text-white transition-colors border-t border-green-500/20"
        >
          {collecting ? 'MARKING…' : 'COLLECTED ✓'}
        </button>
      )}
    </div>
  );
}
