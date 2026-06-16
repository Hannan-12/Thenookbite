'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPKR } from '@/lib/format';
import { elapsed, elapsedColor, useStopwatchTick } from '@/lib/useStopwatch';

interface OrderItem { item_name: string; quantity: number; item_price: number; }
interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  table_number: string | null;
  total: number;
  payment_method: string;
  special_notes: string | null;
  created_at: string;
  order_type: string | null;
  delivery_address: string | null;
  order_items: OrderItem[];
}

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function VerifyDisplay() {
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [riderInputId, setRiderInputId] = useState<string | null>(null);
  const [riderName, setRiderName]     = useState('');
  const [reconnect, setReconnect]   = useState(false);
  const supabaseRef  = useRef(createClient());
  const isFirst      = useRef(true);
  const time = useClock();
  useStopwatchTick();

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/verify');
    if (!res.ok) return;
    setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    const poll = setInterval(fetch_, 5000);

    const channel = supabaseRef.current
      .channel('verify-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetch_())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !isFirst.current) {
          setReconnect(true);
          fetch_().then(() => setTimeout(() => setReconnect(false), 4000));
        }
        isFirst.current = false;
      });

    return () => { clearInterval(poll); supabaseRef.current.removeChannel(channel); };
  }, [fetch_]);

  async function approve(id: string, rider?: string) {
    setActioningId(id);
    await fetch('/api/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', rider_name: rider || undefined }),
    });
    setOrders(prev => prev.filter(o => o.id !== id));
    setActioningId(null);
    setRiderInputId(null);
    setRiderName('');
  }

  async function reject(id: string) {
    setActioningId(id);
    await fetch('/api/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject', reject_reason: rejectReason || undefined }),
    });
    setOrders(prev => prev.filter(o => o.id !== id));
    setActioningId(null);
    setRejectId(null);
    setRejectReason('');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono select-none flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-black border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#E4002B] text-white font-heading text-xl px-4 py-2 tracking-widest">TNB</div>
          <div>
            <p className="text-white/30 text-xs tracking-[0.3em]">ORDER VERIFICATION</p>
            <p className="text-white/15 text-[10px] tracking-widest mt-0.5">APPROVE ONLINE ORDERS BEFORE THEY REACH KITCHEN</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {reconnect && <span className="text-yellow-400 text-xs tracking-widest animate-pulse">SYNCING…</span>}
          <div className="text-right">
            <p className="text-white/30 text-sm tabular-nums">{time}</p>
            <p className="text-white/15 text-[10px] tracking-widest mt-0.5">
              {orders.length} PENDING VERIFICATION
            </p>
          </div>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/30 text-xs tracking-widest">LIVE</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-white/20 text-xl tracking-widest animate-pulse">LOADING…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-white/20 text-lg tracking-widest">ALL CLEAR — NO ORDERS WAITING</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-min">
            {orders.map(order => (
              <div key={order.id} className="border border-orange-500/30 bg-orange-500/5 rounded-sm overflow-hidden flex flex-col">

                {/* Card header */}
                <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-heading text-xl text-white tracking-widest">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="font-heading text-[10px] tracking-widest px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 text-orange-400 rounded-sm">
                        ONLINE
                      </span>
                      {order.order_type === 'delivery' && (
                        <span className="font-heading text-[10px] tracking-widest px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-sm">
                          DELIVERY
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm">{order.customer_name}</p>
                    <p className="text-white/30 text-xs mt-0.5">{order.customer_phone}</p>
                    {order.table_number && (
                      <p className="text-white/20 text-xs mt-0.5 tracking-wider">TABLE {order.table_number}</p>
                    )}
                    {order.delivery_address && (
                      <p className="text-blue-300/60 text-xs mt-1">📍 {order.delivery_address}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${elapsedColor(order.created_at)}`}>
                      ⏱ {elapsed(order.created_at)}
                    </p>
                    <p className="text-white/30 text-xs mt-1">{order.payment_method.toUpperCase()}</p>
                    <p className="font-heading text-white text-base mt-1">{formatPKR(order.total)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 py-3 flex-1 space-y-2">
                  {order.order_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-white font-bold text-lg leading-none min-w-[2rem] tabular-nums">
                        {item.quantity}×
                      </span>
                      <span className="text-white/80 text-sm leading-snug">{item.item_name}</span>
                      <span className="ml-auto text-white/30 text-xs font-heading flex-shrink-0">
                        {formatPKR(item.item_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Special notes */}
                {order.special_notes && (
                  <div className="px-5 pb-3">
                    <p className="text-yellow-300/80 text-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 rounded-sm">
                      ⚠ {order.special_notes}
                    </p>
                  </div>
                )}

                {/* Reject reason input */}
                {rejectId === order.id && (
                  <div className="px-5 pb-3">
                    <input
                      autoFocus
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason (optional)…"
                      className="w-full bg-black/40 border border-red-500/30 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/60 rounded-sm"
                      onKeyDown={e => { if (e.key === 'Enter') reject(order.id); if (e.key === 'Escape') { setRejectId(null); setRejectReason(''); } }}
                    />
                  </div>
                )}

                {/* Rider name input — shown when approving a delivery order */}
                {riderInputId === order.id && (
                  <div className="px-5 pb-3">
                    <p className="text-blue-400/60 text-[10px] tracking-widest mb-1.5">ASSIGN RIDER</p>
                    <input
                      autoFocus
                      value={riderName}
                      onChange={e => setRiderName(e.target.value)}
                      placeholder="Rider name…"
                      className="w-full bg-black/40 border border-blue-500/40 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400 rounded-sm"
                      onKeyDown={e => { if (e.key === 'Enter') approve(order.id, riderName); if (e.key === 'Escape') { setRiderInputId(null); setRiderName(''); } }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-5 pb-5 flex gap-2">
                  {rejectId === order.id ? (
                    <>
                      <button
                        onClick={() => reject(order.id)}
                        disabled={actioningId === order.id}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-heading text-sm tracking-widest text-white transition-colors rounded-sm"
                      >
                        {actioningId === order.id ? 'REJECTING…' : 'CONFIRM REJECT'}
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(''); }}
                        className="px-4 py-3 border border-white/10 text-white/30 hover:text-white font-heading text-xs tracking-widest transition-colors rounded-sm"
                      >
                        CANCEL
                      </button>
                    </>
                  ) : riderInputId === order.id ? (
                    <>
                      <button
                        onClick={() => approve(order.id, riderName)}
                        disabled={actioningId === order.id}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 font-heading text-sm tracking-widest text-white transition-colors rounded-sm"
                      >
                        {actioningId === order.id ? 'APPROVING…' : '✓ CONFIRM APPROVE'}
                      </button>
                      <button
                        onClick={() => { setRiderInputId(null); setRiderName(''); }}
                        className="px-4 py-3 border border-white/10 text-white/30 hover:text-white font-heading text-xs tracking-widest transition-colors rounded-sm"
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (order.order_type === 'delivery') {
                            setRiderInputId(order.id);
                          } else {
                            approve(order.id);
                          }
                        }}
                        disabled={actioningId === order.id}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 font-heading text-sm tracking-widest text-white transition-colors rounded-sm"
                      >
                        {actioningId === order.id ? 'APPROVING…' : '✓ APPROVE'}
                      </button>
                      <button
                        onClick={() => setRejectId(order.id)}
                        disabled={actioningId === order.id}
                        className="flex-1 py-3 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 disabled:opacity-50 font-heading text-sm tracking-widest text-red-400 transition-colors rounded-sm"
                      >
                        ✕ REJECT
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
