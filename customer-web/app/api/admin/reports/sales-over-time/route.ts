import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, parseDateRange } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const group_by = searchParams.get('group_by') ?? 'day';

  const range = parseDateRange(req);
  if (range instanceof NextResponse) return range;

  const { data: orders } = await result.db
    .from('orders')
    .select('id, total, created_at')
    .eq('status', 'completed')
    .gte('created_at', new Date(range.from).toISOString())
    .lt('created_at', range.toEndISO)
    .order('created_at', { ascending: true });

  const buckets: Record<string, { revenue: number; orders: number }> = {};

  for (const order of orders ?? []) {
    const d = new Date(order.created_at);
    let key: string;

    if (group_by === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (group_by === 'week') {
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day);
      key = monday.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }

    if (!buckets[key]) buckets[key] = { revenue: 0, orders: 0 };
    buckets[key].revenue += order.total ?? 0;
    buckets[key].orders  += 1;
  }

  const data = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      let label: string;
      if (group_by === 'month') {
        const [y, m] = key.split('-');
        label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      } else if (group_by === 'week') {
        label = `Wk ${new Date(key).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`;
      } else {
        label = new Date(key).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
      }
      return { label, revenue: val.revenue, orders: val.orders };
    });

  return NextResponse.json(data);
}
