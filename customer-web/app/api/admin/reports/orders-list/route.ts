import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const { data, error } = await result.db
    .from('orders')
    .select('id, customer_name, table_number, total, payment_method, created_at, order_items(item_name, quantity, item_price)')
    .eq('status', 'completed')
    .gte('created_at', new Date(range.from).toISOString())
    .lt('created_at', range.toEndISO)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
