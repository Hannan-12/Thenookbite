'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPKR } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';

interface OrderItem { item_name: string; item_price: number; quantity: number; }
interface Order {
  id: string;
  status: string;
  payment_method: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'PENDING',   cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  preparing: { label: 'PREPARING', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ready:     { label: 'READY',     cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed: { label: 'COMPLETED', cls: 'bg-white/5 text-white/30 border-white/10' },
};

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const { addLine, clear } = useCart();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setOrders([]); return; }
      const { data: rows } = await supabase
        .from('orders')
        .select('id, status, payment_method, total, created_at, order_items(item_name, item_price, quantity)')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setOrders(rows ?? []);
    });
  }, []);

  function handleReorder(order: Order) {
    setReordering(order.id);
    clear();
    for (const item of order.order_items) {
      addLine({ key: `reorder-${item.item_name}`, menu_item_id: '', name: item.item_name, price: item.item_price }, item.quantity);
    }
    router.push('/checkout');
  }

  // Not logged in or no orders — render nothing
  if (!orders || orders.length === 0) return null;

  return (
    <section className="bg-[#0a0a0a] py-14 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-2">YOUR ACCOUNT</p>
            <h2 className="font-heading text-3xl sm:text-4xl text-white leading-none">RECENT ORDERS</h2>
          </div>
          <Link
            href="/my-orders"
            className="font-heading text-xs tracking-widest text-white/30 hover:text-white transition-colors duration-200"
          >
            VIEW ALL →
          </Link>
        </div>

        {/* Order cards */}
        <div className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_LABEL[order.status] ?? STATUS_LABEL.completed;
            const date = new Date(order.created_at).toLocaleDateString('en-PK', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            const time = new Date(order.created_at).toLocaleTimeString('en-PK', {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={order.id} className="border border-white/5 bg-white/[0.02] rounded-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  {/* Left: ID + status + date */}
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="font-heading text-base text-white tracking-widest flex-shrink-0">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`font-heading text-[10px] tracking-wider px-2 py-0.5 border rounded-sm flex-shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                    <span className="text-white/20 text-xs font-heading tracking-wider hidden sm:block">
                      {date} · {time}
                    </span>
                  </div>

                  {/* Right: total + reorder */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-heading text-white text-base">{formatPKR(order.total)}</span>
                    <button
                      onClick={() => handleReorder(order)}
                      disabled={reordering === order.id}
                      className="font-heading text-xs tracking-widest px-4 py-2 bg-brand-red text-white hover:bg-red-600 disabled:opacity-50 transition-colors duration-150 rounded-sm"
                    >
                      {reordering === order.id ? '…' : '↺ REORDER'}
                    </button>
                  </div>
                </div>

                {/* Items preview */}
                <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1">
                  {order.order_items?.slice(0, 4).map((item, i) => (
                    <span key={i} className="text-white/30 text-xs font-body">
                      {item.quantity}× {item.item_name}
                    </span>
                  ))}
                  {(order.order_items?.length ?? 0) > 4 && (
                    <span className="text-white/20 text-xs font-body">
                      +{order.order_items.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
