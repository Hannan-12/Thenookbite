import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';
import { formatPKR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id ?? '';
  const shortId = id ? parseInt(id.replace(/-/g,"").slice(-4),16).toString().padStart(4,"0") : '------';

  let order: {
    customer_name: string;
    total: number;
    order_type: string;
    delivery_address: string | null;
    tip: number;
    payment_method: string;
    special_notes: string | null;
    created_at: string;
    order_items: { item_name: string; item_price: number; quantity: number }[];
  } | null = null;

  if (id) {
    const db = createServiceClient();
    const { data } = await db
      .from('orders')
      .select('customer_name, total, order_type, delivery_address, tip, payment_method, special_notes, created_at, order_items(item_name, item_price, quantity)')
      .eq('id', id)
      .single();
    order = data;
  }

  const orderTypeMap: Record<string, string> = {
    'dine-in':  '🍽️  Dine In',
    'takeaway': '🥡  Takeaway',
    'delivery': '🛵  Delivery',
  };

  const name       = order?.customer_name ?? '';
  const orderType  = orderTypeMap[order?.order_type ?? ''] ?? '';
  const address    = order?.delivery_address ?? '';
  const tip        = order?.tip ?? 0;
  const method     = order?.payment_method === 'card' ? 'CARD' : 'CASH ON DELIVERY';
  const notes      = order?.special_notes ?? '';
  const items      = order?.order_items ?? [];
  const subtotal   = items.reduce((s, i) => s + i.item_price * i.quantity, 0);
  const placedAt   = order?.created_at
    ? new Date(order.created_at).toLocaleString('en-PK', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-scale-in">

        {/* Check icon + heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-red/10 border-2 border-brand-red flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#E4002B" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-3">ORDER CONFIRMED</p>
          <h1 className="font-heading text-5xl sm:text-6xl text-white leading-none mb-4">THANK YOU!</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            Your order is with the kitchen. We&apos;ll have it ready shortly.
          </p>
        </div>

        {/* Receipt card */}
        <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden">

          {/* Order number header */}
          <div className="text-center px-8 py-6 border-b border-white/10">
            <p className="font-heading text-xs tracking-[0.4em] text-white/30 mb-2">ORDER NUMBER</p>
            <p className="font-heading text-4xl text-brand-red mb-2"># {shortId}</p>
            {placedAt && (
              <p className="font-heading text-xs text-white/20 tracking-widest">{placedAt}</p>
            )}
          </div>

          {/* Order meta */}
          <div className="px-6 py-4 border-b border-white/10 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="font-heading text-xs tracking-widest text-white/30">PAYMENT</span>
              <span className="font-heading text-xs tracking-widest text-white/70">{method}</span>
            </div>
            {orderType && (
              <div className="flex justify-between text-sm">
                <span className="font-heading text-xs tracking-widest text-white/30">TYPE</span>
                <span className="text-white text-xs font-body">{orderType}</span>
              </div>
            )}
            {name && (
              <div className="flex justify-between text-sm">
                <span className="font-heading text-xs tracking-widest text-white/30">NAME</span>
                <span className="text-white text-xs font-body">{name}</span>
              </div>
            )}
            {address && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-heading text-xs tracking-widest text-white/30 flex-shrink-0">ADDRESS</span>
                <span className="text-white text-xs font-body text-right">{address}</span>
              </div>
            )}
            {notes && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-heading text-xs tracking-widest text-white/30 flex-shrink-0">NOTE</span>
                <span className="text-white/60 text-xs font-body text-right italic">{notes}</span>
              </div>
            )}
          </div>

          {/* Itemized bill */}
          {items.length > 0 && (
            <div className="px-6 py-4 border-b border-white/10">
              <p className="font-heading text-[10px] tracking-[0.3em] text-white/20 mb-3">ORDER ITEMS</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-white/80 text-sm font-body leading-snug">{item.item_name}</span>
                      <span className="text-white/30 text-xs font-body ml-2">×{item.quantity}</span>
                    </div>
                    <span className="font-heading text-sm text-white/70 flex-shrink-0">
                      {formatPKR(item.item_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill totals */}
          <div className="px-6 py-4 space-y-2">
            {tip > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="font-heading text-xs tracking-widest text-white/30">SUBTOTAL</span>
                  <span className="font-heading text-xs text-white/50">{formatPKR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-heading text-xs tracking-widest text-brand-red/60">TIP</span>
                  <span className="font-heading text-xs text-brand-red/60">+{formatPKR(tip)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-heading text-sm tracking-widest text-white">TOTAL</span>
              <span className="font-heading text-xl text-white">{formatPKR(order?.total ?? subtotal + tip)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/menu"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-red text-white font-heading text-sm px-6 py-4 tracking-widest hover:bg-white hover:text-black transition-colors duration-200"
          >
            ORDER AGAIN
          </Link>
          <Link
            href="/my-orders"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 text-white/60 font-heading text-sm px-6 py-4 tracking-widest hover:border-white/60 hover:text-white transition-colors duration-200"
          >
            MY ORDERS
          </Link>
        </div>

      </div>
    </div>
  );
}
