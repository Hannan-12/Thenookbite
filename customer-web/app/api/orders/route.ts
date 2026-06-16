import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';

const VALID_STATUSES = new Set(['pending', 'preparing', 'ready', 'completed']);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_name, customer_phone, table_number, special_notes, payment_method, items, user_id, staff_id } = body;

  if (!customer_name || !items?.length) {
    return NextResponse.json({ detail: 'customer_name and items are required' }, { status: 400 });
  }

  // Phone validation — required, must be valid Pakistani mobile
  if (!customer_phone) {
    return NextResponse.json({ detail: 'customer_phone is required' }, { status: 400 });
  }
  const phone = normalizePhone(customer_phone);
  if (!isValidPakistaniPhone(phone)) {
    return NextResponse.json({ detail: 'Phone must be a valid Pakistani mobile number starting with 03 (e.g. 03001234567)' }, { status: 400 });
  }

  const db = createServiceClient();

  // Block banned customers
  if (user_id) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_banned')
      .eq('id', user_id)
      .single();
    if (profile?.is_banned) {
      return NextResponse.json({ detail: 'Your account has been suspended. Please contact the restaurant.' }, { status: 403 });
    }
  }

  const total = items.reduce((sum: number, i: { item_price: number; quantity: number }) => sum + i.item_price * i.quantity, 0);

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      customer_name,
      customer_phone: phone,
      table_number: table_number || null,
      special_notes: special_notes || null,
      payment_method,
      payment_status: payment_method === 'cash' ? 'paid' : 'pending',
      status: 'pending',
      total,
      user_id: user_id || null,
      staff_id: staff_id || null,
      source: staff_id ? 'pos' : 'online',
      verified: !!staff_id,
    })
    .select()
    .single();

  if (orderErr) return NextResponse.json({ detail: orderErr.message }, { status: 500 });

  const itemRows = items.map((i: { menu_item_id?: string; item_name: string; item_price: number; quantity: number }) => ({
    order_id: order.id,
    menu_item_id: i.menu_item_id || null,
    item_name: i.item_name,
    item_price: i.item_price,
    quantity: i.quantity,
  }));

  await db.from('order_items').insert(itemRows);

  // Auto-deduct stock based on recipes (fire-and-forget — don't fail the order if this errors)
  try {
    const menuItemIds = items
      .map((i: { menu_item_id?: string; quantity: number }) => i.menu_item_id)
      .filter(Boolean) as string[];

    if (menuItemIds.length > 0) {
      const { data: recipes } = await db
        .from('recipes')
        .select('ingredient_id, quantity, menu_item_id')
        .in('menu_item_id', menuItemIds);

      if (recipes?.length) {
        // Aggregate deductions per ingredient across all order items
        const deductions: Record<string, number> = {};
        for (const item of items as { menu_item_id?: string; quantity: number }[]) {
          if (!item.menu_item_id) continue;
          const itemRecipes = recipes.filter(r => r.menu_item_id === item.menu_item_id);
          for (const r of itemRecipes) {
            deductions[r.ingredient_id] = (deductions[r.ingredient_id] ?? 0) + r.quantity * item.quantity;
          }
        }

        // Deduct from each ingredient
        for (const [ingredientId, amount] of Object.entries(deductions)) {
          const { data: ing } = await db
            .from('ingredients')
            .select('stock_qty')
            .eq('id', ingredientId)
            .single();

          if (ing) {
            const newQty = Math.max(0, ing.stock_qty - amount);
            await db.from('ingredients').update({ stock_qty: newQty, updated_at: new Date().toISOString() }).eq('id', ingredientId);
            await db.from('stock_movements').insert({
              ingredient_id: ingredientId,
              qty_change: -amount,
              reason: 'order',
              order_id: order.id,
            });
          }
        }
      }
    }
  } catch (_) {
    // Stock deduction failure must never block order creation
  }

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const user_id = req.nextUrl.searchParams.get('user_id');
  const db = createServiceClient();

  let query = db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });

  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(s => VALID_STATUSES.has(s));
    if (statuses.length === 1) query = query.eq('status', statuses[0]);
    else if (statuses.length > 1) query = query.in('status', statuses);
  }
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}
