import { requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { POSSessionsClient } from './POSSessionsClient';

export const dynamic = 'force-dynamic';

export default async function POSSessionsPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <POSSessionsClient />
    </AdminShell>
  );
}
