import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const db = result.db;

  const [ordersRes, purchasesRes, expensesRes] = await Promise.all([
    db.from('orders')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', new Date(range.from).toISOString())
      .lt('created_at', range.toEndISO),
    db.from('purchases')
      .select('amount')
      .gte('purchase_date', range.from)
      .lte('purchase_date', range.to),
    db.from('expenses')
      .select('amount, category')
      .gte('expense_date', range.from)
      .lte('expense_date', range.to),
  ]);

  const total_revenue   = (ordersRes.data ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const total_purchases = (purchasesRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const total_expenses  = (expensesRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const total_costs     = total_purchases + total_expenses;
  const net_profit      = total_revenue - total_costs;

  const expenseByCategory: Record<string, number> = {};
  for (const e of expensesRes.data ?? []) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
  }

  return NextResponse.json({
    total_revenue,
    total_purchases,
    total_expenses,
    total_costs,
    net_profit,
    expense_breakdown: Object.entries(expenseByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  });
}
