import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatPKR } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  preparing:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ready:      'bg-green-500/10 text-green-400 border-green-500/20',
  completed:  'bg-white/5 text-muted border-theme',
};

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
        {(!orders || orders.length === 0) ? (
          <div className="py-24 text-center">
            <div className="text-5xl mb-6">🍔</div>
            <h2 className="font-heading text-2xl text-primary">NO ORDERS YET</h2>
            <p className="mt-3 text-sm text-muted">You haven&apos;t placed any orders yet.</p>
            <Link
              href="/menu"
              className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm px-8 py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200"
            >
              ORDER NOW →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const shortId = order.id.slice(-6).toUpperCase();
              const date = new Date(order.created_at).toLocaleDateString('en-PK', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.completed;

              return (
                <div
                  key={order.id}
                  className="bg-card border border-theme rounded-sm overflow-hidden"
                >
                  {/* Order header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-theme">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-base sm:text-lg text-primary"># {shortId}</span>
                        <span className={`font-heading text-xs tracking-wider px-2.5 py-1 border rounded-sm ${statusStyle}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-heading text-base sm:text-lg text-primary">
                        {formatPKR(order.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted font-heading tracking-wider">
                      <span>{date}</span>
                      <span>•</span>
                      <span>{order.payment_method.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <ul className="px-4 sm:px-6 py-4 space-y-1.5">
                    {order.order_items?.map((item, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span className="text-muted">
                          <span className="text-primary font-heading">{item.quantity}×</span> {item.item_name}
                        </span>
                        <span className="font-heading text-primary text-xs">
                          {formatPKR(item.item_price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

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
