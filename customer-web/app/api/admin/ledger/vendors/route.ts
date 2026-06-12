import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { data, error } = await db
    .from('vendors')
    .select('id, name, phone, category, notes, created_at')
    .order('name');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { name, phone, category, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ detail: 'name is required' }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from('vendors')
    .insert({ name: name.trim(), phone: phone?.trim() || null, category: category?.trim() || null, notes: notes?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
