import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const body = await req.json();
  const { data, error } = await result.db
    .from('staff')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  if (body.is_active === false) {
    await result.db.auth.admin.signOut(params.id, 'others');
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { error } = await result.db
    .from('staff')
    .update({ is_active: false })
    .eq('id', params.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  await result.db.auth.admin.signOut(params.id, 'others');

  return NextResponse.json({ ok: true });
}
