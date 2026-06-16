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

  // Latest check-in per staff member
  const { data: lastSeen } = await db
    .from('attendance')
    .select('staff_id, check_in')
    .not('check_in', 'is', null)
    .order('check_in', { ascending: false });

  const lastSeenMap: Record<string, string> = {};
  for (const row of lastSeen ?? []) {
    if (row.staff_id && !lastSeenMap[row.staff_id]) {
      lastSeenMap[row.staff_id] = row.check_in;
    }
  }

  const staffWithLastSeen = (staff ?? []).map(s => ({
    ...s,
    last_seen: lastSeenMap[s.id] ?? null,
  }));

  return (
    <AdminShell>
      <StaffClient initialStaff={staffWithLastSeen} />
    </AdminShell>
  );
}
