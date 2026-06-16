import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const db = createServiceClient();

  // Default to today (PKT = UTC+5)
  const targetDate = date ?? new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fromISO = `${targetDate}T00:00:00+05:00`;
  const toISO   = `${targetDate}T23:59:59+05:00`;

  const { data: orders, error } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, total, status, payment_method, order_type, table_number, created_at, staff_id, order_items(item_name, item_price, quantity)')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .not('staff_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Group by staff_id
  const staffIds = [...new Set((orders ?? []).map(o => o.staff_id).filter(Boolean))] as string[];
  let staffMap: Record<string, string> = {};

  if (staffIds.length > 0) {
    const { data: staffRows } = await db
      .from('staff')
      .select('id, full_name, role')
      .in('id', staffIds);
    for (const s of staffRows ?? []) {
      staffMap[s.id] = `${s.full_name} (${s.role})`;
    }
  }

  const grouped = staffIds.map(sid => ({
    staff_id: sid,
    staff_name: staffMap[sid] ?? 'Unknown',
    orders: (orders ?? []).filter(o => o.staff_id === sid),
    total_orders: (orders ?? []).filter(o => o.staff_id === sid).length,
    total_revenue: (orders ?? []).filter(o => o.staff_id === sid).reduce((s, o) => s + (o.total ?? 0), 0),
  })).sort((a, b) => b.total_revenue - a.total_revenue);

  return NextResponse.json({ date: targetDate, sessions: grouped });
}
