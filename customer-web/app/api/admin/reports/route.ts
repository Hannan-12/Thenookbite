import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') ?? 'daily'; // daily | monthly
  const db = createServiceClient();

  if (mode === 'daily') {
    // Last 30 days
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from('orders')
      .select('total, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

    // Group by date
    const map: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { revenue: 0, orders: 0 };
    }

    for (const o of data ?? []) {
      const key = o.created_at.slice(0, 10);
      if (map[key]) {
        map[key].revenue += o.total ?? 0;
        map[key].orders += 1;
      }
    }

    const rows = Object.entries(map).map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
      revenue: v.revenue,
      orders: v.orders,
    }));

    return NextResponse.json({ rows });
  }

  if (mode === 'monthly') {
    // Last 12 months
    const from = new Date();
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from('orders')
      .select('total, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

    const map: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(from);
      d.setMonth(from.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = { revenue: 0, orders: 0 };
    }

    for (const o of data ?? []) {
      const key = o.created_at.slice(0, 7);
      if (map[key]) {
        map[key].revenue += o.total ?? 0;
        map[key].orders += 1;
      }
    }

    const rows = Object.entries(map).map(([month, v]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }),
      revenue: v.revenue,
      orders: v.orders,
    }));

    return NextResponse.json({ rows });
  }

  return NextResponse.json({ detail: 'Invalid mode' }, { status: 400 });
}
