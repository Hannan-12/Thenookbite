import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { is_banned } = await req.json() as { is_banned: boolean };
  const db = createServiceClient();

  // Upsert profile row with is_banned flag
  const { error } = await db
    .from('profiles')
    .upsert({ id: params.id, is_banned }, { onConflict: 'id' });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // If banning, also revoke their active sessions immediately
  if (is_banned) {
    await db.auth.admin.signOut(params.id, 'others');
  }

  return NextResponse.json({ ok: true, is_banned });
}
