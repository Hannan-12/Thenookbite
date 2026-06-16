import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id ?? '';
  const shortId = id ? id.slice(-6).toUpperCase() : '------';

  // Fetch from DB — don't rely on URL params for sensitive data
  let order: { customer_name: string; total: number; order_type: string; delivery_address: string | null; tip: number; payment_method: string } | null = null;
  if (id) {
    const db = createServiceClient();
    const { data } = await db
      .from('orders')
      .select('customer_name, total, order_type, delivery_address, tip, payment_method')
      .eq('id', id)
      .single();
    order = data;
  }

  const orderTypeMap: Record<string, string> = {
    'dine-in':  '🍽️ Dine In',
    'takeaway': '🥡 Takeaway',
    'delivery': '🛵 Delivery',
  };

  const name        = order?.customer_name ?? '';
  const orderType   = orderTypeMap[order?.order_type ?? ''] ?? '';
  const address     = order?.delivery_address ?? '';
  const tip         = order?.tip ?? 0;
  const method      = order?.payment_method === 'card' ? 'Card' : 'Cash on Delivery';

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md w-full animate-scale-in">
        {/* Check icon */}
        <div className="w-16 h-16 rounded-full bg-brand-red/10 border-2 border-brand-red flex items-center justify-center mx-auto mb-10">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#E4002B" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-3">ORDER CONFIRMED</p>
        <h1 className="font-heading text-5xl sm:text-6xl text-white leading-none mb-5">THANK YOU!</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
          Your order is with the kitchen. We&apos;ll have it ready shortly.
        </p>

        {/* Order details */}
        <div className="mt-10 bg-white/5 border border-white/10 rounded-sm p-8 text-left space-y-5">
          <div className="text-center mb-6">
            <p className="font-heading text-xs tracking-[0.4em] text-white/30 mb-2">ORDER NUMBER</p>
            <p className="font-heading text-4xl text-brand-red"># {shortId}</p>
            <p className="mt-2 text-sm text-white/30 font-heading tracking-wider">
              Payment: {method.toUpperCase()}
            </p>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-4">
            {orderType && (
              <div className="flex items-start gap-3">
                <span className="font-heading text-xs tracking-widest text-white/30 w-20 flex-shrink-0 pt-0.5">TYPE</span>
                <span className="text-white text-sm font-body">{orderType}</span>
              </div>
            )}
            {name && (
              <div className="flex items-start gap-3">
                <span className="font-heading text-xs tracking-widest text-white/30 w-20 flex-shrink-0 pt-0.5">NAME</span>
                <span className="text-white text-sm font-body">{name}</span>
              </div>
            )}
            {address && (
              <div className="flex items-start gap-3">
                <span className="font-heading text-xs tracking-widest text-white/30 w-20 flex-shrink-0 pt-0.5">ADDRESS</span>
                <span className="text-white text-sm font-body">{address}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex items-start gap-3">
                <span className="font-heading text-xs tracking-widest text-white/30 w-20 flex-shrink-0 pt-0.5">TIP</span>
                <span className="text-brand-red text-sm font-heading">Rs. {tip} — Thank you!</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center gap-2 bg-brand-red text-white font-heading text-sm px-8 py-4 tracking-widest hover:bg-white hover:text-black transition-colors duration-200"
          >
            ORDER AGAIN
          </Link>
          <Link
            href="/my-orders"
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/60 font-heading text-sm px-8 py-4 tracking-widest hover:border-white/60 hover:text-white transition-colors duration-200"
          >
            MY ORDERS
          </Link>
        </div>
      </div>
    </div>
  );
}
