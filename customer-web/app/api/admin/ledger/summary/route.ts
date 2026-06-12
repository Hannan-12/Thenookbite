import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from_date');
  const to   = searchParams.get('to_date');

  if (!from || !to) return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });

  const db = createServiceClient();
  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);
  const toEndISO = toEnd.toISOString();

  const [ordersRes, purchasesRes, expensesRes] = await Promise.all([
    db.from('orders')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', new Date(from).toISOString())
      .lt('created_at', toEndISO),
    db.from('purchases')
      .select('amount')
      .gte('purchase_date', from)
      .lte('purchase_date', to),
    db.from('expenses')
      .select('amount, category')
      .gte('expense_date', from)
      .lte('expense_date', to),
  ]);

  const total_revenue   = (ordersRes.data ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const total_purchases = (purchasesRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const total_expenses  = (expensesRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const total_costs     = total_purchases + total_expenses;
  const net_profit      = total_revenue - total_costs;

  // Expenses breakdown by category
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
