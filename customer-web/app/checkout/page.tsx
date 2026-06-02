'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { formatPKR } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { createOrder } from '@/lib/api';

const inputClass =
  'w-full bg-surface border border-theme px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-primary placeholder:text-muted rounded-sm';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, totalPrice, clear } = useCart();
  const [mounted, setMounted]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [name, setName]             = useState('');
  const [table, setTable]           = useState('');
  const [notes, setNotes]           = useState('');
  const [userId, setUserId]         = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!mounted) return null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-heading text-4xl text-primary">CHECKOUT</h1>
        <p className="mt-4 text-muted text-sm">Your cart is empty.</p>
        <Link href="/menu" className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm px-8 py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200">
          BROWSE MENU →
        </Link>
      </div>
    );
  }

  const itemsPayload = lines.map((l) => ({
    menu_item_id: l.menu_item_id ?? null,
    item_name: l.name,
    item_price: l.price,
    quantity: l.quantity,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder({
        customer_name: name.trim(),
        table_number: table.trim() || null,
        special_notes: notes.trim() || null,
        payment_method: 'cash',
        items: itemsPayload,
        user_id: userId,
      });
      clear();
      router.push(`/order-confirmation?id=${order.id}&method=cash`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="font-heading text-3xl sm:text-5xl text-primary mb-8 sm:mb-12">CHECKOUT</h1>

        <div className="grid gap-8 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
                YOUR NAME <span className="text-brand-red">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
                TABLE NUMBER
              </label>
              <input
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="e.g. 7"
                className={inputClass}
              />
            </div>

            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
                SPECIAL NOTES
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests?"
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Payment method — cash only */}
            <div className="bg-card border border-theme rounded-sm px-4 py-4 flex items-center gap-3">
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-heading text-sm text-primary tracking-wider">CASH ON DELIVERY</p>
                <p className="text-xs text-muted mt-0.5">Pay when your order arrives at your table.</p>
              </div>
            </div>

            {error && (
              <p className="text-brand-red text-sm font-body flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-red text-white font-heading text-sm py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm mt-2"
            >
              {submitting ? 'PLACING ORDER…' : 'PLACE ORDER →'}
            </button>
          </form>

          {/* Order summary */}
          <aside className="h-fit bg-card border border-theme rounded-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-theme">
              <h2 className="font-heading text-sm tracking-widest text-primary">ORDER SUMMARY</h2>
            </div>
            <ul className="px-6 py-4 space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted leading-snug">
                    <span className="text-primary font-heading">{l.quantity}×</span> {l.name}
                  </span>
                  <span className="font-heading text-primary flex-shrink-0">
                    {formatPKR(l.price * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-6 py-4 border-t-2 border-brand-red flex justify-between items-center">
              <span className="font-heading text-sm tracking-wider text-primary">TOTAL</span>
              <span className="font-heading text-2xl text-primary">{formatPKR(totalPrice())}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
