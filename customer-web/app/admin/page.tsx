import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAdmin();
  const db = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayISO = today.toISOString().slice(0, 10);

  const [ordersRes, itemsRes, ingredientsRes, purchasesRes, expensesRes] = await Promise.all([
    db
      .from('orders')
      .select('id, status, total, created_at, staff_id')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false }),
    db
      .from('order_items')
      .select('quantity, orders!inner(created_at)')
      .gte('orders.created_at', today.toISOString()),
    db
      .from('ingredients')
      .select('id, name, unit, stock_qty, low_stock_threshold'),
    db
      .from('purchases')
      .select('amount')
      .eq('purchase_date', todayISO),
    db
      .from('expenses')
      .select('amount')
      .eq('expense_date', todayISO),
  ]);

  const orders = ordersRes.data ?? [];
  const itemsSold = (itemsRes.data ?? []).reduce(
    (s: number, i: { quantity: number }) => s + i.quantity, 0
  );
  const lowStock = (ingredientsRes.data ?? []).filter(
    i => i.stock_qty <= i.low_stock_threshold
  );

  const todayRevenue   = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total ?? 0), 0);
  const todayPurchases = (purchasesRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const todayExpenses  = (expensesRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const todayProfit    = todayRevenue - todayPurchases - todayExpenses;

  // Staff stats
  const staffMap: Record<string, number> = {};
  for (const o of orders) {
    if (o.staff_id) staffMap[o.staff_id] = (staffMap[o.staff_id] ?? 0) + 1;
  }
  const staffIds = Object.keys(staffMap);
  let staffStats: { staff_id: string; name: string; count: number }[] = [];

  if (staffIds.length > 0) {
    const { data: staffRows } = await db
      .from('staff')
      .select('id, full_name')
      .in('id', staffIds);

    staffStats = staffIds
      .map(id => ({
        staff_id: id,
        name: staffRows?.find((s: { id: string; full_name: string }) => s.id === id)?.full_name ?? 'Unknown',
        count: staffMap[id],
      }))
      .sort((a, b) => b.count - a.count);
  }

  return (
    <AdminShell>
      <DashboardClient initial={{ orders, staffStats, itemsSold, lowStock, todayProfit }} />
    </AdminShell>
  );
}
