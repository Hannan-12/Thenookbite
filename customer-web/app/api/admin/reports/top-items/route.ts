import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange, getCompletedOrderIds } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const sort_by = searchParams.get('sort_by') ?? 'revenue';
  const limit   = parseInt(searchParams.get('limit') ?? '10');

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const { orderIds } = await getCompletedOrderIds(result.db, range.from, range.toEndISO);
  if (orderIds.length === 0) return NextResponse.json([]);

  const { data: items } = await result.db
    .from('order_items')
    .select('item_name, item_price, quantity, order_id')
    .in('order_id', orderIds);

  const map: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const row of items ?? []) {
    if (!map[row.item_name]) map[row.item_name] = { revenue: 0, qty: 0, orders: new Set() };
    map[row.item_name].revenue += (row.item_price ?? 0) * (row.quantity ?? 0);
    map[row.item_name].qty     += row.quantity ?? 0;
    map[row.item_name].orders.add(row.order_id);
  }

  const data = Object.entries(map)
    .map(([item_name, v]) => ({
      item_name,
      revenue: v.revenue,
      qty: v.qty,
      orders: v.orders.size,
    }))
    .sort((a, b) => sort_by === 'qty' ? b.qty - a.qty : b.revenue - a.revenue)
    .slice(0, limit);

  return NextResponse.json(data);
}
