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
  const db = createServiceClient();

  const { data, error } = await db
    .from('staff')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // If deactivating, kill their auth session immediately
  if (body.is_active === false) {
    const { error: signOutErr } = await db.auth.admin.signOut(params.id, 'others');
    if (signOutErr) console.error('Failed to sign out deactivated staff', params.id, signOutErr.message);
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();

  // Deactivate instead of hard delete to preserve order history
  const { error } = await db
    .from('staff')
    .update({ is_active: false })
    .eq('id', params.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Kill their auth session immediately
  const { error: signOutErr } = await db.auth.admin.signOut(params.id, 'others');
  if (signOutErr) console.error('Failed to sign out deleted staff', params.id, signOutErr.message);

  return NextResponse.json({ ok: true });
}
