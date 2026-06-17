import { NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const db = result.db;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders } = await db
    .from('orders')
    .select('id, status, total, created_at, staff_id')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  const { data: items } = await db
    .from('order_items')
    .select('quantity, orders!inner(created_at)')
    .gte('orders.created_at', today.toISOString());

  const itemsSold = (items ?? []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);

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

  const { data: allIngredients } = await db
    .from('ingredients')
    .select('id, name, unit, stock_qty, low_stock_threshold');

  const lowStock = (allIngredients ?? []).filter(i => i.stock_qty <= i.low_stock_threshold);

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
