import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { StaffClient } from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: staff } = await db
    .from('staff')
    .select('id, full_name, email, role, staff_type, pin, is_active, created_at')
    .order('created_at', { ascending: false });

  return (
    <AdminShell>
      <StaffClient initialStaff={staff ?? []} />
    </AdminShell>
  );
}
