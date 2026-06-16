'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { formatPKR } from '@/lib/format';

export default function CartPage() {
  const { lines, setQuantity, removeLine, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
      <div className="h-10 w-48 bg-white/5 rounded-sm animate-pulse mb-8" />
      <div className="bg-card border border-theme rounded-sm overflow-hidden divide-y divide-theme">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-6 py-5 flex items-center gap-4">
            <div className="flex-1 h-4 bg-white/5 rounded-sm animate-pulse" />
            <div className="w-20 h-4 bg-white/5 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl mb-6">🛒</div>
        <h1 className="font-heading text-3xl sm:text-4xl text-primary">YOUR CART IS EMPTY</h1>
        <p className="mt-4 text-muted text-sm">Add something delicious to get started.</p>
        <Link
          href="/menu"
          className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm px-8 py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200"
        >
          BROWSE MENU →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="font-heading text-3xl sm:text-5xl text-primary mb-8">YOUR CART</h1>

        <div className="bg-card border border-theme rounded-sm overflow-hidden">
          {lines.map((l, i) => (
            <div
              key={l.key}
              className={`px-4 sm:px-6 py-4 sm:py-5 ${i < lines.length - 1 ? 'border-b border-theme' : ''}`}
            >
              {/* Mobile: stacked layout */}
              <div className="flex items-start justify-between gap-3 sm:hidden">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-primary leading-snug">{l.name}</p>
                  <p className="text-xs text-muted mt-0.5">{formatPKR(l.price)} each</p>
                </div>
                <button
                  onClick={() => removeLine(l.key)}
                  aria-label="Remove item"
                  className="text-muted hover:text-brand-red transition-colors w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-sm hover:bg-brand-red/5"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 sm:hidden">
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(l.key, l.quantity - 1)} className="w-8 h-8 border border-theme text-muted hover:border-primary hover:text-primary flex items-center justify-center text-lg transition-all rounded-sm">−</button>
                  <span className="w-6 text-center font-heading text-primary text-sm">{l.quantity}</span>
                  <button onClick={() => setQuantity(l.key, l.quantity + 1)} className="w-8 h-8 border border-theme text-muted hover:border-primary hover:text-primary flex items-center justify-center text-lg transition-all rounded-sm">+</button>
                </div>
                <span className="font-heading text-primary text-base">{formatPKR(l.price * l.quantity)}</span>
              </div>

              {/* Desktop: single row */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-base text-primary truncate">{l.name}</p>
                  <p className="text-xs text-muted mt-0.5">{formatPKR(l.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(l.key, l.quantity - 1)} className="w-8 h-8 border border-theme text-muted hover:border-primary hover:text-primary flex items-center justify-center text-lg transition-all rounded-sm">−</button>
                  <span className="w-6 text-center font-heading text-primary">{l.quantity}</span>
                  <button onClick={() => setQuantity(l.key, l.quantity + 1)} className="w-8 h-8 border border-theme text-muted hover:border-primary hover:text-primary flex items-center justify-center text-lg transition-all rounded-sm">+</button>
                </div>
                <div className="w-24 text-right font-heading text-primary">{formatPKR(l.price * l.quantity)}</div>
                <button
                  onClick={() => removeLine(l.key)}
                  aria-label="Remove item"
                  className="text-muted hover:text-brand-red transition-colors w-10 h-10 flex items-center justify-center rounded-sm hover:bg-brand-red/5 flex-shrink-0"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 flex items-center justify-between py-4 border-t-2 border-brand-red">
          <span className="font-heading text-lg sm:text-xl text-primary">TOTAL</span>
          <span className="font-heading text-2xl sm:text-3xl text-primary">{formatPKR(totalPrice())}</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <Link href="/menu" className="font-heading text-xs tracking-widest text-muted hover:text-primary transition-colors flex items-center gap-1">
            ← ADD MORE
          </Link>
          <Link href="/checkout" className="inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm px-8 sm:px-10 py-3 sm:py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200">
            CHECKOUT →
          </Link>
        </div>
      </div>
    </div>
  );
}
