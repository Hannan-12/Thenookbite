import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const menu_item_id = req.nextUrl.searchParams.get('menu_item_id');

  let query = result.db
    .from('recipes')
    .select('id, quantity, ingredient_id, ingredients(id, name, unit)')
    .order('created_at');

  if (menu_item_id) query = query.eq('menu_item_id', menu_item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { menu_item_id, ingredient_id, quantity } = await req.json();
  if (!menu_item_id || !ingredient_id) {
    return NextResponse.json({ detail: 'menu_item_id and ingredient_id are required' }, { status: 400 });
  }

  const { data, error } = await result.db
    .from('recipes')
    .upsert({ menu_item_id, ingredient_id, quantity: quantity ?? 1 }, { onConflict: 'menu_item_id,ingredient_id' })
    .select('id, quantity, ingredient_id, ingredients(id, name, unit)')
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
