import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { checkRateLimit } from '@/lib/ratelimit';

const VALID_STATUSES = new Set(['pending', 'preparing', 'ready', 'completed']);

const CARD_SURCHARGE_RATE = 0.015; // 1.5% per bank agreement

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    customer_name, customer_phone, table_number, special_notes,
    payment_method, items, user_id, staff_id, session_id,
    order_type, tip, delivery_address, rider_name,
    discount_type, discount_value, idempotency_key,
  } = body;

  const rateLimitErr = await checkRateLimit(req, 'order');
  if (rateLimitErr) return rateLimitErr;

  if (!customer_name || !items?.length) {
    return NextResponse.json({ detail: 'customer_name and items are required' }, { status: 400 });
  }

  // If staff_id is present this is a POS order — require an authenticated session
  if (staff_id) {
    const sessionClient = createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    if (user.id !== staff_id) return NextResponse.json({ detail: 'Forbidden: staff_id mismatch' }, { status: 403 });
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

  // Idempotency: if this key was already used, return the existing order
  if (idempotency_key && typeof idempotency_key === 'string') {
    const { data: existing } = await db
      .from('orders')
      .select()
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

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

  const itemsTotal = items.reduce((sum: number, i: { item_price: number; quantity: number }) => sum + i.item_price * i.quantity, 0);
  const tipAmount  = typeof tip === 'number' && tip > 0 ? Math.round(tip) : 0;

  // Server-side discount calculation (never trust client-sent totals)
  let discountAmount = 0;
  if (discount_type === 'flat' && typeof discount_value === 'number' && discount_value > 0) {
    discountAmount = Math.min(Math.round(discount_value), itemsTotal); // cap at itemsTotal
  } else if (discount_type === 'pct' && typeof discount_value === 'number' && discount_value > 0 && discount_value <= 100) {
    discountAmount = Math.round(itemsTotal * (discount_value / 100));
  }

  const afterDiscount = itemsTotal - discountAmount + tipAmount;

  // Card surcharge applied server-side (1.5% per bank agreement)
  const total = payment_method === 'card'
    ? Math.ceil(afterDiscount * (1 + CARD_SURCHARGE_RATE))
    : afterDiscount;

  const VALID_ORDER_TYPES = new Set(['dine-in', 'takeaway', 'delivery']);
  const resolvedOrderType = VALID_ORDER_TYPES.has(order_type) ? order_type : 'dine-in';

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      customer_name,
      customer_phone: phone,
      table_number: table_number || null,
      special_notes: special_notes || null,
      payment_method,
      payment_status: payment_method === 'cash' ? 'paid' : payment_method === 'pay_later' ? 'pending' : 'pending',
      status: 'pending',
      total,
      tip: tipAmount,
      order_type: resolvedOrderType,
      delivery_address: resolvedOrderType === 'delivery' ? (delivery_address || null) : null,
      rider_name: resolvedOrderType === 'delivery' ? (rider_name || null) : null,
      user_id: user_id || null,
      staff_id: staff_id || null,
      session_id: session_id || null,
      source: staff_id ? 'pos' : 'online',
      verified: !!staff_id,
      idempotency_key: idempotency_key || null,
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

        // Atomic deduction: single UPDATE avoids read-then-write race condition
        for (const [ingredientId, amount] of Object.entries(deductions)) {
          const { data: updated } = await db.rpc('deduct_ingredient_stock', {
            p_ingredient_id: ingredientId,
            p_amount: amount,
          });
          // deduct_ingredient_stock returns the new stock_qty, or null if stock was insufficient
          // We still log the movement even if stock hits 0 (floor is 0 inside the RPC)
          if (updated !== null) {
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
  const status  = req.nextUrl.searchParams.get('status');
  const user_id = req.nextUrl.searchParams.get('user_id');
  const limit   = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 200);
  const before  = req.nextUrl.searchParams.get('before'); // cursor: created_at ISO string
  const db = createServiceClient();

  let query = db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(limit);

  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(s => VALID_STATUSES.has(s));
    if (statuses.length === 1) query = query.eq('status', statuses[0]);
    else if (statuses.length > 1) query = query.in('status', statuses);
  }
  if (user_id) query = query.eq('user_id', user_id);
  if (before)  query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  const next_cursor = data && data.length === limit ? data[data.length - 1].created_at : null;
  return NextResponse.json({ orders: data, next_cursor });
}
