import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { data, error } = await result.db
    .from('vendors')
    .select('id, name, phone, category, notes, created_at')
    .order('name');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { name, phone, category, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ detail: 'name is required' }, { status: 400 });

  const { data, error } = await result.db
    .from('vendors')
    .insert({ name: name.trim(), phone: phone?.trim() || null, category: category?.trim() || null, notes: notes?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
