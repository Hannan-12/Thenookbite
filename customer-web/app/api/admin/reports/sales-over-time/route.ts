import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const from     = searchParams.get('from_date');
  const to       = searchParams.get('to_date');
  const group_by = searchParams.get('group_by') ?? 'day';

  if (!from || !to) {
    return NextResponse.json({ detail: 'from_date and to_date are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);

  const { data: orders } = await db
    .from('orders')
    .select('id, total, created_at')
    .eq('status', 'completed')
    .gte('created_at', new Date(from).toISOString())
    .lt('created_at', toEnd.toISOString())
    .order('created_at', { ascending: true });

  // Group in JS — avoids needing raw SQL / RPC
  const buckets: Record<string, { revenue: number; orders: number }> = {};

  for (const order of orders ?? []) {
    const d = new Date(order.created_at);
    let key: string;

    if (group_by === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (group_by === 'week') {
      // ISO week start (Monday)
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

  const result = Object.entries(buckets)
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

  return NextResponse.json(result);
}
