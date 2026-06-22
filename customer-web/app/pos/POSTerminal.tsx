'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CATEGORIES, type Category, type MenuCard } from '@/lib/types';
import { formatPKR, isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { imageForItem } from '@/lib/itemImages';
import { createClient } from '@/lib/supabase/client';
import { useCashDrawer } from '@/lib/useCashDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartLine {
  key: string;
  name: string;
  price: number;
  quantity: number;
  menu_item_id: string;
}

interface PastOrder {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  order_items: { item_name: string; quantity: number; item_price: number }[];
}

interface SessionOrder {
  id: string;
  total: number;
  customerName: string;
  phone: string;
  table: string;
  address: string;
  rider: string;
  orderType: OrderType;
  payment: PaymentMethod;
  paymentStatus: 'paid' | 'pending';
  cancelled?: boolean;
  items: CartLine[];
  notes: string;
  placedAt: Date;
  discountAmount?: number;
  discountType?: 'pct' | 'flat';
  discountValue?: number;
}

type OrderType = 'dine-in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'card' | 'pay_later';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function orderNum(id: string): string {
  return parseInt(id.replace(/-/g, '').slice(-4), 16).toString().padStart(4, '0');
}

function cardImage(card: MenuCard): string {
  const dbUrl = 'item' in card ? card.item.image_url : card.base.image_url;
  return imageForItem(card.name, card.category, dbUrl);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function POSTerminal({
  cards,
  staffId,
  staffName,
  staffRole,
  sessionId,
}: {
  cards: MenuCard[];
  staffId: string;
  staffName: string;
  staffRole: string;
  sessionId: string;
}) {
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<Category | 'All'>('All');
  const [cart, setCart]             = useState<CartLine[]>([]);
  const [orderType, setOrderType]   = useState<OrderType>('dine-in');
  const [table, setTable]           = useState('');
  const [address, setAddress]       = useState('');
  const [rider, setRider]           = useState('');
  const [customer, setCustomer]     = useState('');
  const [phone, setPhone]           = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [lookingUp, setLookingUp]   = useState(false);
  const [notes, setNotes]           = useState('');
  const [payment, setPayment]       = useState<PaymentMethod>('cash');
  const [cartOpen, setCartOpen]     = useState(false);
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<SessionOrder | null>(null);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);
  const [sessionOpen, setSessionOpen]     = useState(false);
  const [sessionTab, setSessionTab]       = useState<'all' | 'unpaid'>('all');
  const [settleId, setSettleId]           = useState<string | null>(null);
  const [settling, setSettling]           = useState(false);
  const [cancelId, setCancelId]           = useState<string | null>(null);
  const [cancelling, setCancelling]       = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [paymentModal, setPaymentModal]   = useState(false);
  const [cashStep, setCashStep]           = useState(false);
  const [cashGiven, setCashGiven]         = useState('');
  const [discountType, setDiscountType]   = useState<'pct' | 'flat'>('flat');
  const [discountValue, setDiscountValue] = useState('');
  const { openDrawer: fireDrawer, pairPrinter, paired: drawerPaired, status: drawerStatus } = useCashDrawer();
  const [isOnline, setIsOnline]     = useState(true);
  const searchRef                   = useRef<HTMLInputElement>(null);
  const lookupTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef                 = useRef(false);

  // ── Load today's orders for this staff member on mount ───────────────────────
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
        const loaded: SessionOrder[] = orders.map(o => ({
          id: o.id,
          total: o.total,
          customerName: o.customer_name,
          phone: o.customer_phone ?? '',
          table: o.table_number ?? '',
          address: o.delivery_address ?? '',
          rider: o.rider_name ?? '',
          orderType: (o.order_type as OrderType) ?? 'dine-in',
          payment: (o.payment_method as PaymentMethod) ?? 'cash',
          paymentStatus: (o.payment_status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
          notes: o.special_notes ?? '',
          placedAt: new Date(o.created_at),
          items: o.order_items.map(i => ({
            key: i.item_name,
            name: i.item_name,
            price: i.item_price,
            quantity: i.quantity,
            menu_item_id: '',
          })),
        }));
        setSessionOrders(loaded);
      })
      .catch(() => {});
  }, [staffId, sessionId]);

  // ── Offline queue helpers ────────────────────────────────────────────────────
  const QUEUE_KEY = `tnb_pos_queue_${sessionId}`;

  function saveToOfflineQueue(payload: object) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    queue.push({ payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async function flushOfflineQueue() {
    if (flushingRef.current) return;
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    let queue: Array<{ payload: object; queuedAt: string }>;
    try { queue = JSON.parse(raw); } catch { return; }
    if (!queue.length) return;
    flushingRef.current = true;
    showToast(`Syncing ${queue.length} offline order${queue.length > 1 ? 's' : ''}…`);
    const remaining: typeof queue = [];
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
        const flushedOrder: SessionOrder = {
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
        };
        setSessionOrders(prev => [flushedOrder, ...prev]);
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
  }

  // ── Online/offline listeners ──────────────────────────────────────────────────
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      flushOfflineQueue();
    }
    function handleOffline() { setIsOnline(false); }
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Flush any leftover queue on mount in case last session closed while offline
    if (navigator.onLine) flushOfflineQueue();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phone lookup ─────────────────────────────────────────────────────────────
  const lookupPhone = useCallback(async (raw: string) => {
    const normalized = normalizePhone(raw);
    if (!isValidPakistaniPhone(normalized)) {
      setPastOrders([]);
      return;
    }
    setLookingUp(true);
    const res = await fetch(`/api/customer-lookup?phone=${normalized}`);
    if (res.ok) {
      const data = await res.json();
      if (data.customer_name && !customer) setCustomer(data.customer_name);
      setPastOrders(data.orders ?? []);
    }
    setLookingUp(false);
  }, [customer]);

  function handlePhoneChange(raw: string) {
    setPhone(raw);
    setPhoneError(null);
    const normalized = normalizePhone(raw);
    if (normalized.length === 11) {
      if (!isValidPakistaniPhone(normalized)) {
        setPhoneError('Must start with 03 and be 11 digits');
        setPastOrders([]);
        return;
      }
    }
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => lookupPhone(raw), 500);
  }

  // ── Filter cards ────────────────────────────────────────────────────────────
  const filtered = cards.filter(c => {
    const matchCat = category === 'All' || c.category === category;
    const matchQ   = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  function addLine(line: Omit<CartLine, 'quantity'>) {
    setCart(prev => {
      const existing = prev.find(l => l.key === line.key);
      if (existing) return prev.map(l => l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { ...line, quantity: 1 }];
    });
    showToast(`+ ${line.name}`);
  }

  function adjustQty(key: string, delta: number) {
    setCart(prev => {
      const updated = prev.map(l => l.key === key ? { ...l, quantity: l.quantity + delta } : l);
      return updated.filter(l => l.quantity > 0);
    });
  }

  function clearCart() {
    setCart([]);
    setTable('');
    setAddress('');
    setRider('');
    setCustomer('');
    setPhone('');
    setPhoneError(null);
    setPastOrders([]);
    setNotes('');
    setOrderType('dine-in');
    setPayment('cash');
    setDiscountValue('');
    setDiscountType('flat');
  }

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discountAmount = (() => {
    const v = parseFloat(discountValue) || 0;
    if (v <= 0) return 0;
    if (discountType === 'pct') return Math.min(Math.round(total * v / 100), total);
    return Math.min(Math.round(v), total);
  })();
  const afterDiscount = total - discountAmount;
  // 1.5% card surcharge on discounted price, rounded up to nearest rupee
  const cardTotal = Math.ceil(afterDiscount * 1.015);

  // ── Place order ───────────────────────────────────────────────────────────────
  async function placeOrder(selectedPayment?: PaymentMethod, overrideTotal?: number) {
    if (!cart.length) return;
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPakistaniPhone(normalizedPhone)) {
      setPhoneError('Enter a valid Pakistani mobile number (03XXXXXXXXX)');
      showToast('Phone number required');
      return;
    }
    const method = selectedPayment ?? payment;
    setPayment(method);
    setPlacing(true);
    const chargedTotal = overrideTotal ?? afterDiscount;
    const nameDefault =
      orderType === 'dine-in'  ? `Table ${table || '?'}` :
      orderType === 'delivery' ? 'Delivery'               : 'Counter';

    const orderPayload = {
      customer_name:    customer || nameDefault,
      customer_phone:   normalizedPhone,
      table_number:     orderType === 'dine-in' ? (table || null) : null,
      delivery_address: orderType === 'delivery' ? (address || null) : null,
      rider_name:       orderType === 'delivery' ? (rider || null) : null,
      order_type:       orderType,
      special_notes:    notes || null,
      payment_method:   method,
      override_total:   chargedTotal < total ? chargedTotal : method === 'card' ? chargedTotal : undefined,
      user_id:          null,
      staff_id:         staffId,
      session_id:       sessionId,
      items: cart.map(l => ({
        menu_item_id: l.menu_item_id,
        item_name: l.name,
        item_price: l.price,
        quantity: l.quantity,
      })),
    };

    const sessionOrderBase: Omit<SessionOrder, 'id'> = {
      total: chargedTotal,
      customerName: customer || nameDefault,
      phone: normalizedPhone,
      table,
      address,
      rider,
      orderType,
      payment: method,
      paymentStatus: method === 'pay_later' ? 'pending' : 'paid',
      items: [...cart],
      notes,
      placedAt: new Date(),
      discountAmount,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
    };

    try {
      if (!navigator.onLine) {
        saveToOfflineQueue(orderPayload);
        const offlineOrder: SessionOrder = { id: `offline-${Date.now()}`, ...sessionOrderBase };
        setLastOrder(offlineOrder);
        setSessionOrders(prev => [offlineOrder, ...prev]);
        clearCart();
        showToast('Offline — order saved, will sync when reconnected');
        return;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Order failed');
      }
      const order = await res.json();
      const completedOrder: SessionOrder = {
        id: order.id,
        ...sessionOrderBase,
        total: order.total,
      };
      setLastOrder(completedOrder);
      setSessionOrders(prev => [completedOrder, ...prev]);
      clearCart();
      showToast('Order placed!');
    } catch (e) {
      // Network failure — queue it
      if (!navigator.onLine || (e instanceof TypeError && e.message.includes('fetch'))) {
        saveToOfflineQueue(orderPayload);
        const offlineOrder: SessionOrder = { id: `offline-${Date.now()}`, ...sessionOrderBase };
        setLastOrder(offlineOrder);
        setSessionOrders(prev => [offlineOrder, ...prev]);
        clearCart();
        showToast('Network lost — order queued, will sync when back online');
      } else {
        showToast('Failed: ' + (e instanceof Error ? e.message : 'unknown error'));
      }
    } finally {
      setPlacing(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function cancelOrderPos(orderId: string) {
    setCancelling(true);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    setCancelling(false);
    setCancelId(null);
    if (res.ok) {
      setSessionOrders(prev => prev.map(o => o.id === orderId ? { ...o, cancelled: true, paymentStatus: 'paid' as const } : o));
      showToast('Order cancelled');
    } else {
      showToast('Cancel failed');
    }
  }

  function openCashDrawer() { fireDrawer(); }

  async function settleOrder(orderId: string, method: 'cash' | 'card') {
    setSettling(true);
    try {
      const res = await fetch('/api/orders/settle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, payment_method: method }),
      });
      if (!res.ok) throw new Error('Failed to settle');
      setSessionOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, payment: method, paymentStatus: 'paid' } : o
      ));
      setSettleId(null);
      if (method === 'cash') openCashDrawer();
      showToast('Payment settled ✓');
      // Print paid receipt for the settled order
      const settled = sessionOrders.find(o => o.id === orderId);
      if (settled) printReceipt({ ...settled, payment: method, paymentStatus: 'paid' });
    } catch {
      showToast('Settle failed');
    } finally {
      setSettling(false);
    }
  }

  function printReceipt(order?: SessionOrder) {
    const target = order ?? lastOrder;
    if (!target) return;
    const { id, total, customerName, phone, table, address, rider, orderType, payment, paymentStatus, items, notes, placedAt, discountAmount: da, discountType: dt, discountValue: dv } = target;
    const isPayLater = payment === 'pay_later' || paymentStatus === 'pending';
    const dateStr  = placedAt.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr  = placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const subtotal = items.reduce((s, l) => s + l.price * l.quantity, 0);
    const itemCount = items.reduce((s, l) => s + l.quantity, 0);
    const logoUrl  = `${window.location.origin}/logo-dark.png`;

    const rows = items.map(l => `
      <tr>
        <td style="padding:4px 0 2px;font-size:12px;vertical-align:top;">${l.name}</td>
        <td style="padding:4px 0 2px;font-size:12px;text-align:center;vertical-align:top;white-space:nowrap;">x${l.quantity}</td>
        <td style="padding:4px 0 2px;font-size:12px;text-align:right;vertical-align:top;white-space:nowrap;">Rs.${(l.price * l.quantity).toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:0 0 4px;font-size:10px;color:#555;">@ Rs.${l.price.toLocaleString()} each</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${orderNum(id)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 6mm 4mm 10mm; font-size: 12px; color: #000; background: #fff; }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }
  .small   { font-size: 10px; }
  .dash    { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .solid   { border: none; border-top: 1px solid #000; margin: 5px 0; }
  table    { width: 100%; border-collapse: collapse; }
  @media print { @page { margin: 0; size: 80mm auto; } body { padding: 4mm 3mm 12mm; } }
</style>
</head>
<body>

  <!-- LOGO BLOCK -->
  <div class="center" style="margin-bottom:6px;">
    <img src="${logoUrl}" alt="TNB" style="width:64px;height:auto;display:block;margin:0 auto 4px;" />
    <div style="font-size:13px;font-weight:bold;letter-spacing:3px;margin-bottom:1px;">THE NOOK BITE</div>
    <div class="small" style="color:#333;">Mandi Bahauddin, Punjab, Pakistan</div>
    <div class="small" style="color:#333;">12 PM – 12 AM Daily</div>
  </div>

  <hr class="solid">

  <!-- ORDER META -->
  <div style="margin:4px 0;">
    <table>
      <tr>
        <td class="small">Order #</td>
        <td class="small right"><b>#${orderNum(id)}</b></td>
      </tr>
      <tr>
        <td class="small">Date</td>
        <td class="small right">${dateStr}</td>
      </tr>
      <tr>
        <td class="small">Time</td>
        <td class="small right">${timeStr}</td>
      </tr>
      <tr>
        <td class="small">Type</td>
        <td class="small right">${
          orderType === 'dine-in'  ? `DINE-IN${table ? ` · TABLE ${table}` : ''}` :
          orderType === 'delivery' ? 'DELIVERY' : 'TAKEAWAY'
        }</td>
      </tr>
      ${address ? `<tr><td class="small">Address</td><td class="small right" style="max-width:120px;word-break:break-word;">${address}</td></tr>` : ''}
      ${rider ? `<tr><td class="small">Rider</td><td class="small right">${rider}</td></tr>` : ''}
      ${customerName ? `<tr><td class="small">Customer</td><td class="small right">${customerName}</td></tr>` : ''}
      ${phone ? `<tr><td class="small">Phone</td><td class="small right">${phone}</td></tr>` : ''}
      <tr>
        <td class="small">Cashier</td>
        <td class="small right">${staffName}</td>
      </tr>
    </table>
  </div>

  <hr class="dash">

  <!-- ITEMS -->
  <div style="margin:2px 0 4px;">
    <table>
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;padding-bottom:4px;font-weight:bold;">ITEM</th>
          <th style="text-align:center;font-size:11px;padding-bottom:4px;font-weight:bold;">QTY</th>
          <th style="text-align:right;font-size:11px;padding-bottom:4px;font-weight:bold;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <hr class="dash">

  <!-- TOTALS -->
  <table style="margin:4px 0;">
    <tr>
      <td class="small">Subtotal (${itemCount} item${itemCount !== 1 ? 's' : ''})</td>
      <td class="small right">Rs.${subtotal.toLocaleString()}</td>
    </tr>
    ${(da && da > 0) ? `
    <tr>
      <td class="small" style="color:#16a34a;">Discount (${dt === 'pct' ? `${dv}%` : `Rs.${dv}`})</td>
      <td class="small right" style="color:#16a34a;">− Rs.${da.toLocaleString()}</td>
    </tr>` : ''}
    ${payment === 'card' && total > (subtotal - (da ?? 0)) ? `
    <tr>
      <td class="small" style="color:#555;">Card Service Charge (1.5%)</td>
      <td class="small right" style="color:#555;">Rs.${(total - subtotal + (da ?? 0)).toLocaleString()}</td>
    </tr>` : `
    <tr>
      <td class="small" style="color:#555;">Tax / Service Charge</td>
      <td class="small right" style="color:#555;">Incl.</td>
    </tr>`}
  </table>

  <hr class="solid">

  <table style="margin:4px 0 6px;">
    <tr>
      <td style="font-size:15px;font-weight:900;letter-spacing:1px;">TOTAL</td>
      <td style="font-size:15px;font-weight:900;text-align:right;">Rs.${total.toLocaleString()}</td>
    </tr>
    <tr>
      <td class="small" style="padding-top:3px;">Payment</td>
      <td class="small right" style="padding-top:3px;font-weight:bold;">${
        isPayLater ? 'PAY LATER' : payment === 'cash' ? 'CASH' : 'CARD'
      }</td>
    </tr>
  </table>

  ${!isPayLater ? `
  <div style="margin:8px 0;padding:6px;border:1px solid #16a34a;text-align:center;">
    <div style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#16a34a;">✓ PAID — ${payment === 'cash' ? 'CASH' : 'CARD'}</div>
  </div>` : ''}

  ${notes ? `<hr class="dash"><div class="small" style="margin:3px 0;"><b>Note:</b> ${notes}</div>` : ''}

  <hr class="solid">

  <!-- FOOTER -->
  <div class="center" style="margin-top:8px;">
    <div style="font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:3px;">THANK YOU FOR YOUR VISIT!</div>
    <div class="small" style="color:#444;margin-bottom:2px;">Please come again</div>
    <div class="small" style="color:#777;">Powered by TNB POS System</div>
  </div>

</body>
</html>`;

    const w = window.open('', '_blank', 'width=380,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  // Cart panel JSX — shared between desktop sidebar and mobile bottom sheet
  const cartPanel = (
    <div className="flex flex-col h-full bg-[#111111]">
      {/* Order type */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex gap-1.5">
          {([
            { value: 'dine-in',  label: '🍽 DINE IN'  },
            { value: 'takeaway', label: '🥡 TAKEAWAY' },
            { value: 'delivery', label: '🛵 DELIVERY' },
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              className={`flex-1 font-heading text-[10px] tracking-widest py-2.5 rounded-sm border transition-colors duration-100 ${
                orderType === t.value
                  ? 'bg-[#E4002B] border-[#E4002B] text-white'
                  : 'border-white/10 text-white hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Phone number */}
        <div className="mt-2">
          <div className="relative">
            <input
              value={phone}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="03XX-XXXXXXX (required)"
              maxLength={12}
              className={`w-full bg-[#1a1a1a] border px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none rounded-sm font-body pr-16 ${
                phoneError ? 'border-[#E4002B]/60' : 'border-white/10 focus:border-[#E4002B]/40'
              }`}
            />
            {lookingUp && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-heading text-[9px] tracking-widest text-white animate-pulse">
                LOOKING…
              </span>
            )}
            {!lookingUp && isValidPakistaniPhone(normalizePhone(phone)) && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
            )}
          </div>
          {phoneError && (
            <p className="font-heading text-[9px] tracking-wider text-[#E4002B] mt-1">{phoneError}</p>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <input
            value={customer}
            onChange={e => setCustomer(e.target.value)}
            placeholder="Customer name"
            className="flex-1 bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
          />
          {orderType === 'dine-in' && (
            <input
              value={table}
              onChange={e => setTable(e.target.value)}
              placeholder="Table #"
              className="w-20 bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
            />
          )}
        </div>

        {orderType === 'delivery' && (
          <div className="flex gap-2 mt-2">
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Delivery address…"
              className="flex-1 bg-[#1a1a1a] border border-[#E4002B]/30 px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/60 rounded-sm font-body"
            />
            <input
              value={rider}
              onChange={e => setRider(e.target.value)}
              placeholder="Rider name…"
              className="w-36 bg-[#1a1a1a] border border-blue-500/30 px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-blue-400/60 rounded-sm font-body"
            />
          </div>
        )}

        {/* Past orders */}
        {pastOrders.length > 0 && (
          <div className="mt-2 border border-white/5 rounded-sm bg-[#0d0d0d]">
            <div className="px-3 py-1.5 border-b border-white/5">
              <span className="font-heading text-[9px] tracking-widest text-white">
                RETURNING CUSTOMER · {pastOrders.length} PREV ORDER{pastOrders.length !== 1 ? 'S' : ''}
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
              {pastOrders.map(o => (
                <div key={o.id} className="px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-[10px] text-white">
                      #{orderNum(o.id)} · {new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="font-heading text-[10px] text-white">{formatPKR(o.total)}</span>
                  </div>
                  <p className="font-body text-[10px] text-white leading-tight truncate">
                    {o.order_items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-2 py-10">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="font-heading text-xs tracking-widest">CART EMPTY</span>
            <span className="text-[10px] text-white">Tap items to add</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {cart.map(line => (
              <div key={line.key} className="flex items-center gap-2 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-white truncate">{line.name}</p>
                  <p className="font-heading text-xs text-white">{formatPKR(line.price)} each</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => adjustQty(line.key, -1)}
                    className="w-8 h-8 rounded-sm bg-white/5 text-white active:bg-[#E4002B] active:text-white hover:bg-[#E4002B] hover:text-white font-heading text-base leading-none transition-colors"
                  >
                    −
                  </button>
                  <span className="font-heading text-sm text-white w-6 text-center">{line.quantity}</span>
                  <button
                    onClick={() => adjustQty(line.key, +1)}
                    className="w-8 h-8 rounded-sm bg-white/5 text-white active:bg-green-600 active:text-white hover:bg-green-600 hover:text-white font-heading text-base leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="font-heading text-xs text-white w-16 text-right flex-shrink-0">
                  {formatPKR(line.price * line.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 pb-2 border-t border-white/5 pt-3 flex-shrink-0">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Special notes…"
          rows={2}
          className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body resize-none"
        />
      </div>

      {/* Discount */}
      {cart.length > 0 && (
        <div className="px-4 pb-3 border-t border-white/5 pt-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Type toggle */}
            <div className="flex rounded-sm overflow-hidden border border-white/10 flex-shrink-0">
              <button
                onClick={() => { setDiscountType('flat'); setDiscountValue(''); }}
                className={`font-heading text-[10px] tracking-widest px-2.5 py-1.5 transition-colors ${
                  discountType === 'flat' ? 'bg-[#E4002B] text-white' : 'text-white/40 hover:text-white'
                }`}
              >Rs</button>
              <button
                onClick={() => { setDiscountType('pct'); setDiscountValue(''); }}
                className={`font-heading text-[10px] tracking-widest px-2.5 py-1.5 transition-colors ${
                  discountType === 'pct' ? 'bg-[#E4002B] text-white' : 'text-white/40 hover:text-white'
                }`}
              >%</button>
            </div>
            {/* Input */}
            <input
              type="number"
              min={0}
              max={discountType === 'pct' ? 100 : total}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'pct' ? '% off' : 'Amount off'}
              className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 focus:border-[#E4002B]/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none rounded-sm font-heading tabular-nums"
            />
            {/* Quick flat amounts */}
            {discountType === 'flat' && (
              <div className="flex gap-1 flex-shrink-0">
                {[100, 200, 300].map(v => (
                  <button
                    key={v}
                    onClick={() => setDiscountValue(String(v))}
                    className={`font-heading text-[10px] tracking-widest px-2 py-1.5 rounded-sm border transition-colors ${
                      discountValue === String(v)
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
                    }`}
                  >{v}</button>
                ))}
              </div>
            )}
            {/* Clear discount */}
            {discountValue && (
              <button
                onClick={() => setDiscountValue('')}
                className="font-heading text-[10px] text-white/30 hover:text-white/60 flex-shrink-0 transition-colors"
              >✕</button>
            )}
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-heading text-[10px] tracking-widest text-green-400/70">DISCOUNT</span>
              <span className="font-heading text-[10px] text-green-400">− {formatPKR(discountAmount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Total + place order */}
      <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-widest text-white">TOTAL</span>
          <div className="text-right">
            {discountAmount > 0 && (
              <p className="font-heading text-xs text-white/30 line-through">{formatPKR(total)}</p>
            )}
            <span className="font-heading text-2xl text-white">{formatPKR(afterDiscount)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="font-heading text-xs tracking-widest px-4 py-3.5 border border-white/10 text-white hover:text-white hover:border-white/30 rounded-sm transition-colors"
            >
              CLEAR
            </button>
          )}
          <button
            onClick={() => { if (cart.length) { setCashStep(false); setCashGiven(''); setPaymentModal(true); } }}
            disabled={!cart.length || placing}
            className="flex-1 font-heading text-sm tracking-widest py-3.5 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition-colors"
          >
            PLACE ORDER
          </button>
        </div>
      </div>

      {/* Payment method popup */}
      {paymentModal && (() => {
        const given  = parseInt(cashGiven) || 0;
        const change = given - afterDiscount;
        // Quick-amount buttons: round up to common PKR notes
        const notes  = [500, 1000, 2000, 5000].filter(n => n >= afterDiscount);
        // Also add exact and the next note above afterDiscount
        const quickAmounts = Array.from(new Set([
          afterDiscount,
          ...notes,
        ])).sort((a, b) => a - b).slice(0, 4);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => !placing && (setCashStep(false), setCashGiven(''), setPaymentModal(false))}
          >
            <div
              className="bg-[#111] border border-white/10 rounded-sm w-full max-w-xs p-6"
              onClick={e => e.stopPropagation()}
            >
              {!cashStep ? (
                /* ── Step 1: choose method ── */
                <>
                  <p className="font-heading text-xs tracking-[0.3em] text-[#E4002B] mb-1">SELECT</p>
                  <h2 className="font-heading text-2xl text-white mb-1">PAYMENT METHOD</h2>
                  <p className="font-heading text-2xl text-white mb-5">{formatPKR(afterDiscount)}</p>

                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'cash',      label: '💵 CASH',      sub: 'Paid at counter / table',                                  chargedTotal: afterDiscount },
                      { value: 'card',      label: '💳 CARD',      sub: `+1.5% service charge → ${formatPKR(cardTotal)}`,            chargedTotal: cardTotal     },
                      { value: 'pay_later', label: '🕐 PAY LATER', sub: 'Collect payment later',                                     chargedTotal: afterDiscount },
                    ] as const).map(p => (
                      <button
                        key={p.value}
                        disabled={placing}
                        onClick={async () => {
                          if (p.value === 'cash') {
                            setCashStep(true);
                            setCashGiven('');
                          } else {
                            await placeOrder(p.value, p.chargedTotal);
                            setPaymentModal(false);
                            setCartOpen(false);
                          }
                        }}
                        className={`flex items-center gap-4 px-4 py-4 rounded-sm border transition-colors duration-100 text-left disabled:opacity-40 ${
                          p.value === 'pay_later'
                            ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-300'
                            : 'border-white/10 bg-white/3 hover:bg-white/8 text-white'
                        }`}
                      >
                        <span className="text-2xl">{p.label.split(' ')[0]}</span>
                        <div>
                          <p className="font-heading text-sm tracking-widest">{p.label.split(' ').slice(1).join(' ')}</p>
                          <p className={`font-heading text-[10px] tracking-wider mt-0.5 ${p.value === 'card' ? 'text-yellow-400/70' : 'opacity-50'}`}>{p.sub}</p>
                        </div>
                        {p.value === 'card' && (
                          <span className="ml-auto font-heading text-sm text-yellow-400 flex-shrink-0">{formatPKR(cardTotal)}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPaymentModal(false)}
                    className="mt-4 w-full font-heading text-xs tracking-widest py-3 border border-white/10 text-white/40 hover:text-white/70 rounded-sm transition-colors"
                  >
                    CANCEL
                  </button>
                </>
              ) : (
                /* ── Step 2: cash tendered + change ── */
                <>
                  <button
                    onClick={() => { setCashStep(false); setCashGiven(''); }}
                    className="font-heading text-[10px] tracking-widest text-white/40 hover:text-white/70 mb-4 flex items-center gap-1 transition-colors"
                  >
                    ← BACK
                  </button>

                  <p className="font-heading text-xs tracking-[0.3em] text-[#E4002B] mb-1">💵 CASH</p>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-heading text-xs tracking-widest text-white/50">TOTAL DUE</span>
                    <span className="font-heading text-3xl text-white">{formatPKR(afterDiscount)}</span>
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-2 mb-3">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCashGiven(String(amt))}
                        className={`flex-1 font-heading text-xs tracking-widest py-2 rounded-sm border transition-colors ${
                          given === amt
                            ? 'bg-white/10 border-white/30 text-white'
                            : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {amt === afterDiscount ? 'EXACT' : `${(amt/1000).toFixed(amt % 1000 === 0 ? 0 : 1)}K`}
                      </button>
                    ))}
                  </div>

                  {/* Cash input */}
                  <input
                    autoFocus
                    type="number"
                    min={afterDiscount}
                    value={cashGiven}
                    onChange={e => setCashGiven(e.target.value)}
                    placeholder={`Enter amount (min ${afterDiscount})`}
                    className="w-full bg-black/40 border border-white/20 focus:border-white/50 px-4 py-3 text-xl text-white font-heading placeholder:text-white/20 focus:outline-none rounded-sm mb-4 tabular-nums"
                    onKeyDown={async e => {
                      if (e.key === 'Enter' && given >= afterDiscount) {
                        openCashDrawer();
                        await placeOrder('cash', afterDiscount);
                        setCashStep(false); setCashGiven('');
                        setPaymentModal(false); setCartOpen(false);
                      }
                    }}
                  />

                  {/* Change display */}
                  <div className={`rounded-sm px-4 py-4 mb-4 border transition-colors ${
                    given === 0
                      ? 'border-white/5 bg-white/3'
                      : given >= afterDiscount
                        ? 'border-green-500/30 bg-green-500/8'
                        : 'border-red-500/30 bg-red-500/5'
                  }`}>
                    {given === 0 ? (
                      <p className="font-heading text-xs tracking-widest text-white/30 text-center">ENTER CASH AMOUNT</p>
                    ) : given < afterDiscount ? (
                      <>
                        <p className="font-heading text-[10px] tracking-widest text-red-400 mb-0.5">SHORT BY</p>
                        <p className="font-heading text-3xl text-red-400">{formatPKR(afterDiscount - given)}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-heading text-[10px] tracking-widest text-green-400 mb-0.5">CHANGE TO RETURN</p>
                        <p className="font-heading text-4xl text-green-400">{formatPKR(change)}</p>
                      </>
                    )}
                  </div>

                  <button
                    disabled={given < afterDiscount || placing}
                    onClick={async () => {
                      openCashDrawer();
                      await placeOrder('cash', afterDiscount);
                      setCashStep(false); setCashGiven('');
                      setPaymentModal(false); setCartOpen(false);
                    }}
                    className="w-full font-heading text-sm tracking-widest py-4 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
                  >
                    {placing ? 'PLACING…' : given >= afterDiscount ? `CONFIRM — CHANGE ${formatPKR(change)}` : 'ENTER AMOUNT'}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Last order confirmation */}
      {lastOrder && (
        <div className="mx-4 mb-4 border border-green-500/30 bg-green-500/5 rounded-sm px-4 py-3 flex-shrink-0">
          <p className="font-heading text-xs tracking-widest text-green-400 mb-0.5">ORDER PLACED ✓</p>
          <p className="font-heading text-xs text-white">#{orderNum(lastOrder.id)} — {formatPKR(lastOrder.total)}</p>
          <div className="flex items-center gap-4 mt-2">
            <a
              href={`/admin/orders/${lastOrder.id}`}
              className="font-heading text-[10px] tracking-widest text-green-400/60 hover:text-green-400 transition-colors"
            >
              VIEW ORDER →
            </a>
            <button
              onClick={() => printReceipt()}
              className="font-heading text-[10px] tracking-widest text-white hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded-sm transition-colors"
            >
              🖨 PRINT
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0d0d0d] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Cash drawer notification */}
      {drawerStatus === 'opened' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none flex items-center gap-2">
          <span className="text-base">🗄️</span> CASH DRAWER OPENED
        </div>
      )}
      {drawerStatus === 'error' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none flex items-center gap-2">
          <span className="text-base">⚠</span> DRAWER ERROR — CHECK PRINTER
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-600 text-white font-heading text-xs tracking-widest px-4 py-2.5 text-center flex items-center justify-center gap-2">
          <span>⚡</span> NO INTERNET — ORDERS WILL BE SAVED AND SYNCED WHEN RECONNECTED
        </div>
      )}

      {/* ── LEFT: Menu panel ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-white/5">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border-b border-white/5 flex-shrink-0">
          <div className="bg-[#E4002B] text-white font-heading text-xs px-2.5 py-1 tracking-wider">TNB</div>
          <span className="font-heading text-white text-xs tracking-[0.3em] hidden sm:inline">POS TERMINAL</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-heading text-[10px] tracking-widest text-white hidden sm:inline">
              {new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[10px] tracking-widest text-white uppercase">{staffName}</span>
              <span className="font-heading text-[9px] px-1.5 py-0.5 border border-white/10 text-white rounded-sm uppercase hidden sm:inline">{staffRole}</span>
            </div>
            {!drawerPaired && (
              <button
                onClick={pairPrinter}
                className="font-heading text-[9px] tracking-widest text-white/30 hover:text-white/60 transition-colors border border-white/5 hover:border-white/15 px-2 py-1 rounded-sm hidden sm:inline-flex items-center gap-1"
                title="Pair printer for cash drawer (one-time setup)"
              >
                🔗 PAIR PRINTER
              </button>
            )}
            <button
              onClick={openCashDrawer}
              className="font-heading text-[10px] tracking-widest text-white/60 hover:text-green-400 transition-colors border border-white/10 hover:border-green-500/40 px-2.5 py-1 rounded-sm hidden sm:inline-flex items-center gap-1"
              title="Open cash drawer"
            >
              🗄️ DRAWER
            </button>
            <button
              onClick={() => setSessionOpen(true)}
              className="relative font-heading text-[10px] tracking-widest text-white hover:text-white transition-colors border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-sm"
            >
              SESSION
              {sessionOrders.filter(o => o.paymentStatus === 'pending').length > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-heading w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {sessionOrders.filter(o => o.paymentStatus === 'pending').length}
                </span>
              ) : sessionOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#E4002B] text-white text-[9px] font-heading w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {sessionOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={async () => {
                await fetch(`/api/pos/session/${sessionId}`, { method: 'PATCH' });
                await createClient().auth.signOut();
                window.location.href = '/pos/login';
              }}
              className="font-heading text-[10px] tracking-widest text-white hover:text-white transition-colors"
            >
              SIGN OUT
            </button>
            {/* Mobile: cart button in header */}
            <button
              onClick={() => setCartOpen(true)}
              className="md:hidden relative font-heading text-[10px] tracking-widest px-3 py-1.5 bg-[#E4002B] text-white rounded-sm"
            >
              🛒
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-[#E4002B] text-[9px] font-heading w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {cart.reduce((s, l) => s + l.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search + category bar */}
        <div className="px-4 py-3 bg-[#111] border-b border-white/5 flex-shrink-0 space-y-2">
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {(['All', ...CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat as Category | 'All')}
                className={`flex-shrink-0 font-heading text-[10px] tracking-widest px-3 py-2 rounded-sm border transition-colors duration-100 ${
                  category === cat
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white hover:text-white hover:border-white/30'
                }`}
              >
                {cat === 'Pizza Regular v1' ? 'PIZZA REG' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 md:pb-3">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white font-heading text-xs tracking-widest">
              NO ITEMS FOUND
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filtered.map(card => (
                <POSCard key={card.name + card.category} card={card} onAdd={addLine} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile sticky cart bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#111] border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-heading text-xs text-white tracking-widest">
              {cart.length === 0 ? 'CART EMPTY' : `${cart.reduce((s, l) => s + l.quantity, 0)} ITEM${cart.reduce((s, l) => s + l.quantity, 0) !== 1 ? 'S' : ''}`}
            </p>
            {cart.length > 0 && <p className="font-heading text-lg text-white">{formatPKR(total)}</p>}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className={`font-heading text-sm tracking-widest px-6 py-3 rounded-sm transition-colors ${
              cart.length > 0
                ? 'bg-[#E4002B] text-white hover:bg-red-700'
                : 'bg-white/5 text-white cursor-default'
            }`}
            disabled={cart.length === 0}
          >
            VIEW CART →
          </button>
        </div>
      </div>

      {/* ── Desktop: cart sidebar ─────────────────────────────────────── */}
      <div className="hidden md:flex w-80 xl:w-96 flex-col flex-shrink-0">
        {cartPanel}
      </div>

      {/* ── Mobile: cart bottom sheet ─────────────────────────────────── */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/70"
            onClick={() => setCartOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-xl overflow-hidden flex flex-col"
            style={{ maxHeight: '92dvh' }}>
            {/* Sheet handle + close */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm tracking-widest text-white">CART</span>
                {cart.length > 0 && (
                  <span className="font-heading text-[10px] px-2 py-0.5 bg-[#E4002B] text-white rounded-sm">
                    {cart.reduce((s, l) => s + l.quantity, 0)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="font-heading text-xs text-white hover:text-white px-3 py-1.5 border border-white/10 rounded-sm transition-colors"
              >
                CLOSE ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {cartPanel}
            </div>
          </div>
        </>
      )}

      {/* ── Session orders slide-over ──────────────────────────────────── */}
      {sessionOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setSessionOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#111] border-l border-white/10 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div>
                <p className="font-heading text-xs tracking-[0.3em] text-[#E4002B] mb-0.5">CASHIER HISTORY</p>
                <p className="font-heading text-lg text-white">SESSION ORDERS</p>
              </div>
              <button
                onClick={() => setSessionOpen(false)}
                className="font-heading text-xs text-white hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm transition-colors"
              >
                CLOSE ✕
              </button>
            </div>

            {/* Summary bar */}
            {sessionOrders.length > 0 && (() => {
              const unpaidOrders = sessionOrders.filter(o => o.paymentStatus === 'pending');
              const cashTotal = sessionOrders
                .filter(o => o.paymentStatus === 'paid' && o.payment === 'cash')
                .reduce((s, o) => s + o.total, 0);
              return (
                <div className="border-b border-white/5 flex-shrink-0">
                  <div className="px-5 py-3 flex items-center justify-between bg-white/[0.02]">
                    <div>
                      <p className="font-heading text-[10px] tracking-widest text-white">{sessionOrders.length} ORDER{sessionOrders.length !== 1 ? 'S' : ''} THIS SESSION</p>
                      <p className="font-heading text-xl text-white mt-0.5">
                        {formatPKR(sessionOrders.reduce((s, o) => s + o.total, 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      {unpaidOrders.length > 0 && (
                        <p className="font-heading text-[10px] tracking-widest text-orange-400 mb-1">
                          {unpaidOrders.length} UNPAID
                        </p>
                      )}
                      <p className="font-heading text-[10px] tracking-widest text-white">{staffName}</p>
                    </div>
                  </div>
                  {/* Cash in drawer */}
                  <div className="px-5 py-2.5 flex items-center justify-between bg-green-500/5 border-t border-green-500/10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🗄️</span>
                      <p className="font-heading text-[10px] tracking-widest text-green-400">CASH IN DRAWER</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-heading text-base text-green-400">{formatPKR(cashTotal)}</p>
                      <button
                        onClick={openCashDrawer}
                        className="font-heading text-[9px] tracking-widest px-2 py-1 border border-green-500/30 text-green-400/70 hover:text-green-400 hover:border-green-500/60 rounded-sm transition-colors"
                      >
                        OPEN
                      </button>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex border-t border-white/5">
                    {(['all', 'unpaid'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSessionTab(tab)}
                        className={`flex-1 font-heading text-[10px] tracking-widest py-2 transition-colors ${
                          sessionTab === tab
                            ? tab === 'unpaid' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-white border-b-2 border-white'
                            : 'text-white'
                        }`}
                      >
                        {tab === 'all' ? `ALL (${sessionOrders.length})` : `UNPAID (${unpaidOrders.length})`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Order list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {sessionOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white gap-2">
                  <span className="font-heading text-3xl">◎</span>
                  <span className="font-heading text-xs tracking-widest">NO ORDERS YET THIS SESSION</span>
                </div>
              ) : (() => {
                const visible = sessionTab === 'unpaid'
                  ? sessionOrders.filter(o => o.paymentStatus === 'pending')
                  : sessionOrders;
                if (visible.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-full text-white gap-2">
                    <span className="font-heading text-3xl text-green-400">✓</span>
                    <span className="font-heading text-xs tracking-widest text-green-400">ALL ORDERS PAID</span>
                  </div>
                );
                return (
                  <div className="divide-y divide-white/5">
                    {visible.map((o, idx) => (
                      <div key={o.id} className={`px-5 py-4 ${o.cancelled ? 'bg-red-500/5 opacity-60' : o.paymentStatus === 'pending' ? 'bg-orange-500/5' : ''}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-heading text-sm text-white">#{orderNum(o.id)}</span>
                              <span className="font-heading text-[10px] px-1.5 py-0.5 border border-white/10 text-white rounded-sm">
                                {o.orderType === 'dine-in' ? (o.table ? `TABLE ${o.table}` : 'DINE-IN') : o.orderType === 'delivery' ? 'DELIVERY' : 'TAKEAWAY'}
                              </span>
                              {o.cancelled ? (
                                <span className="font-heading text-[9px] px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-sm">CANCELLED</span>
                              ) : o.paymentStatus === 'pending' ? (
                                <span className="font-heading text-[9px] px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/40 text-orange-400 rounded-sm">UNPAID</span>
                              ) : (
                                idx === 0 && sessionTab === 'all' && (
                                  <span className="font-heading text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-sm">LATEST</span>
                                )
                              )}
                            </div>
                            <p className="font-heading text-xs text-white tracking-wider">
                              {o.customerName} · {o.placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-heading text-sm text-white">{formatPKR(o.total)}</p>
                            <p className={`font-heading text-[10px] ${o.paymentStatus === 'pending' ? 'text-orange-400' : 'text-white'}`}>
                              {o.paymentStatus === 'pending' ? 'PAY LATER' : o.payment.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        {/* Items */}
                        <div className="mb-3 space-y-0.5">
                          {o.items.map((item, i) => (
                            <p key={i} className="font-body text-xs text-white">
                              {item.quantity}× {item.name} <span className="text-white">— {formatPKR(item.price * item.quantity)}</span>
                            </p>
                          ))}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          {!o.cancelled && o.paymentStatus === 'pending' && settleId !== o.id && (
                            <button
                              onClick={() => setSettleId(o.id)}
                              className="font-heading text-[10px] tracking-widest text-orange-400 border border-orange-500/40 hover:bg-orange-500/10 px-3 py-1.5 rounded-sm transition-colors"
                            >
                              💰 SETTLE PAYMENT
                            </button>
                          )}
                          {!o.cancelled && settleId === o.id && (
                            <div className="flex gap-1.5 items-center flex-wrap">
                              <span className="font-heading text-[9px] text-white tracking-widest">PAID BY:</span>
                              <button
                                onClick={() => settleOrder(o.id, 'cash')}
                                disabled={settling}
                                className="font-heading text-[10px] tracking-widest px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-sm disabled:opacity-50 transition-colors"
                              >
                                {settling ? '…' : '💵 CASH'}
                              </button>
                              <button
                                onClick={() => settleOrder(o.id, 'card')}
                                disabled={settling}
                                className="font-heading text-[10px] tracking-widest px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm disabled:opacity-50 transition-colors"
                              >
                                {settling ? '…' : '💳 CARD'}
                              </button>
                              <button
                                onClick={() => setSettleId(null)}
                                className="font-heading text-[10px] text-white px-2 py-1.5 border border-white/10 rounded-sm"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => printReceipt(o)}
                            className="font-heading text-[10px] tracking-widest text-white hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm transition-colors"
                          >
                            🖨 {o.paymentStatus === 'pending' ? 'PRINT SLIP' : 'REPRINT'}
                          </button>
                          {!o.cancelled && cancelId !== o.id ? (
                            <button
                              onClick={() => { setCancelId(o.id); setSettleId(null); }}
                              className="font-heading text-[10px] tracking-widest text-red-400/60 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-sm transition-colors"
                            >
                              ✕ CANCEL
                            </button>
                          ) : (
                            <div className="flex gap-1.5 items-center flex-wrap">
                              <span className="font-heading text-[9px] text-red-400 tracking-widest">CANCEL ORDER?</span>
                              <button
                                onClick={() => cancelOrderPos(o.id)}
                                disabled={cancelling}
                                className="font-heading text-[10px] tracking-widest px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-sm disabled:opacity-50 transition-colors"
                              >
                                {cancelling ? '…' : 'YES'}
                              </button>
                              <button
                                onClick={() => setCancelId(null)}
                                className="font-heading text-[10px] text-white px-2 py-1.5 border border-white/10 rounded-sm"
                              >
                                NO
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── POS Card ─────────────────────────────────────────────────────────────────
function POSCard({ card, onAdd }: {
  card: MenuCard;
  onAdd: (line: Omit<CartLine, 'quantity'>) => void;
}) {
  const [sizeIdx, setSizeIdx]   = useState(0);
  const [variantIdx, setVariantIdx] = useState(0);

  function getLine(): Omit<CartLine, 'quantity'> {
    if (card.kind === 'pizza') {
      const s = card.sizes[sizeIdx];
      return { key: s.sku, name: `${card.name} (${s.label})`, price: s.price, menu_item_id: card.base.id };
    }
    if (card.kind === 'burger') {
      const v = card.variants[variantIdx];
      return { key: v.sku, name: `${card.name} (${v.label})`, price: v.price, menu_item_id: card.base.id };
    }
    return { key: card.item.sku, name: card.name, price: card.item.price, menu_item_id: card.item.id };
  }

  const currentPrice = card.kind === 'pizza'
    ? card.sizes[sizeIdx]?.price
    : card.kind === 'burger'
    ? card.variants[variantIdx]?.price
    : card.item.price;

  const img = cardImage(card);

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-sm overflow-hidden hover:border-[#E4002B]/40 transition-colors group flex flex-col">
      {/* Image */}
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => onAdd(getLine())}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={card.name}
          className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="bg-[#E4002B] text-white font-heading text-xs tracking-widest px-3 py-1.5">
            + ADD
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <p className="font-heading text-xs text-white leading-tight truncate">{card.name}</p>

        {/* Size picker for pizzas */}
        {card.kind === 'pizza' && (
          <div className="flex gap-1 flex-wrap">
            {card.sizes.map((s, i) => (
              <button
                key={s.sku}
                onClick={() => setSizeIdx(i)}
                className={`font-heading text-[9px] tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                  i === sizeIdx
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white hover:border-white/30 hover:text-white'
                }`}
              >
                {s.size}
              </button>
            ))}
          </div>
        )}

        {/* Variant for burgers */}
        {card.kind === 'burger' && (
          <div className="flex gap-1">
            {card.variants.map((v, i) => (
              <button
                key={v.sku}
                onClick={() => setVariantIdx(i)}
                className={`font-heading text-[9px] tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                  i === variantIdx
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white hover:border-white/30 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="font-heading text-xs text-white">{formatPKR(currentPrice)}</span>
          <button
            onClick={() => onAdd(getLine())}
            className="bg-[#E4002B] text-white font-heading text-[10px] tracking-widest px-3 py-1.5 rounded-sm active:bg-red-700 hover:bg-red-700 transition-colors"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
