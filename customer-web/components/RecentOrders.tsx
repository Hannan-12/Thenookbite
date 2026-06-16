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

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-yellow-400',
  preparing: 'bg-blue-400',
  ready:     'bg-green-400',
  completed: 'bg-white/20',
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

      if (merged.length === 0) { setState({ kind: 'no-orders' }); return; }
      setState({ kind: 'orders', orders: merged.slice(0, 3) });
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

  if (state.kind === 'loading') return null;

  // Guest — slim sign-in bar
  if (state.kind === 'guest') {
    return (
      <div className="bg-[#111] border-b border-white/5 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          <p className="text-white/40 text-xs font-heading tracking-wider">
            Sign in to track orders &amp; reorder in one tap
          </p>
          <Link
            href="/login?next=/"
            className="font-heading text-xs tracking-widest px-4 py-1.5 bg-brand-red text-white hover:bg-red-600 transition-colors rounded-sm flex-shrink-0"
          >
            SIGN IN →
          </Link>
        </div>
      </div>
    );
  }

  // No orders yet — slim bar with MY ORDERS + ORDER NOW
  if (state.kind === 'no-orders') {
    return (
      <div className="bg-[#111] border-b border-white/5 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          <p className="text-white/40 text-xs font-heading tracking-wider">
            No orders yet — start your first order
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/my-orders"
              className="font-heading text-xs tracking-widest px-4 py-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors rounded-sm"
            >
              MY ORDERS
            </Link>
            <Link
              href="/menu"
              className="font-heading text-xs tracking-widest px-4 py-1.5 bg-brand-red text-white hover:bg-red-600 transition-colors rounded-sm"
            >
              ORDER NOW →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has orders — show last 3 as a compact horizontal strip
  const { orders } = state;

  return (
    <div className="bg-[#111] border-b border-white/5 px-4 sm:px-6 py-4">
      <div className="mx-auto max-w-7xl">
        {/* Row header */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading text-[10px] tracking-[0.3em] text-brand-red">RECENT ORDERS</p>
          <Link
            href="/my-orders"
            className="font-heading text-[10px] tracking-widest text-white/30 hover:text-white transition-colors"
          >
            VIEW ALL →
          </Link>
        </div>

        {/* Order pills */}
        <div className="flex flex-col sm:flex-row gap-2">
          {orders.map((order) => {
            const dot = STATUS_DOT[order.status] ?? STATUS_DOT.completed;
            const preview = order.order_items?.slice(0, 2).map(i => i.item_name).join(', ');
            const more = (order.order_items?.length ?? 0) - 2;

            return (
              <div
                key={order.id}
                className="flex-1 min-w-0 flex items-center justify-between gap-3 bg-white/[0.03] border border-white/5 rounded-sm px-4 py-3"
              >
                {/* Left */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="font-heading text-xs text-white tracking-widest">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="font-heading text-xs text-white/50">{formatPKR(order.total)}</span>
                  </div>
                  <p className="text-white/30 text-[11px] font-body truncate">
                    {preview}{more > 0 ? ` +${more} more` : ''}
                  </p>
                </div>

                {/* Reorder */}
                <button
                  onClick={() => handleReorder(order)}
                  disabled={reordering === order.id}
                  className="font-heading text-[10px] tracking-widest px-3 py-1.5 bg-brand-red text-white hover:bg-red-600 disabled:opacity-50 transition-colors rounded-sm flex-shrink-0"
                >
                  {reordering === order.id ? '…' : '↺'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
