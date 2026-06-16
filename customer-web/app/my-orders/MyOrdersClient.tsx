'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { formatPKR } from '@/lib/format';

interface OrderItem { item_name: string; item_price: number; quantity: number; }
interface Order {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  preparing:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ready:      'bg-green-500/10 text-green-400 border-green-500/20',
  completed:  'bg-white/5 text-muted border-theme',
};

export default function MyOrdersClient({ orders }: { orders: Order[] }) {
  const { addLine, clear } = useCart();
  const router = useRouter();
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  function handleReorder(order: Order) {
    const hasCart = useCart.getState().lines.length > 0;
    if (hasCart && !confirm('This will clear your current cart. Continue?')) return;
    setReordering(order.id);
    clear();
    order.order_items.forEach((item, idx) => {
      addLine({
        key: `reorder-${order.id}-${idx}`,
        menu_item_id: null,
        name: item.item_name,
        price: item.item_price,
      }, item.quantity);
    });
    router.push('/checkout');
  }

  if (orders.length === 0) {
    return (
      <div className="py-24 text-center">
        <div className="text-5xl mb-6">🍔</div>
        <h2 className="font-heading text-2xl text-primary">NO ORDERS YET</h2>
        <p className="mt-3 text-sm text-muted">You haven&apos;t placed any orders yet.</p>
        <Link
          href="/menu"
          className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm px-8 py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200"
        >
          ORDER NOW →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const shortId = parseInt(order.id.replace(/-/g,"").slice(-4),16).toString().padStart(4,"0");
        const date = new Date(order.created_at).toLocaleDateString('en-PK', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
        const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.completed;

        return (
          <div key={order.id} className="bg-card border border-theme rounded-sm overflow-hidden">
            {/* Order header */}
            <div className="px-4 sm:px-6 py-4 border-b border-theme">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-base sm:text-lg text-primary"># {shortId}</span>
                  <span className={`font-heading text-xs tracking-wider px-2.5 py-1 border rounded-sm ${statusStyle}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-base sm:text-lg text-primary">
                    {formatPKR(order.total)}
                  </span>
                  <button
                    onClick={() => handleReorder(order)}
                    disabled={reordering === order.id}
                    className="font-heading text-xs tracking-widest px-4 py-2 bg-brand-red text-white hover:bg-red-600 disabled:opacity-50 transition-colors duration-150 rounded-sm"
                  >
                    {reordering === order.id ? 'LOADING…' : '↺ REORDER'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted font-heading tracking-wider">
                <span>{date}</span>
                <span>•</span>
                <span>{order.payment_method.toUpperCase()}</span>
              </div>
            </div>

            {/* Items */}
            <ul className="px-4 sm:px-6 py-4 space-y-1.5">
              {order.order_items?.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-muted">
                    <span className="text-primary font-heading">{item.quantity}×</span> {item.item_name}
                  </span>
                  <span className="font-heading text-primary text-xs">
                    {formatPKR(item.item_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
