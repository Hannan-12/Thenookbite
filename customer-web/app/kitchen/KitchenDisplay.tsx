'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  table_number: string | null;
  status: OrderStatus;
  payment_method: string;
  total: number;
  special_notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

function elapsed(created_at: string): string {
  const secs = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function useElapsedTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnectBanner, setReconnectBanner] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isFirstConnect = useRef(true);

  useElapsedTick();

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: true });
      if (err) throw err;
      setOrders((data ?? []) as Order[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const advanceStatus = useCallback(async (id: string, next: OrderStatus) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      const { error: err } = await supabase
        .from('orders')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      if (next === 'ready') {
        setOrders(prev => prev.filter(o => o.id !== id));
      } else {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update order');
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Order;
          if (['pending', 'preparing'].includes(row.status)) {
            const { data } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('id', row.id)
              .single();
            if (data) {
              setOrders(prev =>
                [...prev.filter(o => o.id !== data.id), data as Order]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
              );
            }
          }
        }

        if (payload.eventType === 'UPDATE') {
          const row = payload.new as Order;
          if (['pending', 'preparing'].includes(row.status)) {
            setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: row.status } : o));
          } else {
            setOrders(prev => prev.filter(o => o.id !== row.id));
          }
        }

        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (!isFirstConnect.current) {
            setReconnectBanner(true);
            fetchOrders().then(() => setTimeout(() => setReconnectBanner(false), 5000));
          }
          isFirstConnect.current = false;
          channelRef.current = channel;
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/40 text-2xl font-mono tracking-widest animate-pulse">LOADING ORDERS…</p>
      </div>
    );
  }

  const pending   = orders.filter(o => o.status === 'pending');
  const preparing = orders.filter(o => o.status === 'preparing');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold tracking-widest text-[#E4002B]">TNB</span>
          <span className="text-white/40 text-sm tracking-widest">KITCHEN DISPLAY</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-white/40">
            {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/40 text-xs tracking-widest">LIVE</span>
          </span>
        </div>
      </div>

      {/* Reconnect banner */}
      {reconnectBanner && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-6 py-3 text-yellow-400 text-sm tracking-widest text-center">
          RECONNECTED — SYNCING ORDERS…
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-6 py-3 text-red-400 text-sm tracking-widest flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={fetchOrders} className="underline text-xs tracking-widest hover:text-white">RETRY</button>
        </div>
      )}

      {/* Columns */}
      <div className="grid grid-cols-2 h-[calc(100vh-64px)]">

        {/* PENDING column */}
        <div className="border-r border-white/10 flex flex-col">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <span className="text-yellow-400 text-sm tracking-[0.3em] font-bold">PENDING</span>
            <span className="bg-yellow-400/20 text-yellow-400 text-sm font-bold px-3 py-1 rounded-sm">
              {pending.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pending.length === 0 && (
              <div className="text-white/20 text-center text-sm tracking-widest py-16">NO PENDING ORDERS</div>
            )}
            {pending.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={() => advanceStatus(order.id, 'preparing')}
                actionLabel="START PREPARING →"
                actionColor="bg-yellow-500 hover:bg-yellow-400 text-black"
                updating={updatingIds.has(order.id)}
              />
            ))}
          </div>
        </div>

        {/* PREPARING column */}
        <div className="flex flex-col">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <span className="text-blue-400 text-sm tracking-[0.3em] font-bold">PREPARING</span>
            <span className="bg-blue-400/20 text-blue-400 text-sm font-bold px-3 py-1 rounded-sm">
              {preparing.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {preparing.length === 0 && (
              <div className="text-white/20 text-center text-sm tracking-widest py-16">NOTHING IN PROGRESS</div>
            )}
            {preparing.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={() => advanceStatus(order.id, 'ready')}
                actionLabel="MARK READY ✓"
                actionColor="bg-green-600 hover:bg-green-500 text-white"
                updating={updatingIds.has(order.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onAction,
  actionLabel,
  actionColor,
  updating,
}: {
  order: Order;
  onAction: () => void;
  actionLabel: string;
  actionColor: string;
  updating: boolean;
}) {
  return (
    <div className={`border rounded-sm overflow-hidden ${
      order.status === 'pending' ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-blue-500/40 bg-blue-500/5'
    }`}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-bold tracking-widest">
            #{order.id.slice(-6).toUpperCase()}
          </span>
          {order.table_number && (
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 tracking-widest rounded-sm">
              TABLE {order.table_number}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs tracking-widest">{elapsed(order.created_at)} AGO</p>
          <p className="text-white/60 text-xs mt-0.5">{order.customer_name}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {order.order_items.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="text-white text-2xl font-bold leading-none min-w-[2rem]">
              {item.quantity}×
            </span>
            <span className="text-white text-lg leading-snug">{item.item_name}</span>
          </div>
        ))}
      </div>

      {/* Special notes */}
      {order.special_notes && (
        <div className="px-4 pb-3">
          <p className="text-yellow-300/80 text-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 rounded-sm">
            ⚠ {order.special_notes}
          </p>
        </div>
      )}

      {/* Action button */}
      <div className="px-4 pb-4">
        <button
          onClick={onAction}
          disabled={updating}
          className={`w-full py-4 text-sm font-bold tracking-[0.2em] transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed ${actionColor}`}
        >
          {updating ? 'UPDATING…' : actionLabel}
        </button>
      </div>
    </div>
  );
}
