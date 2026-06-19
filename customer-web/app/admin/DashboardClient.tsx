'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  staff_id: string | null;
}

interface StaffStat {
  staff_id: string;
  name: string;
  count: number;
}

interface LowStockItem {
  id: string;
  name: string;
  unit: string;
  stock_qty: number;
  low_stock_threshold: number;
}

interface DashboardData {
  orders: Order[];
  staffStats: StaffStat[];
  itemsSold: number;
  lowStock: LowStockItem[];
  todayProfit?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
  preparing: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  ready:     'border-green-500/30 bg-green-500/5 text-green-400',
  completed: 'border-white/10 bg-white/3 text-white',
};

export function DashboardClient({ initial }: { initial: DashboardData }) {
  const [data, setData]       = useState<DashboardData>(initial);
  const [lastSync, setLastSync] = useState(new Date());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (res.ok) {
        setData(await res.json());
        setLastSync(new Date());
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const { orders, staffStats, itemsSold, lowStock = [], todayProfit } = data;

  const counts = {
    pending:   orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };
  const completedOrders = orders.filter(o => o.status === 'completed');
  const revenue   = completedOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const avgOrder  = completedOrders.length ? Math.round(revenue / completedOrders.length) : 0;

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">OVERVIEW</p>
          <h1 className="font-heading text-3xl text-white">DASHBOARD</h1>
          <p className="text-white text-xs mt-1">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-[10px] tracking-widest text-white">LAST SYNC</p>
          <p className="font-heading text-[10px] text-white">
            {lastSync.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <button
            onClick={refresh}
            className="font-heading text-[10px] tracking-widest text-[#E4002B]/60 hover:text-[#E4002B] transition-colors mt-1"
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Order status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
          <div key={status} className={`border rounded-sm px-4 py-5 ${STATUS_COLORS[status]}`}>
            <p className="font-heading text-xs tracking-widest opacity-60 mb-1">{status.toUpperCase()}</p>
            <p className="font-heading text-4xl">{count}</p>
          </div>
        ))}
      </div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="border border-[#E4002B]/20 bg-[#E4002B]/5 rounded-sm px-4 py-5 lg:col-span-2">
          <p className="font-heading text-xs tracking-widest text-[#E4002B]/60 mb-1">TODAY&apos;S REVENUE (COMPLETED)</p>
          <p className="font-heading text-4xl text-white">{formatPKR(revenue)}</p>
        </div>
        <div className="border border-white/5 rounded-sm px-4 py-5">
          <p className="font-heading text-xs tracking-widest text-white mb-1">TOTAL ORDERS</p>
          <p className="font-heading text-4xl text-white">{orders.length}</p>
        </div>
        <div className="border border-white/5 rounded-sm px-4 py-5">
          <p className="font-heading text-xs tracking-widest text-white mb-1">AVG ORDER</p>
          <p className="font-heading text-4xl text-white">{formatPKR(avgOrder)}</p>
        </div>
      </div>

      {/* Today's profit */}
      {todayProfit !== undefined && (
        <div className={`border rounded-sm px-4 py-5 mb-8 flex items-center justify-between ${
          todayProfit >= 0 ? 'border-green-500/20 bg-green-500/5' : 'border-red-800/30 bg-red-900/5'
        }`}>
          <div>
            <p className="font-heading text-xs tracking-widest text-white mb-1">TODAY&apos;S NET PROFIT</p>
            <p className={`font-heading text-4xl ${todayProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatPKR(todayProfit)}
            </p>
            <p className="font-heading text-[10px] tracking-widest text-white mt-1">
              REVENUE − PURCHASES − EXPENSES
            </p>
          </div>
          <Link
            href="/admin/ledger"
            className="font-heading text-[10px] tracking-widest text-white hover:text-white transition-colors"
          >
            LEDGER →
          </Link>
        </div>
      )}

      {/* Items sold + staff stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

        {/* Items sold */}
        <div className="border border-white/5 rounded-sm px-6 py-5">
          <p className="font-heading text-xs tracking-widest text-white mb-3">ITEMS SOLD TODAY</p>
          <p className="font-heading text-5xl text-white">{itemsSold}</p>
          <p className="font-heading text-[10px] tracking-widest text-white mt-2">ACROSS ALL ORDERS</p>
        </div>

        {/* Top staff */}
        <div className="border border-white/5 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="font-heading text-xs tracking-widest text-white">TOP STAFF TODAY</p>
          </div>
          {staffStats.length === 0 ? (
            <div className="px-5 py-8 text-center text-white font-heading text-xs tracking-wider">
              NO STAFF ORDERS YET
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {staffStats.slice(0, 3).map((s, i) => (
                <div key={s.staff_id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-xs text-white w-4">{i + 1}</span>
                    <span className="font-heading text-sm text-white">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs text-white">{s.count} orders</span>
                    {i === 0 && <span className="text-[#FFD700] text-xs">★</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-6 border border-yellow-500/30 bg-yellow-500/5 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm">⚠</span>
              <h2 className="font-heading text-xs tracking-widest text-yellow-400">
                LOW STOCK — {lowStock.length} INGREDIENT{lowStock.length !== 1 ? 'S' : ''}
              </h2>
            </div>
            <Link href="/admin/inventory" className="font-heading text-[10px] tracking-widest text-yellow-400/60 hover:text-yellow-400 transition-colors">
              MANAGE →
            </Link>
          </div>
          <div className="divide-y divide-yellow-500/10">
            {lowStock.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                <span className="font-heading text-xs text-yellow-300">{item.name}</span>
                <span className="font-heading text-xs text-yellow-400/60">
                  {item.stock_qty} / {item.low_stock_threshold} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-heading text-xs tracking-widest text-white">TODAY&apos;S ORDERS</h2>
          <Link href="/admin/orders" className="font-heading text-xs tracking-widest text-[#E4002B] hover:text-white transition-colors">
            VIEW ALL →
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-white font-heading text-sm tracking-wider">
            NO ORDERS TODAY
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.slice(0, 8).map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-heading text-sm text-white">#{parseInt(order.id.replace(/-/g,"").slice(-4),16).toString().padStart(4,"0")}</span>
                  <span className={`font-heading text-xs px-2 py-0.5 rounded-sm border ${STATUS_COLORS[order.status]}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <span className="font-heading text-sm text-white">{formatPKR(order.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
