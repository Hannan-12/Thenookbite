import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

// PATCH: update stock_qty (restock) or low_stock_threshold
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON in request body' }, { status: 400 });
  }
  const { stock_qty, low_stock_threshold, note } = body;
  const db = createServiceClient();

  // Fetch current qty first
  const { data: current } = await db
    .from('ingredients')
    .select('stock_qty')
    .eq('id', params.id)
    .single();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (stock_qty !== undefined) updates.stock_qty = stock_qty;
  if (low_stock_threshold !== undefined) updates.low_stock_threshold = low_stock_threshold;

  const { data, error } = await db
    .from('ingredients')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, unit, stock_qty, low_stock_threshold, updated_at')
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

  // Log stock movement if qty changed
  if (stock_qty !== undefined && current) {
    const qtyChange = stock_qty - current.stock_qty;
    await db.from('stock_movements').insert({
      ingredient_id: params.id,
      qty_change: qtyChange,
      reason: 'restock',
      note: note ?? null,
    });
  }

  return NextResponse.json({ ...data, low_stock: data.stock_qty <= data.low_stock_threshold });
}
