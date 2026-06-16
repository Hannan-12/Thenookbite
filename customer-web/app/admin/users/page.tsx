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

  const [profilesRes, ordersRes] = await Promise.all([
    userIds.length > 0
      ? db.from('profiles').select('id, full_name, phone').in('id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? db.from('orders').select('user_id, total, created_at, status').in('user_id', userIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map((p: { id: string; full_name: string | null; phone: string | null }) => [p.id, p])
  );

  const ordersByUser: Record<string, { count: number; totalSpent: number; lastOrder: string | null }> = {};
  for (const o of ordersRes.data ?? []) {
    if (!o.user_id) continue;
    if (!ordersByUser[o.user_id]) ordersByUser[o.user_id] = { count: 0, totalSpent: 0, lastOrder: null };
    ordersByUser[o.user_id].count++;
    if (o.status === 'completed') ordersByUser[o.user_id].totalSpent += o.total ?? 0;
    if (!ordersByUser[o.user_id].lastOrder) ordersByUser[o.user_id].lastOrder = o.created_at;
  }

  const users = customerAuthUsers.map(u => {
    const profile = profileMap[u.id];
    const stats = ordersByUser[u.id] ?? { count: 0, totalSpent: 0, lastOrder: null };
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: profile?.full_name ?? (u.user_metadata?.full_name as string | null) ?? null,
      phone: profile?.phone ?? null,
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
