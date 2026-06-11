import { requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { AttendanceClient } from './AttendanceClient';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AttendanceClient />
    </AdminShell>
  );
}
