'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';

interface OrderItem { item_name: string; quantity: number; item_price: number; }
interface Order {
  id: string; status: string; total: number; payment_method: string;
  customer_name: string; table_number: string | null; special_notes: string | null;
  created_at: string; order_items: OrderItem[];
}
interface Customer {
  id: string; email: string; full_name: string | null; phone: string | null;
  is_banned: boolean; joined_at: string; last_sign_in: string | null;
  order_count: number; total_spent: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  preparing: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  ready:     'border-green-500/30 bg-green-500/10 text-green-400',
  completed: 'border-white/10 bg-white/5 text-white',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CustomerDetailClient({ customer: initial, orders }: { customer: Customer; orders: Order[] }) {
  const [customer, setCustomer] = useState(initial);
  const [banning, setBanning]   = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter]     = useState('all');

  async function toggleBan() {
    setBanning(true);
    const res = await fetch(`/api/admin/users/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_banned: !customer.is_banned }),
    });
    if (res.ok) setCustomer(c => ({ ...c, is_banned: !c.is_banned }));
    setBanning(false);
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const statuses = ['all', 'pending', 'preparing', 'ready', 'completed'];

  return (
    <div className="px-4 sm:px-8 py-8 space-y-6">

      {/* Back */}
      <Link href="/admin/users" className="inline-flex items-center gap-2 font-heading text-xs tracking-widest text-white hover:text-white transition-colors">
        ← CUSTOMERS
      </Link>

      {/* Profile card */}
      <div className="border border-white/5 bg-[#111] rounded-sm overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-heading text-2xl text-white">
                {customer.full_name ?? <span className="text-white italic">No name</span>}
              </h1>
              {customer.is_banned && (
                <span className="font-heading text-[10px] tracking-widest px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-sm">
                  BANNED
                </span>
              )}
            </div>
            <p className="text-white text-sm">{customer.email}</p>
          </div>
          <button
            onClick={toggleBan}
            disabled={banning}
            className={`font-heading text-xs tracking-widest px-4 py-2 rounded-sm border transition-colors disabled:opacity-40 ${
              customer.is_banned
                ? 'border-green-500/30 text-green-400 hover:border-green-500/60'
                : 'border-red-500/30 text-red-400 hover:border-red-500/60'
            }`}
          >
            {banning ? '…' : customer.is_banned ? 'UNBAN CUSTOMER' : 'BAN CUSTOMER'}
          </button>
        </div>

        {/* Info grid */}
        <div className="border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
          {[
            { label: 'PHONE',       value: customer.phone ?? '—' },
            { label: 'JOINED',      value: fmtDate(customer.joined_at) },
            { label: 'LAST SIGN IN', value: fmtDate(customer.last_sign_in) },
            { label: 'ACCOUNT ID',  value: customer.id.slice(0, 8).toUpperCase() + '…' },
          ].map(item => (
            <div key={item.label} className="px-5 py-4">
              <p className="font-heading text-[10px] tracking-widest text-white mb-1">{item.label}</p>
              <p className="font-heading text-sm text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="border-t border-white/5 grid grid-cols-3 divide-x divide-white/5">
          <div className="px-5 py-4">
            <p className="font-heading text-[10px] tracking-widest text-white mb-1">TOTAL ORDERS</p>
            <p className="font-heading text-2xl text-white">{customer.order_count}</p>
          </div>
          <div className="px-5 py-4">
            <p className="font-heading text-[10px] tracking-widest text-white mb-1">TOTAL SPENT</p>
            <p className="font-heading text-2xl text-white">{formatPKR(customer.total_spent)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="font-heading text-[10px] tracking-widest text-white mb-1">AVG ORDER</p>
            <p className="font-heading text-2xl text-white">
              {customer.order_count > 0 ? formatPKR(Math.round(customer.total_spent / customer.order_count)) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-heading text-sm tracking-widest text-white">ORDER HISTORY</h2>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-shrink-0 font-heading text-[10px] tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                  filter === s ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white hover:text-white'
                }`}
              >
                {s.toUpperCase()}
                {s !== 'all' && (
                  <span className="ml-1 opacity-50">{orders.filter(o => o.status === s).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-white/5 rounded-sm px-5 py-12 text-center text-white font-heading text-sm tracking-wider">
            NO ORDERS
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id} className="border border-white/5 bg-[#111] rounded-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-heading text-[10px] text-white w-3">{isExpanded ? '▲' : '▼'}</span>
                    <span className="font-heading text-sm text-white w-24 flex-shrink-0">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`font-heading text-[10px] tracking-widest px-2 py-0.5 border rounded-sm flex-shrink-0 ${STATUS_STYLES[order.status]}`}>
                      {order.status.toUpperCase()}
                    </span>
                    {order.table_number && (
                      <span className="font-heading text-[10px] text-white border border-white/10 px-2 py-0.5 rounded-sm flex-shrink-0">
                        T{order.table_number}
                      </span>
                    )}
                    <span className="font-heading text-xs text-white flex-1 hidden sm:block truncate">
                      {fmtDateTime(order.created_at)}
                    </span>
                    <span className="font-heading text-[10px] text-white flex-shrink-0 hidden md:block">
                      {order.payment_method.toUpperCase()}
                    </span>
                    <span className="font-heading text-sm text-white flex-shrink-0 ml-auto">
                      {formatPKR(order.total)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/5 px-5 py-4 bg-white/[0.01] space-y-3">
                      <div className="space-y-1.5">
                        {order.order_items.length === 0 ? (
                          <p className="text-white text-xs font-heading tracking-wider">NO ITEM DATA</p>
                        ) : order.order_items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-white">
                              <span className="text-white">{item.quantity}×</span> {item.item_name}
                            </span>
                            <span className="text-white font-heading">{formatPKR(item.item_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      {order.special_notes && (
                        <p className="text-yellow-400/70 text-xs border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 rounded-sm">
                          ⚠ {order.special_notes}
                        </p>
                      )}
                      <div className="pt-2 border-t border-white/5 flex justify-between text-xs font-heading text-white">
                        <span>{fmtDateTime(order.created_at)} · {order.payment_method.toUpperCase()}</span>
                        <span className="text-white">{formatPKR(order.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
