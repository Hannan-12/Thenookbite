import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();

  // Fetch all auth users
  const { data: authData, error: authErr2 } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (authErr2) return NextResponse.json({ detail: authErr2.message }, { status: 500 });

  const adminEmail = process.env.ADMIN_EMAIL ?? '';

  // Filter out admin account and staff accounts
  const { data: staffRows } = await db.from('staff').select('id');
  const staffIds = new Set((staffRows ?? []).map((s: { id: string }) => s.id));

  const customerAuthUsers = (authData.users ?? []).filter(
    u => u.email !== adminEmail && !staffIds.has(u.id)
  );

  if (customerAuthUsers.length === 0) return NextResponse.json([]);

  const userIds = customerAuthUsers.map(u => u.id);

  // Fetch profiles
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone, is_banned')
    .in('id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: { id: string; full_name: string | null; phone: string | null; is_banned: boolean | null }) => [p.id, p])
  );

  // Fetch order stats per user
  const { data: orders } = await db
    .from('orders')
    .select('user_id, total, created_at, status')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  const ordersByUser: Record<string, { count: number; totalSpent: number; lastOrder: string | null }> = {};
  for (const o of orders ?? []) {
    if (!o.user_id) continue;
    if (!ordersByUser[o.user_id]) ordersByUser[o.user_id] = { count: 0, totalSpent: 0, lastOrder: null };
    ordersByUser[o.user_id].count++;
    if (o.status === 'completed') ordersByUser[o.user_id].totalSpent += o.total ?? 0;
    if (!ordersByUser[o.user_id].lastOrder) ordersByUser[o.user_id].lastOrder = o.created_at;
  }

  const result = customerAuthUsers.map(u => {
    const profile = profileMap[u.id];
    const stats = ordersByUser[u.id] ?? { count: 0, totalSpent: 0, lastOrder: null };
    return {
      id: u.id,
      email: u.email,
      full_name: profile?.full_name ?? u.user_metadata?.full_name ?? null,
      phone: profile?.phone ?? null,
      is_banned: profile?.is_banned ?? false,
      joined_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      order_count: stats.count,
      total_spent: stats.totalSpent,
      last_order_at: stats.lastOrder,
    };
  }).sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

  return NextResponse.json(result);
}
