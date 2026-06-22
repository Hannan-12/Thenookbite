import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();

  // Cash orders placed today (payment_method=cash, any status)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: cashOrders } = await db
    .from('orders')
    .select('total, payment_method, payment_status')
    .neq('status', 'cancelled')
    .gte('created_at', today.toISOString())
    .in('payment_method', ['cash', 'pay_later'])
    .eq('payment_status', 'paid');

  const cashTotal = (cashOrders ?? [])
    .filter(o => o.payment_method === 'cash')
    .reduce((s, o) => s + (o.total ?? 0), 0);

  // Last reset record
  const { data: resets } = await db
    .from('cash_resets')
    .select('id, amount_at_reset, reset_at, reset_by')
    .order('reset_at', { ascending: false })
    .limit(10);

  // Amount since last reset
  const lastReset = resets?.[0];
  const cashSinceReset = lastReset
    ? await (async () => {
        const { data } = await db
          .from('orders')
          .select('total, payment_method, payment_status')
          .neq('status', 'cancelled')
          .gte('created_at', lastReset.reset_at)
          .in('payment_method', ['cash', 'pay_later'])
          .eq('payment_status', 'paid');
        return (data ?? [])
          .filter(o => o.payment_method === 'cash')
          .reduce((s, o) => s + (o.total ?? 0), 0);
      })()
    : cashTotal;

  return NextResponse.json({ cashTotal, cashSinceReset, resets: resets ?? [] });
}

export async function POST() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();

  // Get current total to record it
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: cashOrders } = await db
    .from('orders')
    .select('total, payment_method, payment_status')
    .neq('status', 'cancelled')
    .gte('created_at', today.toISOString())
    .in('payment_method', ['cash', 'pay_later'])
    .eq('payment_status', 'paid');

  const amountAtReset = (cashOrders ?? [])
    .filter(o => o.payment_method === 'cash')
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const { error } = await db.from('cash_resets').insert({
    amount_at_reset: amountAtReset,
    reset_at: new Date().toISOString(),
    reset_by: 'admin',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, amount_at_reset: amountAtReset });
}
