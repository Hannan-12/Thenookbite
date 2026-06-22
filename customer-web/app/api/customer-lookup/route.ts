import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { checkRateLimit } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  const rateLimitErr = await checkRateLimit(req, 'lookup');
  if (rateLimitErr) return rateLimitErr;

  // Require authenticated session (staff or admin — not a public endpoint)
  const sessionClient = createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

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
