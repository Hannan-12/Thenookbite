import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

// GET /api/admin/recipes?menu_item_id=xxx  — get recipe for a menu item
export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const menu_item_id = req.nextUrl.searchParams.get('menu_item_id');
  const db = createServiceClient();

  let query = db
    .from('recipes')
    .select('id, quantity, ingredient_id, ingredients(id, name, unit)')
    .order('created_at');

  if (menu_item_id) query = query.eq('menu_item_id', menu_item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/recipes — add ingredient to recipe
export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { menu_item_id, ingredient_id, quantity } = await req.json();
  if (!menu_item_id || !ingredient_id) {
    return NextResponse.json({ detail: 'menu_item_id and ingredient_id are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from('recipes')
    .upsert({ menu_item_id, ingredient_id, quantity: quantity ?? 1 }, { onConflict: 'menu_item_id,ingredient_id' })
    .select('id, quantity, ingredient_id, ingredients(id, name, unit)')
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
