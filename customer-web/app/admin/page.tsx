import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { formatPKR } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  pending:   'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
  preparing: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  ready:     'border-green-500/30 bg-green-500/5 text-green-400',
  completed: 'border-white/10 bg-white/3 text-white/30',
};

export default async function AdminDashboard() {
  await requireAdmin();
  const db = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders } = await db
    .from('orders')
    .select('id, status, total, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  const all = orders ?? [];
  const counts = {
    pending:   all.filter(o => o.status === 'pending').length,
    preparing: all.filter(o => o.status === 'preparing').length,
    ready:     all.filter(o => o.status === 'ready').length,
    completed: all.filter(o => o.status === 'completed').length,
  };
  const todayRevenue = all.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <AdminShell>
      <div className="px-4 sm:px-8 py-8">
        <div className="mb-8">
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">OVERVIEW</p>
          <h1 className="font-heading text-3xl text-white">DASHBOARD</h1>
          <p className="text-white/30 text-xs mt-1">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
            <div key={status} className={`border rounded-sm px-4 py-5 ${STATUS_COLORS[status]}`}>
              <p className="font-heading text-xs tracking-widest opacity-60 mb-1">{status.toUpperCase()}</p>
              <p className="font-heading text-4xl">{count}</p>
            </div>
          ))}
        </div>

        {/* Revenue */}
        <div className="border border-[#E4002B]/20 bg-[#E4002B]/5 rounded-sm px-6 py-5 mb-8 flex items-center justify-between">
          <div>
            <p className="font-heading text-xs tracking-widest text-[#E4002B]/60 mb-1">TODAY&apos;S REVENUE</p>
            <p className="font-heading text-4xl text-white">{formatPKR(todayRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-xs tracking-widest text-white/20 mb-1">TOTAL ORDERS</p>
            <p className="font-heading text-4xl text-white/40">{all.length}</p>
          </div>
        </div>

        {/* Recent orders */}
        <div className="border border-white/5 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-xs tracking-widest text-white/60">TODAY&apos;S ORDERS</h2>
            <Link href="/admin/orders" className="font-heading text-xs tracking-widest text-[#E4002B] hover:text-white transition-colors">
              VIEW ALL →
            </Link>
          </div>
          {all.length === 0 ? (
            <div className="px-5 py-12 text-center text-white/20 font-heading text-sm tracking-wider">
              NO ORDERS TODAY
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {all.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm text-white">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`font-heading text-xs px-2 py-0.5 rounded-sm border ${STATUS_COLORS[order.status]}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-heading text-sm text-white/60">{formatPKR(order.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
