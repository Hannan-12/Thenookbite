import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange, getCompletedOrderIds } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const sort_by = searchParams.get('sort_by') ?? 'revenue';

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const { orderIds } = await getCompletedOrderIds(result.db, range.from, range.toEndISO);
  if (orderIds.length === 0) return NextResponse.json([]);

  const { data: items } = await result.db
    .from('order_items')
    .select('item_price, quantity, order_id, menu_item_id')
    .in('order_id', orderIds)
    .not('menu_item_id', 'is', null);

  const menuItemIds = [...new Set((items ?? []).map((i: { menu_item_id: string }) => i.menu_item_id).filter(Boolean))];
  if (menuItemIds.length === 0) return NextResponse.json([]);

  const { data: menuItems } = await result.db
    .from('menu_items')
    .select('id, category')
    .in('id', menuItemIds);

  const categoryMap: Record<string, string> = {};
  for (const mi of menuItems ?? []) categoryMap[mi.id] = mi.category;

  const map: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const row of items ?? []) {
    const cat = categoryMap[row.menu_item_id] ?? 'Other';
    if (!map[cat]) map[cat] = { revenue: 0, qty: 0, orders: new Set() };
    map[cat].revenue += (row.item_price ?? 0) * (row.quantity ?? 0);
    map[cat].qty     += row.quantity ?? 0;
    map[cat].orders.add(row.order_id);
  }

  const data = Object.entries(map)
    .map(([category, v]) => ({
      category,
      revenue: v.revenue,
      qty: v.qty,
      orders: v.orders.size,
    }))
    .sort((a, b) => sort_by === 'qty' ? b.qty - a.qty : b.revenue - a.revenue);

  return NextResponse.json(data);
}
