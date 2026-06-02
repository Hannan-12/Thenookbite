import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_STATUSES = new Set(['pending', 'preparing', 'ready', 'completed']);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_name, table_number, special_notes, payment_method, items, user_id } = body;

  if (!customer_name || !items?.length) {
    return NextResponse.json({ detail: 'customer_name and items are required' }, { status: 400 });
  }

  const db = createServiceClient();
  const total = items.reduce((sum: number, i: { item_price: number; quantity: number }) => sum + i.item_price * i.quantity, 0);

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      customer_name,
      table_number: table_number || null,
      special_notes: special_notes || null,
      payment_method,
      payment_status: payment_method === 'cash' ? 'paid' : 'pending',
      status: 'pending',
      total,
      user_id: user_id || null,
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
