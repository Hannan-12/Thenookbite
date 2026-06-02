import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');
  const db = createServiceClient();

  let query = db.from('menu_items').select('*').eq('available', true).order('sort_order');
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}
