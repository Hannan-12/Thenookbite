import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { pkDate } from '@/lib/timezone';

export async function GET(req: NextRequest) {
  const date   = req.nextUrl.searchParams.get('date');
  const month  = req.nextUrl.searchParams.get('month'); // YYYY-MM
  const db     = createServiceClient();

  const todayPKT = pkDate();

  let fromISO: string;
  let toISO: string;

  if (month) {
    fromISO = `${month}-01T00:00:00+05:00`;
    // Last day of month
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    toISO = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59+05:00`;
  } else {
    const targetDate = date ?? todayPKT;
    fromISO = `${targetDate}T00:00:00+05:00`;
    toISO   = `${targetDate}T23:59:59+05:00`;
  }

  // Fetch sessions in range
  const { data: sessions, error: sessErr } = await db
    .from('pos_sessions')
    .select('id, staff_id, started_at, ended_at')
    .gte('started_at', fromISO)
    .lte('started_at', toISO)
    .order('started_at', { ascending: false });

  if (sessErr) return NextResponse.json({ detail: sessErr.message }, { status: 500 });

  if (!sessions?.length) {
    return NextResponse.json({ sessions: [] });
  }

  // Fetch staff names — fall back to admin label if not in staff table
  const staffIds = [...new Set(sessions.map(s => s.staff_id))];
  const { data: staffRows } = await db
    .from('staff')
    .select('id, full_name, role')
    .in('id', staffIds);

  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  const { data: authUsers } = await db.auth.admin.listUsers();
  const authMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) {
    authMap[u.id] = (u.user_metadata?.full_name as string) || u.email || 'Admin';
  }

  const staffMap: Record<string, { name: string; role: string }> = {};
  for (const s of staffRows ?? []) {
    staffMap[s.id] = { name: s.full_name, role: s.role };
  }
  // Fill in any IDs not found in staff table (e.g. admin)
  for (const id of staffIds) {
    if (!staffMap[id]) {
      staffMap[id] = { name: authMap[id] ?? 'Admin', role: 'admin' };
    }
  }

  // Fetch all orders belonging to these sessions
  const sessionIds = sessions.map(s => s.id);
  const { data: orders, error: ordErr } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, total, status, payment_method, order_type, table_number, created_at, session_id, order_items(item_name, item_price, quantity)')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false });

  if (ordErr) return NextResponse.json({ detail: ordErr.message }, { status: 500 });

  // Build response: one entry per session
  const result = sessions.map(sess => {
    const sessOrders        = (orders ?? []).filter(o => o.session_id === sess.id);
    const activeOrders      = sessOrders.filter(o => o.status !== 'cancelled');
    const staff             = staffMap[sess.staff_id];
    return {
      session_id:    sess.id,
      staff_id:      sess.staff_id,
      staff_name:    staff?.name ?? 'Unknown',
      staff_role:    staff?.role ?? 'cashier',
      started_at:    sess.started_at,
      ended_at:      sess.ended_at,
      orders:        sessOrders,
      total_orders:  activeOrders.length,
      total_revenue: activeOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    };
  });

  return NextResponse.json({ sessions: result });
}
