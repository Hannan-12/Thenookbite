'use client';

import { useRef, useState } from 'react';
import { useCart } from '@/store/cart';
import { useFlyToCart } from '@/components/FlyToCart';
import type { CartLine } from '@/lib/types';

export function AddToCartButton({
  line,
  disabled,
  className = '',
}: {
  line: Omit<CartLine, 'quantity'>;
  disabled?: boolean;
  className?: string;
}) {
  const addLine = useCart((s) => s.addLine);
  const { fly } = useFlyToCart();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (btnRef.current) fly(btnRef.current.getBoundingClientRect(), line.name);
    addLine(line);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      ref={btnRef}
      onClick={handleAdd}
      disabled={disabled}
      className={`font-heading text-xs tracking-widest px-4 py-2.5 rounded-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        added
          ? 'bg-green-600 text-white'
          : 'bg-brand-red text-white hover:bg-primary hover:text-surface'
      } ${className}`}
    >
      {disabled ? 'SOLD OUT' : added ? 'ADDED ✓' : 'ADD TO CART'}
    </button>
  );
}
