import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/admin-auth';

// PATCH /api/pos/session/:id — close the session (set ended_at)
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authErr = await requireStaffApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { error } = await db
    .from('pos_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
