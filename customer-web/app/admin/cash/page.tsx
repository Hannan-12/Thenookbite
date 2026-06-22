import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { CashClient } from './CashClient';

export const dynamic = 'force-dynamic';

export default async function CashPage() {
  await requireAdmin();
  const db = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: cashOrders } = await db
    .from('orders')
    .select('total, payment_method, payment_status')
    .gte('created_at', today.toISOString())
    .in('payment_method', ['cash', 'pay_later'])
    .eq('payment_status', 'paid');

  const cashTotal = (cashOrders ?? [])
    .filter(o => o.payment_method === 'cash')
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const { data: resets } = await db
    .from('cash_resets')
    .select('id, amount_at_reset, reset_at, reset_by')
    .order('reset_at', { ascending: false })
    .limit(10);

  const lastReset = resets?.[0];
  let cashSinceReset = cashTotal;
  if (lastReset) {
    const { data: sinceReset } = await db
      .from('orders')
      .select('total, payment_method, payment_status')
      .gte('created_at', lastReset.reset_at)
      .in('payment_method', ['cash', 'pay_later'])
      .eq('payment_status', 'paid');
    cashSinceReset = (sinceReset ?? [])
      .filter(o => o.payment_method === 'cash')
      .reduce((s, o) => s + (o.total ?? 0), 0);
  }

  return <CashClient initial={{ cashTotal, cashSinceReset, resets: resets ?? [] }} />;
}
