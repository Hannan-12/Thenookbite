'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { formatPKR, isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { createOrder } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-surface border border-theme px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-primary placeholder:text-muted rounded-sm';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, totalPrice, clear } = useCart();
  const [mounted, setMounted]       = useState(false);
  const [userId, setUserId]         = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [address, setAddress]       = useState('');
  const [table, setTable]           = useState('');
  const [notes, setNotes]           = useState('');
  const [tip, setTip]               = useState(0);
  const [customTip, setCustomTip]   = useState('');
  const [orderType, setOrderType]   = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [showCardModal, setShowCardModal] = useState(false);

  const tipAmount = tip === -1 ? Math.min(Math.round(parseFloat(customTip) || 0), 10000) : tip;
  const grandTotal = totalPrice() + tipAmount;

  useEffect(() => {
    setMounted(true);
    // Pre-fill from profile if logged in — guests proceed without login
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) return; // guest — no pre-fill, form stays empty
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', uid)
        .single();
      setUserId(uid);
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
    });
  }, []);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <p className="font-heading text-sm tracking-widest text-muted animate-pulse">LOADING…</p>
    </div>
  );

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
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPakistaniPhone(normalizedPhone)) {
      setError('Please enter a valid Pakistani mobile number starting with 03 (e.g. 03001234567).');
      return;
    }
    if (orderType === 'delivery' && !address.trim()) {
      setError('Please enter your delivery address.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder({
        customer_name: name.trim(),
        customer_phone: normalizedPhone,
        table_number: orderType === 'dine-in' ? (table.trim() || null) : null,
        special_notes: notes.trim() || null,
        payment_method: 'cash',
        items: itemsPayload,
        user_id: userId,
        order_type: orderType,
        tip: tipAmount,
        delivery_address: orderType === 'delivery' ? address.trim() : null,
      });
      clear();
      router.push(`/order-confirmation?id=${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="font-heading text-3xl sm:text-5xl text-primary mb-6 sm:mb-10">CHECKOUT</h1>

        {/* Guest nudge — only shown when not logged in */}
        {!userId && (
          <div className="mb-6 border border-theme rounded-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-card">
            <p className="text-sm text-muted">
              <Link href="/login?next=/checkout" className="text-primary font-heading tracking-wider hover:text-brand-red transition-colors">
                SIGN IN
              </Link>
              {' '}to pre-fill your details and track this order.
            </p>
            <span className="text-xs text-muted/50 font-heading tracking-wider sm:flex-shrink-0">OR CONTINUE AS GUEST</span>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Order type */}
            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-3">
                ORDER TYPE <span className="text-brand-red">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'dine-in',   label: 'DINE IN',   icon: '🍽️' },
                  { value: 'takeaway',  label: 'TAKEAWAY',  icon: '🥡' },
                  { value: 'delivery',  label: 'DELIVERY',  icon: '🛵' },
                ] as const).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrderType(value)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-sm border transition-colors duration-150 ${
                      orderType === value
                        ? 'bg-brand-red/10 border-brand-red text-primary'
                        : 'border-theme text-muted hover:border-brand-red/40 hover:text-primary'
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="font-heading text-xs tracking-widest">{label}</span>
                  </button>
                ))}
              </div>
            </div>

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
                PHONE NUMBER <span className="text-brand-red">*</span>
                <span className="text-muted/50 font-body normal-case tracking-normal text-xs ml-1">(Pakistani mobile: 03XXXXXXXXX)</span>
              </label>
              <div className="relative">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className={inputClass}
                  type="tel"
                  maxLength={11}
                  required
                />
                {isValidPakistaniPhone(normalizePhone(phone)) && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                )}
              </div>
            </div>

            {orderType === 'delivery' && (
              <div>
                <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
                  DELIVERY ADDRESS <span className="text-brand-red">*</span>
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your delivery address"
                  className={inputClass}
                />
              </div>
            )}

            {orderType === 'dine-in' && (
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
            )}

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

            {/* Tip */}
            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-3">
                ADD A TIP
                <span className="text-white/20 font-body normal-case tracking-normal text-xs ml-2">
                  {orderType === 'dine-in'  && '(given at table)'}
                  {orderType === 'takeaway' && '(given at counter)'}
                  {orderType === 'delivery' && '(given to rider)'}
                </span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[0, 50, 100, 200].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTip(t); setCustomTip(''); }}
                    className={`font-heading text-xs tracking-widest px-4 py-2.5 rounded-sm border transition-colors duration-150 ${
                      tip === t && tip !== -1
                        ? 'bg-brand-red border-brand-red text-white'
                        : 'border-theme text-muted hover:border-brand-red/40 hover:text-primary'
                    }`}
                  >
                    {t === 0 ? 'NO TIP' : `RS. ${t}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTip(-1)}
                  className={`font-heading text-xs tracking-widest px-4 py-2.5 rounded-sm border transition-colors duration-150 ${
                    tip === -1
                      ? 'bg-brand-red border-brand-red text-white'
                      : 'border-theme text-muted hover:border-brand-red/40 hover:text-primary'
                  }`}
                >
                  CUSTOM
                </button>
              </div>
              {tip === -1 && (
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="Enter tip amount (PKR, max 10,000)"
                  className={`${inputClass} mt-2`}
                />
              )}
              {tipAmount > 0 && (
                <p className="text-xs text-brand-red font-heading tracking-wider mt-2">
                  Tip: {formatPKR(tipAmount)} — Thank you!
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-3">
                PAYMENT METHOD <span className="text-brand-red">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Cash */}
                <div className="bg-card border border-brand-red rounded-sm px-4 py-4 flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="font-heading text-sm text-primary tracking-wider">
                      {orderType === 'dine-in'  && 'CASH — AT TABLE'}
                      {orderType === 'takeaway' && 'CASH — AT COUNTER'}
                      {orderType === 'delivery' && 'CASH — TO RIDER'}
                    </p>
                    <p className="text-xs text-muted mt-0.5">Pay when you receive your order</p>
                  </div>
                </div>

                {/* Online / Card — coming soon */}
                <button
                  type="button"
                  onClick={() => setShowCardModal(true)}
                  className="relative bg-card border border-theme rounded-sm px-4 py-4 flex items-center gap-3 text-left opacity-60 cursor-not-allowed"
                >
                  <span className="absolute top-2 right-2 font-heading text-[9px] tracking-widest bg-brand-red/20 text-brand-red border border-brand-red/30 px-1.5 py-0.5 rounded-sm">SOON</span>
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-heading text-sm text-muted tracking-wider">ONLINE PAYMENT</p>
                    <p className="text-xs text-muted/50 mt-0.5">Card / JazzCash / Easypaisa</p>
                  </div>
                </button>
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
            {tipAmount > 0 && (
              <div className="px-6 py-3 border-t border-theme flex justify-between items-center">
                <span className="font-heading text-xs tracking-wider text-muted">TIP</span>
                <span className="font-heading text-sm text-muted">+{formatPKR(tipAmount)}</span>
              </div>
            )}
            <div className="px-6 py-4 border-t-2 border-brand-red flex justify-between items-center">
              <span className="font-heading text-sm tracking-wider text-primary">TOTAL</span>
              <span className="font-heading text-2xl text-primary">{formatPKR(grandTotal)}</span>
            </div>
          </aside>
        </div>
      </div>

      {/* Online payment coming-soon modal */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-sm max-w-sm w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">💳</span>
            </div>
            <h2 className="font-heading text-2xl text-white tracking-widest mb-2">COMING SOON</h2>
            <p className="text-muted text-sm leading-relaxed mb-1">
              Online payment (card, JazzCash, Easypaisa) is not yet available.
            </p>
            <p className="text-muted/60 text-xs leading-relaxed mb-8">
              Please select cash payment to complete your order.
            </p>
            <button
              onClick={() => setShowCardModal(false)}
              className="w-full bg-brand-red text-white font-heading text-sm py-3 tracking-widest hover:bg-red-600 transition-colors rounded-sm"
            >
              GOT IT — CONTINUE WITH CASH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
