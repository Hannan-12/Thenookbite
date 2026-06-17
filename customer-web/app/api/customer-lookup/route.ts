import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { requireStaffApi } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = await requireStaffApi();
  if (authErr) return authErr;

  const phone = req.nextUrl.searchParams.get('phone');

  if (!phone) return NextResponse.json({ detail: 'phone is required' }, { status: 400 });

  const normalized = normalizePhone(phone);
  if (!isValidPakistaniPhone(normalized)) {
    return NextResponse.json({ detail: 'Invalid phone number' }, { status: 400 });
  }

  const db = createServiceClient();

  // Get last 5 orders for this phone, most recent first
  const { data: orders, error } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, total, status, created_at, order_items(item_name, quantity, item_price)')
    .eq('customer_phone', normalized)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  // Return customer name from most recent order + order history
  const customer_name = orders?.[0]?.customer_name ?? null;

  return NextResponse.json({ customer_name, orders: orders ?? [] });
}
