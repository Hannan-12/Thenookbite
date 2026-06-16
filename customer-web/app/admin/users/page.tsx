import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers — TNB Admin' };

export default async function UsersPage() {
  await requireAdmin();

  const db = createServiceClient();
  const adminEmail = process.env.ADMIN_EMAIL ?? '';

  const { data: authData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const { data: staffRows } = await db.from('staff').select('id');
  const staffIds = new Set((staffRows ?? []).map((s: { id: string }) => s.id));

  const customerAuthUsers = (authData?.users ?? []).filter(
    u => u.email !== adminEmail && !staffIds.has(u.id)
  );

  const userIds = customerAuthUsers.map(u => u.id);

  const profilesRes = userIds.length > 0
    ? await db.from('profiles').select('id, full_name, phone, is_banned').in('id', userIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map((p: { id: string; full_name: string | null; phone: string | null; is_banned: boolean | null }) => [p.id, p])
  );

  // Build phone → userId map so guest orders (user_id=null) can be matched by phone
  const phoneToUserId: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) {
    if (p.phone) phoneToUserId[p.phone] = p.id;
  }

  // Fetch all orders — by user_id OR by customer_phone matching a known profile
  const phones = Object.keys(phoneToUserId);
  const [byUserRes, byPhoneRes] = await Promise.all([
    userIds.length > 0
      ? db.from('orders').select('id, user_id, customer_phone, total, created_at, status').in('user_id', userIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    phones.length > 0
      ? db.from('orders').select('id, user_id, customer_phone, total, created_at, status').is('user_id', null).in('customer_phone', phones).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  type OrderRow = { id: string; user_id: string | null; customer_phone: string | null; total: number; created_at: string; status: string };
  const seenOrderIds = new Set<string>();
  const allOrders: OrderRow[] = [];
  for (const o of [...(byUserRes.data ?? []), ...(byPhoneRes.data ?? [])]) {
    if (!seenOrderIds.has(o.id)) { seenOrderIds.add(o.id); allOrders.push(o as OrderRow); }
  }

  const ordersByUser: Record<string, { count: number; totalSpent: number; lastOrder: string | null }> = {};
  for (const o of allOrders) {
    // Resolve which user this order belongs to
    const uid = o.user_id ?? (o.customer_phone ? phoneToUserId[o.customer_phone] : null);
    if (!uid) continue;
    if (!ordersByUser[uid]) ordersByUser[uid] = { count: 0, totalSpent: 0, lastOrder: null };
    ordersByUser[uid].count++;
    if (o.status === 'completed') ordersByUser[uid].totalSpent += o.total ?? 0;
    if (!ordersByUser[uid].lastOrder) ordersByUser[uid].lastOrder = o.created_at;
  }

  const users = customerAuthUsers.map(u => {
    const profile = profileMap[u.id];
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

  return (
    <AdminShell>
      <UsersClient initialUsers={users} />
    </AdminShell>
  );
}
