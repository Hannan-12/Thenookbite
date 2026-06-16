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

type State =
  | { kind: 'loading' }
  | { kind: 'guest' }
  | { kind: 'no-orders' }
  | { kind: 'orders'; orders: Order[] };

export function RecentOrders() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reordering, setReordering] = useState<string | null>(null);
  const { addLine, clear } = useCart();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setState({ kind: 'guest' }); return; }

      // Get profile phone for guest-order matching
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', data.user.id)
        .single();

      const sel = 'id, status, payment_method, total, created_at, order_items(item_name, item_price, quantity)';

      const [byUser, byPhone] = await Promise.all([
        supabase.from('orders').select(sel).eq('user_id', data.user.id),
        profile?.phone
          ? supabase.from('orders').select(sel).is('user_id', null).eq('customer_phone', profile.phone)
          : Promise.resolve({ data: [] }),
      ]);

      const seen = new Set<string>();
      const merged: Order[] = [];
      for (const o of [...(byUser.data ?? []), ...((byPhone as { data: Order[] | null }).data ?? [])]) {
        if (!seen.has(o.id)) { seen.add(o.id); merged.push(o); }
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const rows = merged.slice(0, 3);

      if (rows.length === 0) { setState({ kind: 'no-orders' }); return; }
      setState({ kind: 'orders', orders: rows });
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

  // Don't show anything while loading or if guest with no prompt needed
  if (state.kind === 'loading') return null;

  // Guest — show sign-in nudge
  if (state.kind === 'guest') {
    return (
      <section className="bg-[#0a0a0a] py-10 px-4 sm:px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-heading text-xs tracking-[0.3em] text-brand-red mb-1">YOUR ORDERS</p>
            <p className="font-heading text-white/50 text-sm tracking-wider">Sign in to see your order history and reorder in one tap.</p>
          </div>
          <Link
            href="/login?next=/"
            className="font-heading text-sm tracking-widest px-6 py-3 bg-brand-red text-white hover:bg-red-600 transition-colors duration-200 rounded-sm flex-shrink-0"
          >
            SIGN IN →
          </Link>
        </div>
      </section>
    );
  }

  // Logged in but no orders yet
  if (state.kind === 'no-orders') {
    return (
      <section className="bg-[#0a0a0a] py-10 px-4 sm:px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-heading text-xs tracking-[0.3em] text-brand-red mb-1">YOUR ORDERS</p>
            <p className="font-heading text-white/50 text-sm tracking-wider">You haven't placed any orders yet.</p>
          </div>
          <Link
            href="/menu"
            className="font-heading text-sm tracking-widest px-6 py-3 bg-brand-red text-white hover:bg-red-600 transition-colors duration-200 rounded-sm flex-shrink-0"
          >
            ORDER NOW →
          </Link>
        </div>
      </section>
    );
  }

  const { orders } = state;

  return (
    <section className="bg-[#0a0a0a] py-14 px-4 sm:px-6 border-t border-white/5">
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
