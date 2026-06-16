import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// Public — runs on internal network (same as kitchen display)
export async function GET() {
  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, table_number, total, payment_method, special_notes, created_at, order_items(item_name, quantity, item_price)')
    .eq('source', 'online')
    .eq('verified', false)
    .in('status', ['pending'])
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  const { id, action, reject_reason } = await req.json() as {
    id: string;
    action: 'approve' | 'reject';
    reject_reason?: string;
  };

  if (!id || !action) return NextResponse.json({ detail: 'id and action required' }, { status: 400 });

  const db = createServiceClient();

  if (action === 'approve') {
    const { error } = await db
      .from('orders')
      .update({ verified: true })
      .eq('id', id);
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    // Mark as completed with a note so it disappears from kitchen but is recorded
    const { error } = await db
      .from('orders')
      .update({ status: 'cancelled', verified: true, special_notes: reject_reason ? `REJECTED: ${reject_reason}` : 'REJECTED' })
      .eq('id', id);
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ detail: 'invalid action' }, { status: 400 });
}
