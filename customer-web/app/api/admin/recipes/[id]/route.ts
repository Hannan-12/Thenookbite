import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { quantity } = await req.json();
  const { data, error } = await result.db
    .from('recipes')
    .update({ quantity })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { error } = await result.db.from('recipes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
