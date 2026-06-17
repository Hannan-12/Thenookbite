import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today's orders with items and staff
  const { data: orders, error: ordersErr } = await db
    .from('orders')
    .select('id, status, total, created_at, staff_id')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  if (ordersErr) return NextResponse.json({ detail: ordersErr.message }, { status: 500 });

  // Items sold today
  const { data: items, error: itemsErr } = await db
    .from('order_items')
    .select('quantity, orders!inner(created_at)')
    .gte('orders.created_at', today.toISOString());
  if (itemsErr) console.error('Dashboard: failed to fetch items sold', itemsErr.message);

  const itemsSold = (items ?? []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);

  // Staff stats — count orders per staff_id today
  const allOrders = orders ?? [];
  const staffMap: Record<string, number> = {};
  for (const o of allOrders) {
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
        name: staffRows?.find(s => s.id === id)?.full_name ?? 'Unknown',
        count: staffMap[id],
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Low stock ingredients
  const { data: allIngredients } = await db
    .from('ingredients')
    .select('id, name, unit, stock_qty, low_stock_threshold');

  const lowStock = (allIngredients ?? []).filter(i => i.stock_qty <= i.low_stock_threshold);

  // Today's profit
  const todayISO = today.toISOString().slice(0, 10);
  const [purchasesRes, expensesRes] = await Promise.all([
    db.from('purchases').select('amount').eq('purchase_date', todayISO),
    db.from('expenses').select('amount').eq('expense_date', todayISO),
  ]);

  const todayRevenue   = allOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total ?? 0), 0);
  const todayPurchases = (purchasesRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const todayExpenses  = (expensesRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const todayProfit    = todayRevenue - todayPurchases - todayExpenses;

  return NextResponse.json({ orders: allOrders, staffStats, itemsSold, lowStock, todayProfit });
}
