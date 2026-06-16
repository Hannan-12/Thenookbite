import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MyOrdersClient from './MyOrdersClient';

export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/my-orders');

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, payment_method, payment_status, total, created_at,
      order_items ( item_name, item_price, quantity )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="bg-surface min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-12 sm:py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-3">MY ACCOUNT</p>
          <h1 className="font-heading text-3xl sm:text-5xl text-white leading-none">MY ORDERS</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <MyOrdersClient orders={orders ?? []} />

        <div className="mt-8">
          <Link
            href="/profile"
            className="font-heading text-xs tracking-widest text-muted hover:text-primary transition-colors duration-200 flex items-center gap-1"
          >
            ← BACK TO PROFILE
          </Link>
        </div>
      </div>
    </div>
  );
}
