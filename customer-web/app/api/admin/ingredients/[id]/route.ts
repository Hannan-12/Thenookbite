import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const body = await req.json();
  const db = createServiceClient();
  const { data, error } = await db
    .from('ingredients')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { error } = await db.from('ingredients').delete().eq('id', params.id);
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
