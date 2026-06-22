'use client';

import { useState, useEffect } from 'react';
import type { SessionOrder, OrderType, PaymentMethod } from '../types';

export function useSessionOrders(staffId: string, sessionId: string) {
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);

  useEffect(() => {
    if (!staffId) return;
    const params = new URLSearchParams({ staff_id: staffId });
    if (sessionId) params.set('session_id', sessionId);
    fetch(`/api/pos/staff-orders?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((orders: Array<{
        id: string; total: number; customer_name: string; customer_phone: string;
        table_number: string | null; delivery_address: string | null; rider_name: string | null;
        order_type: string; payment_method: string; payment_status: string;
        special_notes: string | null; created_at: string;
        order_items: { item_name: string; item_price: number; quantity: number }[];
      }>) => {
        setSessionOrders(orders.map(o => ({
          id: o.id,
          total: o.total,
          customerName: o.customer_name,
          phone: o.customer_phone ?? '',
          table: o.table_number ?? '',
          address: o.delivery_address ?? '',
          rider: o.rider_name ?? '',
          orderType: (o.order_type as OrderType) ?? 'dine-in',
          payment: (o.payment_method as PaymentMethod) ?? 'cash',
          paymentStatus: o.payment_status === 'paid' ? 'paid' : 'pending',
          notes: o.special_notes ?? '',
          placedAt: new Date(o.created_at),
          items: o.order_items.map(i => ({
            key: i.item_name, name: i.item_name,
            price: i.item_price, quantity: i.quantity, menu_item_id: '',
          })),
        })));
      })
      .catch(() => {});
  }, [staffId, sessionId]);

  return { sessionOrders, setSessionOrders };
}
