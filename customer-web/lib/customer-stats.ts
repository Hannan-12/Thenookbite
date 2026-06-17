import { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerInfo {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_banned: boolean;
  joined_at: string;
  last_sign_in: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
}

type ProfileRow = { id: string; full_name: string | null; phone: string | null; is_banned: boolean | null };
type OrderRow = { id: string; user_id: string | null; customer_phone: string | null; total: number; created_at: string; status: string };

/**
 * Build enriched customer list from Supabase auth users.
 * Shared between the admin users SSR page and the admin users API route.
 */
export async function buildCustomerList(db: SupabaseClient): Promise<CustomerInfo[]> {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';

  const { data: authData, error: authErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) throw authErr;

  const { data: staffRows } = await db.from('staff').select('id');
  const staffIds = new Set((staffRows ?? []).map((s: { id: string }) => s.id));

  const customerAuthUsers = (authData.users ?? []).filter(
    u => u.email !== adminEmail && !staffIds.has(u.id),
  );

  if (customerAuthUsers.length === 0) return [];

  const userIds = customerAuthUsers.map(u => u.id);

  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone, is_banned')
    .in('id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: ProfileRow) => [p.id, p]),
  );

  const phoneToUserId: Record<string, string> = {};
  for (const p of (profiles ?? []) as ProfileRow[]) {
    if (p.phone) phoneToUserId[p.phone] = p.id;
  }

  const phones = Object.keys(phoneToUserId);

  const [byUserRes, byPhoneRes] = await Promise.all([
    db.from('orders')
      .select('id, user_id, customer_phone, total, created_at, status')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
    phones.length > 0
      ? db.from('orders')
          .select('id, user_id, customer_phone, total, created_at, status')
          .is('user_id', null)
          .in('customer_phone', phones)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as OrderRow[] }),
  ]);

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

  return customerAuthUsers.map(u => {
    const profile = profileMap[u.id] as ProfileRow | undefined;
    const stats = ordersByUser[u.id] ?? { count: 0, totalSpent: 0, lastOrder: null };
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: profile?.full_name ?? (u.user_metadata?.full_name as string | null) ?? null,
      phone: profile?.phone ?? null,
      is_banned: profile?.is_banned ?? false,
      joined_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      order_count: stats.count,
      total_spent: stats.totalSpent,
      last_order_at: stats.lastOrder,
    };
  }).sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
}
