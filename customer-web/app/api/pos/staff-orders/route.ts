import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const staffId  = req.nextUrl.searchParams.get('staff_id');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!staffId) return NextResponse.json({ detail: 'staff_id required' }, { status: 400 });

  const db = createServiceClient();

  // 24-hour lookback to catch the full working day regardless of server timezone
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, total, order_type, table_number, delivery_address, rider_name, payment_method, payment_status, special_notes, created_at, session_id, order_items(item_name, item_price, quantity)')
    .eq('staff_id', staffId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Back-fill session_id on orders that are missing it (created before session tracking)
  if (sessionId && data?.length) {
    const unlinked = data.filter(o => !o.session_id).map(o => o.id);
    if (unlinked.length) {
      await db.from('orders').update({ session_id: sessionId }).in('id', unlinked);
    }
  }

  return NextResponse.json(data ?? []);
}
