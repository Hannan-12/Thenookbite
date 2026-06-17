import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { UsersClient } from './UsersClient';
import { buildCustomerList } from '@/lib/customer-stats';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers — TNB Admin' };

export default async function UsersPage() {
  await requireAdmin();
  const users = await buildCustomerList(createServiceClient());

  return (
    <AdminShell>
      <UsersClient initialUsers={users} />
    </AdminShell>
  );
}
