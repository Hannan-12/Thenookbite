import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const from    = searchParams.get('from_date');
  const to      = searchParams.get('to_date');
  const sort_by = searchParams.get('sort_by') ?? 'revenue';
  const limit   = parseInt(searchParams.get('limit') ?? '10');

  if (!from || !to) {
    return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);

  // Get completed order IDs in range
  const { data: orders } = await db
    .from('orders')
    .select('id')
    .eq('status', 'completed')
    .gte('created_at', new Date(from).toISOString())
    .lt('created_at', toEnd.toISOString());

  const orderIds = (orders ?? []).map(o => o.id);
  if (orderIds.length === 0) return NextResponse.json([]);

  const { data: items } = await db
    .from('order_items')
    .select('item_name, item_price, quantity, order_id')
    .in('order_id', orderIds);

  // Aggregate by item_name
  const map: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const row of items ?? []) {
    if (!map[row.item_name]) map[row.item_name] = { revenue: 0, qty: 0, orders: new Set() };
    map[row.item_name].revenue += (row.item_price ?? 0) * (row.quantity ?? 0);
    map[row.item_name].qty     += row.quantity ?? 0;
    map[row.item_name].orders.add(row.order_id);
  }

  const result = Object.entries(map)
    .map(([item_name, v]) => ({
      item_name,
      revenue: v.revenue,
      qty: v.qty,
      orders: v.orders.size,
    }))
    .sort((a, b) => sort_by === 'qty' ? b.qty - a.qty : b.revenue - a.revenue)
    .slice(0, limit);

  return NextResponse.json(result);
}
