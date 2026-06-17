import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { data, error } = await result.db
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { name, unit } = await req.json();
  if (!name?.trim()) return NextResponse.json({ detail: 'name is required' }, { status: 400 });

  const { data, error } = await result.db
    .from('ingredients')
    .insert({ name: name.trim(), unit: unit ?? 'g' })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
