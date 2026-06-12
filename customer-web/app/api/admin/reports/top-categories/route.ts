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

  if (!from || !to) {
    return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);

  const { data: orders } = await db
    .from('orders')
    .select('id')
    .eq('status', 'completed')
    .gte('created_at', new Date(from).toISOString())
    .lt('created_at', toEnd.toISOString());

  const orderIds = (orders ?? []).map(o => o.id);
  if (orderIds.length === 0) return NextResponse.json([]);

  // Fetch order items with menu_item category
  const { data: items } = await db
    .from('order_items')
    .select('item_price, quantity, order_id, menu_item_id')
    .in('order_id', orderIds)
    .not('menu_item_id', 'is', null);

  const menuItemIds = [...new Set((items ?? []).map(i => i.menu_item_id).filter(Boolean))];
  if (menuItemIds.length === 0) return NextResponse.json([]);

  const { data: menuItems } = await db
    .from('menu_items')
    .select('id, category')
    .in('id', menuItemIds);

  const categoryMap: Record<string, string> = {};
  for (const mi of menuItems ?? []) categoryMap[mi.id] = mi.category;

  // Aggregate by category
  const map: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const row of items ?? []) {
    const cat = categoryMap[row.menu_item_id] ?? 'Other';
    if (!map[cat]) map[cat] = { revenue: 0, qty: 0, orders: new Set() };
    map[cat].revenue += (row.item_price ?? 0) * (row.quantity ?? 0);
    map[cat].qty     += row.quantity ?? 0;
    map[cat].orders.add(row.order_id);
  }

  const result = Object.entries(map)
    .map(([category, v]) => ({
      category,
      revenue: v.revenue,
      qty: v.qty,
      orders: v.orders.size,
    }))
    .sort((a, b) => sort_by === 'qty' ? b.qty - a.qty : b.revenue - a.revenue);

  return NextResponse.json(result);
}
