import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { MenuItemEditor } from './MenuItemEditor';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MenuItemPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const db = createServiceClient();

  const { data: item } = await db
    .from('menu_items')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!item) notFound();

  return (
    <AdminShell>
      <MenuItemEditor item={item} />
    </AdminShell>
  );
}
