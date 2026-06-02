import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminMenuClient } from './AdminMenuClient';

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: items } = await db
    .from('menu_items')
    .select('id, sku, name, category, price, available')
    .order('category')
    .order('sort_order');

  return (
    <AdminShell>
      <AdminMenuClient initialItems={items ?? []} />
    </AdminShell>
  );
}
