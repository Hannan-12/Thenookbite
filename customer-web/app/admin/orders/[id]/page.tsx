import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { OrderDetailClient } from './OrderDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const db = createServiceClient();

  const { data: order } = await db
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', params.id)
    .single();

  if (!order) notFound();

  return (
    <AdminShell>
      <OrderDetailClient order={order} />
    </AdminShell>
  );
}
