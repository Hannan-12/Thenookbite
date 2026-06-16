'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CATEGORIES, type Category, type MenuCard } from '@/lib/types';
import { formatPKR, isValidPakistaniPhone, normalizePhone } from '@/lib/format';
import { imageForItem } from '@/lib/itemImages';
import { createClient } from '@/lib/supabase/client';

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
  orderType: OrderType;
  payment: PaymentMethod;
  items: CartLine[];
  notes: string;
  placedAt: Date;
}

type OrderType = 'dine-in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'card';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const [toast, setToast]           = useState<string | null>(null);
  const searchRef                   = useRef<HTMLInputElement>(null);
  const lookupTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load today's orders for this staff member on mount ───────────────────────
  useEffect(() => {
    if (!staffId) return;
    const params = new URLSearchParams({ staff_id: staffId });
    if (sessionId) params.set('session_id', sessionId);
    fetch(`/api/pos/staff-orders?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((orders: Array<{
        id: string; total: number; customer_name: string; customer_phone: string;
        table_number: string | null; delivery_address: string | null;
        order_type: string; payment_method: string;
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
          orderType: (o.order_type as OrderType) ?? 'dine-in',
          payment: (o.payment_method as PaymentMethod) ?? 'cash',
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
    setCustomer('');
    setPhone('');
    setPhoneError(null);
    setPastOrders([]);
    setNotes('');
    setOrderType('dine-in');
    setPayment('cash');
  }

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  // ── Place order ───────────────────────────────────────────────────────────────
  async function placeOrder() {
    if (!cart.length) return;
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPakistaniPhone(normalizedPhone)) {
      setPhoneError('Enter a valid Pakistani mobile number (03XXXXXXXXX)');
      showToast('Phone number required');
      return;
    }
    setPlacing(true);
    try {
      const nameDefault =
        orderType === 'dine-in'  ? `Table ${table || '?'}` :
        orderType === 'delivery' ? 'Delivery'               : 'Counter';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:    customer || nameDefault,
          customer_phone:   normalizedPhone,
          table_number:     orderType === 'dine-in' ? (table || null) : null,
          delivery_address: orderType === 'delivery' ? (address || null) : null,
          order_type:       orderType,
          special_notes:    notes || null,
          payment_method:   payment,
          user_id:          null,
          staff_id:         staffId,
          session_id:       sessionId,
          items: cart.map(l => ({
            menu_item_id: l.menu_item_id,
            item_name: l.name,
            item_price: l.price,
            quantity: l.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Order failed');
      }
      const order = await res.json();
      const completedOrder: SessionOrder = {
        id: order.id,
        total: order.total,
        customerName: customer || nameDefault,
        phone: normalizedPhone,
        table,
        address,
        orderType,
        payment,
        items: [...cart],
        notes,
        placedAt: new Date(),
      };
      setLastOrder(completedOrder);
      setSessionOrders(prev => [completedOrder, ...prev]);
      clearCart();
      showToast('Order placed!');
    } catch (e) {
      showToast('Failed: ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setPlacing(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function printReceipt(order?: SessionOrder) {
    const target = order ?? lastOrder;
    if (!target) return;
    const { id, total, customerName, phone, table, address, orderType, payment, items, notes, placedAt } = target;
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
<title>Receipt #${id.slice(-6).toUpperCase()}</title>
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
        <td class="small right"><b>${id.slice(-6).toUpperCase()}</b></td>
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
    <tr>
      <td class="small" style="color:#555;">Tax / Service Charge</td>
      <td class="small right" style="color:#555;">Incl.</td>
    </tr>
  </table>

  <hr class="solid">

  <table style="margin:4px 0 6px;">
    <tr>
      <td style="font-size:15px;font-weight:900;letter-spacing:1px;">TOTAL</td>
      <td style="font-size:15px;font-weight:900;text-align:right;">Rs.${total.toLocaleString()}</td>
    </tr>
    <tr>
      <td class="small" style="padding-top:3px;">Payment Method</td>
      <td class="small right" style="padding-top:3px;font-weight:bold;">${payment === 'cash' ? 'CASH' : 'CARD'}</td>
    </tr>
  </table>

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
                  : 'border-white/10 text-white/30 hover:text-white'
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
              className={`w-full bg-[#1a1a1a] border px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none rounded-sm font-body pr-16 ${
                phoneError ? 'border-[#E4002B]/60' : 'border-white/10 focus:border-[#E4002B]/40'
              }`}
            />
            {lookingUp && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-heading text-[9px] tracking-widest text-white/20 animate-pulse">
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
            className="flex-1 bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
          />
          {orderType === 'dine-in' && (
            <input
              value={table}
              onChange={e => setTable(e.target.value)}
              placeholder="Table #"
              className="w-20 bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
            />
          )}
        </div>

        {orderType === 'delivery' && (
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Delivery address…"
            className="w-full mt-2 bg-[#1a1a1a] border border-[#E4002B]/30 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/60 rounded-sm font-body"
          />
        )}

        {/* Past orders */}
        {pastOrders.length > 0 && (
          <div className="mt-2 border border-white/5 rounded-sm bg-[#0d0d0d]">
            <div className="px-3 py-1.5 border-b border-white/5">
              <span className="font-heading text-[9px] tracking-widest text-white/30">
                RETURNING CUSTOMER · {pastOrders.length} PREV ORDER{pastOrders.length !== 1 ? 'S' : ''}
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
              {pastOrders.map(o => (
                <div key={o.id} className="px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-[10px] text-white/50">
                      #{o.id.slice(-6).toUpperCase()} · {new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="font-heading text-[10px] text-white/50">{formatPKR(o.total)}</span>
                  </div>
                  <p className="font-body text-[10px] text-white/25 leading-tight truncate">
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
          <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2 py-10">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span className="font-heading text-xs tracking-widest">CART EMPTY</span>
            <span className="text-[10px] text-white/10">Tap items to add</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {cart.map(line => (
              <div key={line.key} className="flex items-center gap-2 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-white truncate">{line.name}</p>
                  <p className="font-heading text-xs text-white/30">{formatPKR(line.price)} each</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => adjustQty(line.key, -1)}
                    className="w-8 h-8 rounded-sm bg-white/5 text-white/50 active:bg-[#E4002B] active:text-white hover:bg-[#E4002B] hover:text-white font-heading text-base leading-none transition-colors"
                  >
                    −
                  </button>
                  <span className="font-heading text-sm text-white w-6 text-center">{line.quantity}</span>
                  <button
                    onClick={() => adjustQty(line.key, +1)}
                    className="w-8 h-8 rounded-sm bg-white/5 text-white/50 active:bg-green-600 active:text-white hover:bg-green-600 hover:text-white font-heading text-base leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="font-heading text-xs text-white/60 w-16 text-right flex-shrink-0">
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
          className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body resize-none"
        />
      </div>

      {/* Payment */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex gap-2">
          {(['cash', 'card'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPayment(p)}
              className={`flex-1 font-heading text-xs tracking-widest py-3 rounded-sm border transition-colors duration-100 ${
                payment === p
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/5 text-white/20 hover:text-white hover:border-white/10'
              }`}
            >
              {p === 'cash' ? '💵 CASH' : '💳 CARD'}
            </button>
          ))}
        </div>
      </div>

      {/* Total + place order */}
      <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-widest text-white/40">TOTAL</span>
          <span className="font-heading text-2xl text-white">{formatPKR(total)}</span>
        </div>
        <div className="flex gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="font-heading text-xs tracking-widest px-4 py-3.5 border border-white/10 text-white/30 hover:text-white hover:border-white/30 rounded-sm transition-colors"
            >
              CLEAR
            </button>
          )}
          <button
            onClick={async () => { await placeOrder(); setCartOpen(false); }}
            disabled={!cart.length || placing}
            className="flex-1 font-heading text-sm tracking-widest py-3.5 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition-colors"
          >
            {placing ? 'PLACING…' : 'PLACE ORDER'}
          </button>
        </div>
      </div>

      {/* Last order confirmation */}
      {lastOrder && (
        <div className="mx-4 mb-4 border border-green-500/30 bg-green-500/5 rounded-sm px-4 py-3 flex-shrink-0">
          <p className="font-heading text-xs tracking-widest text-green-400 mb-0.5">ORDER PLACED ✓</p>
          <p className="font-heading text-xs text-white/50">#{lastOrder.id.slice(-6).toUpperCase()} — {formatPKR(lastOrder.total)}</p>
          <div className="flex items-center gap-4 mt-2">
            <a
              href={`/admin/orders/${lastOrder.id}`}
              className="font-heading text-[10px] tracking-widest text-green-400/60 hover:text-green-400 transition-colors"
            >
              VIEW ORDER →
            </a>
            <button
              onClick={() => printReceipt()}
              className="font-heading text-[10px] tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2 py-1 rounded-sm transition-colors"
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

      {/* ── LEFT: Menu panel ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-white/5">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border-b border-white/5 flex-shrink-0">
          <div className="bg-[#E4002B] text-white font-heading text-xs px-2.5 py-1 tracking-wider">TNB</div>
          <span className="font-heading text-white/40 text-xs tracking-[0.3em] hidden sm:inline">POS TERMINAL</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-heading text-[10px] tracking-widest text-white/20 hidden sm:inline">
              {new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[10px] tracking-widest text-white/40 uppercase">{staffName}</span>
              <span className="font-heading text-[9px] px-1.5 py-0.5 border border-white/10 text-white/20 rounded-sm uppercase hidden sm:inline">{staffRole}</span>
            </div>
            <button
              onClick={() => setSessionOpen(true)}
              className="relative font-heading text-[10px] tracking-widest text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-sm"
            >
              SESSION
              {sessionOrders.length > 0 && (
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
              className="font-heading text-[10px] tracking-widest text-white/20 hover:text-white transition-colors"
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
            className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {(['All', ...CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat as Category | 'All')}
                className={`flex-shrink-0 font-heading text-[10px] tracking-widest px-3 py-2 rounded-sm border transition-colors duration-100 ${
                  category === cat
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white/30 hover:text-white hover:border-white/30'
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
            <div className="flex items-center justify-center h-40 text-white/20 font-heading text-xs tracking-widest">
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
            <p className="font-heading text-xs text-white/40 tracking-widest">
              {cart.length === 0 ? 'CART EMPTY' : `${cart.reduce((s, l) => s + l.quantity, 0)} ITEM${cart.reduce((s, l) => s + l.quantity, 0) !== 1 ? 'S' : ''}`}
            </p>
            {cart.length > 0 && <p className="font-heading text-lg text-white">{formatPKR(total)}</p>}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className={`font-heading text-sm tracking-widest px-6 py-3 rounded-sm transition-colors ${
              cart.length > 0
                ? 'bg-[#E4002B] text-white hover:bg-red-700'
                : 'bg-white/5 text-white/20 cursor-default'
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
                className="font-heading text-xs text-white/30 hover:text-white px-3 py-1.5 border border-white/10 rounded-sm transition-colors"
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
                className="font-heading text-xs text-white/30 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm transition-colors"
              >
                CLOSE ✕
              </button>
            </div>

            {/* Summary bar */}
            {sessionOrders.length > 0 && (
              <div className="px-5 py-3 border-b border-white/5 flex-shrink-0 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <p className="font-heading text-[10px] tracking-widest text-white/30">{sessionOrders.length} ORDER{sessionOrders.length !== 1 ? 'S' : ''} THIS SESSION</p>
                  <p className="font-heading text-xl text-white mt-0.5">
                    {formatPKR(sessionOrders.reduce((s, o) => s + o.total, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-[10px] tracking-widest text-white/30">{staffName}</p>
                  <p className="font-heading text-xs text-white/40 mt-0.5">{staffRole.toUpperCase()}</p>
                </div>
              </div>
            )}

            {/* Order list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {sessionOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                  <span className="font-heading text-3xl">◎</span>
                  <span className="font-heading text-xs tracking-widest">NO ORDERS YET THIS SESSION</span>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {sessionOrders.map((o, idx) => (
                    <div key={o.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-heading text-sm text-white">#{o.id.slice(-6).toUpperCase()}</span>
                            <span className="font-heading text-[10px] px-1.5 py-0.5 border border-white/10 text-white/30 rounded-sm">
                              {o.orderType === 'dine-in' ? (o.table ? `TABLE ${o.table}` : 'DINE-IN') : o.orderType === 'delivery' ? 'DELIVERY' : 'TAKEAWAY'}
                            </span>
                            {idx === 0 && (
                              <span className="font-heading text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-sm">LATEST</span>
                            )}
                          </div>
                          <p className="font-heading text-xs text-white/30 tracking-wider">
                            {o.customerName} · {o.placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-heading text-sm text-white">{formatPKR(o.total)}</p>
                          <p className="font-heading text-[10px] text-white/30">{o.payment.toUpperCase()}</p>
                        </div>
                      </div>
                      {/* Items */}
                      <div className="mb-3 space-y-0.5">
                        {o.items.map((item, i) => (
                          <p key={i} className="font-body text-xs text-white/30">
                            {item.quantity}× {item.name} <span className="text-white/15">— {formatPKR(item.price * item.quantity)}</span>
                          </p>
                        ))}
                      </div>
                      {/* Reprint */}
                      <button
                        onClick={() => printReceipt(o)}
                        className="font-heading text-[10px] tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm transition-colors"
                      >
                        🖨 REPRINT RECEIPT
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white'
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
                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="font-heading text-xs text-white/60">{formatPKR(currentPrice)}</span>
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
