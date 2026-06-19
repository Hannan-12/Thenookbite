'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';
import { printOrderReceipt } from '@/lib/printReceipt';

type OrderItem = { item_name: string; item_price: number; quantity: number };
type Order = {
  id: string; status: string; payment_method: string; payment_status: string;
  total: number; customer_name: string; customer_phone: string | null;
  table_number: string | null; order_type: string | null;
  delivery_address: string | null; rider_name: string | null;
  special_notes: string | null; created_at: string; order_items: OrderItem[];
};

const STATUSES = ['pending', 'preparing', 'ready', 'completed'] as const;
const STATUS_ORDER: Record<string, number> = { pending: 0, preparing: 1, ready: 2, completed: 3 };

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  preparing: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  ready:     'border-green-500/30 bg-green-500/10 text-green-400',
  completed: 'border-white/10 bg-white/5 text-white',
};

export function OrderDetailClient({ order }: { order: Order }) {
  const router  = useRouter();
  const [status, setStatus]       = useState(order.status);
  const [payMethod, setPayMethod] = useState(order.payment_method);
  const [payStatus, setPayStatus] = useState(order.payment_status);
  const [saving, setSaving]       = useState(false);
  const [settling, setSettling]   = useState(false);
  const [toast, setToast]         = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus(newStatus);
      showToast(`Status updated to ${newStatus.toUpperCase()}`);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function settle(method: 'cash' | 'card') {
    setSettling(true);
    const res = await fetch('/api/orders/settle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, payment_method: method }),
    });
    setSettling(false);
    if (res.ok) {
      setPayMethod(method);
      setPayStatus('paid');
      showToast(`Settled — ${method.toUpperCase()}`);
    } else {
      showToast('Failed to settle');
    }
  }

  const shortId = parseInt(order.id.replace(/-/g,"").slice(-4),16).toString().padStart(4,"0");
  const date = new Date(order.created_at).toLocaleString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white font-heading text-xs tracking-widest px-4 py-2 rounded-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <Link href="/admin/orders" className="font-heading text-xs tracking-widest text-white hover:text-white transition-colors">
          ← ORDERS
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">ORDER</p>
          <h1 className="font-heading text-3xl text-white">#{shortId}</h1>
          <p className="text-white text-xs mt-1">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => printOrderReceipt(order)}
            className="font-heading text-xs tracking-widest px-3 py-1.5 border border-white/10 text-white hover:border-white/30 hover:text-white rounded-sm transition-colors"
          >
            🖨 PRINT
          </button>
          <span className={`font-heading text-xs px-3 py-1.5 border rounded-sm ${STATUS_STYLES[status]}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Customer info */}
      <div className="border border-white/5 rounded-sm bg-[#111111] px-5 py-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-heading text-xs tracking-wider text-white">CUSTOMER</span>
          <span className="font-heading text-white text-sm">{order.customer_name}</span>
        </div>
        {order.customer_phone && (
          <div className="flex justify-between text-sm">
            <span className="font-heading text-xs tracking-wider text-white">PHONE</span>
            <span className="font-heading text-white text-sm">{order.customer_phone}</span>
          </div>
        )}
        {order.order_type && (
          <div className="flex justify-between text-sm">
            <span className="font-heading text-xs tracking-wider text-white">TYPE</span>
            <span className="font-heading text-white text-sm">{order.order_type.toUpperCase()}</span>
          </div>
        )}
        {order.table_number && (
          <div className="flex justify-between text-sm">
            <span className="font-heading text-xs tracking-wider text-white">TABLE</span>
            <span className="font-heading text-white text-sm">{order.table_number}</span>
          </div>
        )}
        {order.delivery_address && (
          <div className="flex justify-between text-sm gap-4">
            <span className="font-heading text-xs tracking-wider text-white flex-shrink-0">ADDRESS</span>
            <span className="font-heading text-white text-sm text-right">{order.delivery_address}</span>
          </div>
        )}
        {order.rider_name && (
          <div className="flex justify-between text-sm">
            <span className="font-heading text-xs tracking-wider text-white">RIDER</span>
            <span className="font-heading text-white text-sm">{order.rider_name}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="font-heading text-xs tracking-wider text-white">PAYMENT</span>
          <span className={`font-heading text-sm ${payMethod === 'pay_later' && payStatus === 'pending' ? 'text-orange-400' : 'text-white'}`}>
            {payMethod === 'pay_later' && payStatus === 'pending' ? 'PAY LATER — PENDING' : `${payMethod.toUpperCase()} — ${payStatus.toUpperCase()}`}
          </span>
        </div>
        {payMethod === 'pay_later' && payStatus === 'pending' && (
          <div className="pt-2 border-t border-white/5">
            <p className="font-heading text-xs tracking-wider text-orange-400 mb-2">SETTLE PAYMENT</p>
            <div className="flex gap-2">
              <button
                onClick={() => settle('cash')}
                disabled={settling}
                className="flex-1 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 font-heading text-xs tracking-widest text-white rounded-sm transition-colors"
              >
                {settling ? '…' : '💵 CASH'}
              </button>
              <button
                onClick={() => settle('card')}
                disabled={settling}
                className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 font-heading text-xs tracking-widest text-white rounded-sm transition-colors"
              >
                {settling ? '…' : '💳 CARD'}
              </button>
            </div>
          </div>
        )}
        {order.special_notes && (
          <div className="pt-2 border-t border-white/5">
            <p className="font-heading text-xs tracking-wider text-white mb-1">NOTES</p>
            <p className="text-white text-sm">{order.special_notes}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="border border-white/5 rounded-sm bg-[#111111] overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-white/5">
          <h2 className="font-heading text-xs tracking-widest text-white">ITEMS</h2>
        </div>
        <ul className="px-5 py-3 space-y-2">
          {order.order_items?.map((item, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="text-white">
                <span className="text-white font-heading">{item.quantity}×</span> {item.item_name}
              </span>
              <span className="font-heading text-white">{formatPKR(item.item_price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t-2 border-[#E4002B] flex justify-between">
          <span className="font-heading text-xs tracking-widest text-white">TOTAL</span>
          <span className="font-heading text-xl text-white">{formatPKR(order.total)}</span>
        </div>
      </div>

      {/* Status update */}
      <div className="border border-white/5 rounded-sm bg-[#111111] px-5 py-4">
        <p className="font-heading text-xs tracking-widest text-white mb-3">UPDATE STATUS</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUSES.map((s) => {
            const isBackward = STATUS_ORDER[s] < STATUS_ORDER[status];
            const isCurrent  = status === s;
            return (
              <button
                key={s}
                disabled={saving || isCurrent || isBackward}
                onClick={() => !isBackward && updateStatus(s)}
                title={isBackward ? 'Cannot move order backwards' : undefined}
                className={`py-2.5 px-3 font-heading text-xs tracking-wider rounded-sm border transition-colors duration-150 disabled:cursor-not-allowed ${
                  isCurrent
                    ? STATUS_STYLES[s]
                    : isBackward
                    ? 'border-white/5 text-white opacity-40'
                    : 'border-white/10 text-white hover:border-white/30 hover:text-white'
                }`}
              >
                {s.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/admin/orders')}
          className="font-heading text-xs tracking-widest text-white hover:text-white transition-colors"
        >
          ← BACK TO ORDERS
        </button>
      </div>
    </div>
  );
}
