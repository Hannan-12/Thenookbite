import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import MyOrdersClient from './MyOrdersClient';

export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/my-orders');

  const db = createServiceClient();
  const sel = `id, status, payment_method, payment_status, total, created_at, order_items ( item_name, item_price, quantity )`;

  // Get profile phone for guest-order matching
  const { data: profile } = await db.from('profiles').select('phone').eq('id', user.id).single();

  const [byUser, byPhone] = await Promise.all([
    db.from('orders').select(sel).eq('user_id', user.id),
    profile?.phone
      ? db.from('orders').select(sel).is('user_id', null).eq('customer_phone', profile.phone)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const seen = new Set<string>();
  const merged: typeof byUser.data = [];
  for (const o of [...(byUser.data ?? []), ...((byPhone as { data: typeof byUser.data }).data ?? [])]) {
    if (o && !seen.has(o.id)) { seen.add(o.id); merged.push(o); }
  }
  merged.sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime());
  const orders = merged.slice(0, 50);

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
        <MyOrdersClient orders={orders ?? []} userId={user.id} />

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
