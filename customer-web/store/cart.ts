'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/lib/types';

interface CartState {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'quantity'>, qty?: number) => void;
  removeLine: (key: string) => void;
  setQuantity: (key: string, qty: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addLine: (line, qty = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.key === line.key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === line.key ? { ...l, quantity: l.quantity + qty } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity: qty }] };
        }),

      removeLine: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      setQuantity: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
        })),

      clear: () => set({ lines: [] }),

      totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),

      totalPrice: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    }),
    { name: 'tnb-cart' },
  ),
);
