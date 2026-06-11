import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { data, error } = await db
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { name, unit } = await req.json();
  if (!name?.trim()) return NextResponse.json({ detail: 'name is required' }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from('ingredients')
    .insert({ name: name.trim(), unit: unit ?? 'g' })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
