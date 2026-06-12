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

  if (!from || !to) {
    return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);
  const toEndISO = toEnd.toISOString();

  const { data: orders } = await db
    .from('orders')
    .select('id, total')
    .eq('status', 'completed')
    .gte('created_at', new Date(from).toISOString())
    .lt('created_at', toEndISO);

  const orderIds = (orders ?? []).map(o => o.id);
  const total_revenue = (orders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const total_orders  = orders?.length ?? 0;
  const avg_order_value = total_orders > 0 ? Math.round(total_revenue / total_orders) : 0;

  let total_items_sold = 0;
  if (orderIds.length > 0) {
    const { data: items } = await db
      .from('order_items')
      .select('quantity')
      .in('order_id', orderIds);
    total_items_sold = (items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
  }

  return NextResponse.json({ total_revenue, total_orders, total_items_sold, avg_order_value });
}
