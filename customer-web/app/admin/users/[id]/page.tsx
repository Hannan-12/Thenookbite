import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { CustomerDetailClient } from './CustomerDetailClient';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const db = createServiceClient();
  const { id } = params;

  // Auth user
  const { data: { user: authUser }, error: authErr } = await db.auth.admin.getUserById(id);
  if (authErr || !authUser) notFound();

  // Profile
  const { data: profile } = await db
    .from('profiles')
    .select('full_name, phone, is_banned')
    .eq('id', id)
    .single();

  // All orders — by user_id OR by phone (guest orders)
  const phone = profile?.phone ?? null;
  const [byUserRes, byPhoneRes] = await Promise.all([
    db.from('orders')
      .select('id, status, total, payment_method, customer_name, table_number, special_notes, created_at, order_items(item_name, quantity, item_price)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    phone
      ? db.from('orders')
          .select('id, status, total, payment_method, customer_name, table_number, special_notes, created_at, order_items(item_name, quantity, item_price)')
          .is('user_id', null)
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  type OrderRow = {
    id: string; status: string; total: number; payment_method: string;
    customer_name: string; table_number: string | null; special_notes: string | null;
    created_at: string;
    order_items: { item_name: string; quantity: number; item_price: number }[];
  };

  const seen = new Set<string>();
  const orders: OrderRow[] = [];
  for (const o of [...(byUserRes.data ?? []), ...(byPhoneRes.data ?? [])]) {
    if (!seen.has(o.id)) { seen.add(o.id); orders.push(o as OrderRow); }
  }

  const totalSpent   = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const orderCount   = orders.length;

  const customer = {
    id,
    email: authUser.email ?? '',
    full_name: profile?.full_name ?? (authUser.user_metadata?.full_name as string | null) ?? null,
    phone: profile?.phone ?? null,
    is_banned: profile?.is_banned ?? false,
    joined_at: authUser.created_at,
    last_sign_in: authUser.last_sign_in_at ?? null,
    order_count: orderCount,
    total_spent: totalSpent,
  };

  return (
    <AdminShell>
      <CustomerDetailClient customer={customer} orders={orders} />
    </AdminShell>
  );
}
