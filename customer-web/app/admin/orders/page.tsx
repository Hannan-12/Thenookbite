import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminOrdersClient } from './AdminOrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: orders } = await db
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <AdminShell>
      <AdminOrdersClient initialOrders={orders ?? []} />
    </AdminShell>
  );
}
