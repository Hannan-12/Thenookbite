'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SessionOrder, OrderType, PaymentMethod, CartLine } from '../types';

export type FlushedOrder = Omit<SessionOrder, 'cancelled' | 'discountAmount' | 'discountType' | 'discountValue'>;

interface QueuedOrder {
  payload: object;
  queuedAt: string;
}

export function useOfflineQueue(
  sessionId: string,
  onFlushed: (order: FlushedOrder) => void,
  showToast: (msg: string) => void,
) {
  const QUEUE_KEY   = `tnb_pos_queue_${sessionId}`;
  const flushingRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);

  const saveToQueue = useCallback((payload: object) => {
    const queue: QueuedOrder[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    queue.push({ payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [QUEUE_KEY]);

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    let queue: QueuedOrder[];
    try { queue = JSON.parse(raw); } catch { return; }
    if (!queue.length) return;

    flushingRef.current = true;
    showToast(`Syncing ${queue.length} offline order${queue.length > 1 ? 's' : ''}…`);
    const remaining: QueuedOrder[] = [];

    for (const entry of queue) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        if (!res.ok) { remaining.push(entry); continue; }
        const order = await res.json();
        const p = entry.payload as Record<string, unknown>;
        onFlushed({
          id: order.id,
          total: order.total,
          customerName: String(p.customer_name ?? ''),
          phone: String(p.customer_phone ?? ''),
          table: String(p.table_number ?? ''),
          address: String(p.delivery_address ?? ''),
          rider: String(p.rider_name ?? ''),
          orderType: (p.order_type as OrderType) ?? 'dine-in',
          payment: (p.payment_method as PaymentMethod) ?? 'cash',
          paymentStatus: p.payment_method === 'pay_later' ? 'pending' : 'paid',
          items: (p.items as CartLine[]) ?? [],
          notes: String(p.special_notes ?? ''),
          placedAt: new Date(entry.queuedAt),
        });
      } catch {
        remaining.push(entry);
      }
    }

    if (remaining.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      showToast(`${remaining.length} order${remaining.length > 1 ? 's' : ''} still pending — retry soon`);
    } else {
      localStorage.removeItem(QUEUE_KEY);
      showToast('All offline orders synced ✓');
    }
    flushingRef.current = false;
  }, [QUEUE_KEY, onFlushed, showToast]);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); flushQueue(); }
    function handleOffline() { setIsOnline(false); }
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) flushQueue();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  return { isOnline, saveToQueue };
}
