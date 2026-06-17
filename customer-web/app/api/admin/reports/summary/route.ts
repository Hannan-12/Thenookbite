import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange, getCompletedOrderIds } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const { data: orders, orderIds } = await getCompletedOrderIds(
    result.db, range.from, range.toEndISO, 'id, total',
  );

  const rows = orders ?? [];
  const total_revenue = rows.reduce((s: number, o) => s + (Number(o.total) || 0), 0);
  const total_orders  = rows.length;
  const avg_order_value = total_orders > 0 ? Math.round(total_revenue / total_orders) : 0;

  let total_items_sold = 0;
  if (orderIds.length > 0) {
    const { data: items } = await result.db
      .from('order_items')
      .select('quantity')
      .in('order_id', orderIds);
    total_items_sold = (items ?? []).reduce((s: number, i: { quantity?: number }) => s + (i.quantity ?? 0), 0);
  }

  return NextResponse.json({ total_revenue, total_orders, total_items_sold, avg_order_value });
}
