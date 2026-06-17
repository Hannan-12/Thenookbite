import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON in request body' }, { status: 400 });
  }
  const { available } = body;
  const db = createServiceClient();

  const { data, error } = await db
    .from('menu_items')
    .update({ available })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 404 });
  return NextResponse.json(data);
}
