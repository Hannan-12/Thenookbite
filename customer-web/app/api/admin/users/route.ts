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

  // Build phone → userId map for matching guest orders
  const phoneToUserId: Record<string, string> = {};
  for (const p of profiles ?? []) {
    if (p.phone) phoneToUserId[p.phone] = p.id;
  }

  const phones = Object.keys(phoneToUserId);
  const [byUserRes, byPhoneRes] = await Promise.all([
    db.from('orders').select('id, user_id, customer_phone, total, created_at, status').in('user_id', userIds).order('created_at', { ascending: false }),
    phones.length > 0
      ? db.from('orders').select('id, user_id, customer_phone, total, created_at, status').is('user_id', null).in('customer_phone', phones).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  type OrderRow = { id: string; user_id: string | null; customer_phone: string | null; total: number; created_at: string; status: string };
  const seenIds = new Set<string>();
  const allOrders: OrderRow[] = [];
  for (const o of [...(byUserRes.data ?? []), ...(byPhoneRes.data ?? [])]) {
    if (!seenIds.has(o.id)) { seenIds.add(o.id); allOrders.push(o as OrderRow); }
  }

  const ordersByUser: Record<string, { count: number; totalSpent: number; lastOrder: string | null }> = {};
  for (const o of allOrders) {
    const uid = o.user_id ?? (o.customer_phone ? phoneToUserId[o.customer_phone] : null);
    if (!uid) continue;
    if (!ordersByUser[uid]) ordersByUser[uid] = { count: 0, totalSpent: 0, lastOrder: null };
    ordersByUser[uid].count++;
    if (o.status === 'completed') ordersByUser[uid].totalSpent += o.total ?? 0;
    if (!ordersByUser[uid].lastOrder) ordersByUser[uid].lastOrder = o.created_at;
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
