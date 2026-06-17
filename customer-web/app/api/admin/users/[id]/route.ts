import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON in request body' }, { status: 400 });
  }
  const { is_banned } = body as { is_banned: boolean };
  const db = createServiceClient();

  // Upsert profile row with is_banned flag
  const { error } = await db
    .from('profiles')
    .upsert({ id: params.id, is_banned }, { onConflict: 'id' });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // If banning, also revoke their active sessions immediately
  if (is_banned) {
    const { error: signOutErr } = await db.auth.admin.signOut(params.id, 'others');
    if (signOutErr) console.error('Failed to sign out banned user', params.id, signOutErr.message);
  }

  return NextResponse.json({ ok: true, is_banned });
}
