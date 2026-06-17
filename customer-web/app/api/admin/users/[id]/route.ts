import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { is_banned } = await req.json() as { is_banned: boolean };

  const { error } = await result.db
    .from('profiles')
    .upsert({ id: params.id, is_banned }, { onConflict: 'id' });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  if (is_banned) {
    await result.db.auth.admin.signOut(params.id, 'others');
  }

  return NextResponse.json({ ok: true, is_banned });
}
