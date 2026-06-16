'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatPKR } from '@/lib/format';

interface OrderItem { item_name: string; item_price: number; quantity: number }
interface SessionOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total: number;
  status: string;
  payment_method: string;
  order_type: string;
  table_number: string | null;
  created_at: string;
  order_items: OrderItem[];
}
interface StaffSession {
  staff_id: string;
  staff_name: string;
  orders: SessionOrder[];
  total_orders: number;
  total_revenue: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  preparing: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  ready:     'text-green-400 border-green-500/30 bg-green-500/5',
  completed: 'text-white/30 border-white/10 bg-white/5',
};

export function POSSessionsClient() {
  const today = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [date, setDate]           = useState(today);
  const [sessions, setSessions]   = useState<StaffSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});

  const fetchSessions = useCallback(async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/pos-sessions?date=${d}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
      // Auto-expand first session
      if (data.sessions?.length > 0 && Object.keys(expanded).length === 0) {
        setExpanded({ [data.sessions[0].staff_id]: true });
      }
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSessions(date); }, [date, fetchSessions]);

  function toggleExpand(staffId: string) {
    setExpanded(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  }

  function printSessionSummary(session: StaffSession) {
    const dateLabel = new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows = session.orders.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
      const type = o.order_type === 'dine-in' ? (o.table_number ? `T${o.table_number}` : 'DINE') : 'TAKE';
      return `
      <tr>
        <td style="padding:3px 0;font-size:11px;">#${o.id.slice(-6).toUpperCase()}</td>
        <td style="padding:3px 0;font-size:11px;text-align:center;">${time}</td>
        <td style="padding:3px 0;font-size:11px;text-align:center;">${type}</td>
        <td style="padding:3px 0;font-size:11px;text-align:center;">${o.payment_method.toUpperCase()}</td>
        <td style="padding:3px 0;font-size:11px;text-align:right;">Rs.${o.total.toLocaleString()}</td>
      </tr>`;
    }).join('');

    const cashTotal  = session.orders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + o.total, 0);
    const cardTotal  = session.orders.filter(o => o.payment_method === 'card').reduce((s, o) => s + o.total, 0);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Session Summary — ${session.staff_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 6mm 4mm 10mm; font-size: 12px; color: #000; background: #fff; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .small  { font-size: 10px; }
  .dash   { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .solid  { border: none; border-top: 1px solid #000; margin: 5px 0; }
  table   { width: 100%; border-collapse: collapse; }
  @media print { @page { margin: 0; size: 80mm auto; } body { padding: 4mm 3mm 12mm; } }
</style>
</head>
<body>

  <div class="center" style="margin-bottom:6px;">
    <div style="display:inline-block;border:3px solid #000;padding:4px 14px;margin-bottom:4px;">
      <div style="font-size:28px;font-weight:900;letter-spacing:6px;line-height:1;">TNB</div>
    </div>
    <div style="font-size:13px;font-weight:bold;letter-spacing:3px;margin-bottom:1px;">THE NOOK BITE</div>
    <div style="font-size:10px;color:#333;">SESSION SUMMARY</div>
  </div>

  <hr class="solid">

  <table style="margin:4px 0;">
    <tr>
      <td class="small">Date</td>
      <td class="small right"><b>${dateLabel}</b></td>
    </tr>
    <tr>
      <td class="small">Cashier</td>
      <td class="small right"><b>${session.staff_name}</b></td>
    </tr>
    <tr>
      <td class="small">Total Orders</td>
      <td class="small right"><b>${session.total_orders}</b></td>
    </tr>
    <tr>
      <td class="small">Printed</td>
      <td class="small right">${new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</td>
    </tr>
  </table>

  <hr class="dash">

  <table>
    <thead>
      <tr>
        <th style="text-align:left;font-size:10px;padding-bottom:3px;">ORDER</th>
        <th style="text-align:center;font-size:10px;padding-bottom:3px;">TIME</th>
        <th style="text-align:center;font-size:10px;padding-bottom:3px;">TYPE</th>
        <th style="text-align:center;font-size:10px;padding-bottom:3px;">PAY</th>
        <th style="text-align:right;font-size:10px;padding-bottom:3px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <hr class="dash">

  <table style="margin:4px 0;">
    <tr>
      <td class="small">Cash</td>
      <td class="small right">Rs.${cashTotal.toLocaleString()}</td>
    </tr>
    <tr>
      <td class="small">Card</td>
      <td class="small right">Rs.${cardTotal.toLocaleString()}</td>
    </tr>
  </table>

  <hr class="solid">

  <table style="margin:4px 0 6px;">
    <tr>
      <td style="font-size:15px;font-weight:900;">GRAND TOTAL</td>
      <td style="font-size:15px;font-weight:900;text-align:right;">Rs.${session.total_revenue.toLocaleString()}</td>
    </tr>
  </table>

  <hr class="solid">

  <div class="center" style="margin-top:8px;">
    <div style="font-size:10px;color:#777;">Powered by TNB POS System</div>
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

  function printOrderReceipt(order: SessionOrder, staffName: string) {
    const placedAt  = new Date(order.created_at);
    const dateStr   = placedAt.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr   = placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const subtotal  = order.order_items.reduce((s, i) => s + i.item_price * i.quantity, 0);
    const itemCount = order.order_items.reduce((s, i) => s + i.quantity, 0);
    const tableNum  = order.table_number;

    const rows = order.order_items.map(l => `
      <tr>
        <td style="padding:4px 0 2px;font-size:12px;vertical-align:top;">${l.item_name}</td>
        <td style="padding:4px 0 2px;font-size:12px;text-align:center;vertical-align:top;white-space:nowrap;">x${l.quantity}</td>
        <td style="padding:4px 0 2px;font-size:12px;text-align:right;vertical-align:top;white-space:nowrap;">Rs.${(l.item_price * l.quantity).toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:0 0 4px;font-size:10px;color:#555;">@ Rs.${l.item_price.toLocaleString()} each</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${order.id.slice(-6).toUpperCase()}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 6mm 4mm 10mm; font-size: 12px; color: #000; background: #fff; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .small  { font-size: 10px; }
  .dash   { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .solid  { border: none; border-top: 1px solid #000; margin: 5px 0; }
  table   { width: 100%; border-collapse: collapse; }
  @media print { @page { margin: 0; size: 80mm auto; } body { padding: 4mm 3mm 12mm; } }
</style>
</head>
<body>
  <div class="center" style="margin-bottom:6px;">
    <div style="display:inline-block;border:3px solid #000;padding:4px 14px;margin-bottom:4px;">
      <div style="font-size:28px;font-weight:900;letter-spacing:6px;line-height:1;">TNB</div>
    </div>
    <div style="font-size:13px;font-weight:bold;letter-spacing:3px;margin-bottom:1px;">THE NOOK BITE</div>
    <div style="font-size:10px;color:#333;">Mandi Bahauddin, Punjab, Pakistan</div>
    <div style="font-size:10px;color:#333;">12 PM – 12 AM Daily</div>
  </div>
  <hr class="solid">
  <table style="margin:4px 0;">
    <tr><td class="small">Order #</td><td class="small right"><b>${order.id.slice(-6).toUpperCase()}</b></td></tr>
    <tr><td class="small">Date</td><td class="small right">${dateStr}</td></tr>
    <tr><td class="small">Time</td><td class="small right">${timeStr}</td></tr>
    <tr><td class="small">Type</td><td class="small right">${order.order_type === 'dine-in' ? `DINE-IN${tableNum ? ` · TABLE ${tableNum}` : ''}` : 'TAKEAWAY'}</td></tr>
    ${order.customer_name ? `<tr><td class="small">Customer</td><td class="small right">${order.customer_name}</td></tr>` : ''}
    ${order.customer_phone ? `<tr><td class="small">Phone</td><td class="small right">${order.customer_phone}</td></tr>` : ''}
    <tr><td class="small">Cashier</td><td class="small right">${staffName}</td></tr>
  </table>
  <hr class="dash">
  <table>
    <thead>
      <tr>
        <th style="text-align:left;font-size:11px;padding-bottom:4px;">ITEM</th>
        <th style="text-align:center;font-size:11px;padding-bottom:4px;">QTY</th>
        <th style="text-align:right;font-size:11px;padding-bottom:4px;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <hr class="dash">
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
      <td style="font-size:15px;font-weight:900;">TOTAL</td>
      <td style="font-size:15px;font-weight:900;text-align:right;">Rs.${order.total.toLocaleString()}</td>
    </tr>
    <tr>
      <td class="small" style="padding-top:3px;">Payment</td>
      <td class="small right" style="padding-top:3px;font-weight:bold;">${order.payment_method.toUpperCase()}</td>
    </tr>
  </table>
  <hr class="solid">
  <div class="center" style="margin-top:8px;">
    <div style="font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:3px;">THANK YOU FOR YOUR VISIT!</div>
    <div style="font-size:10px;color:#777;">Powered by TNB POS System</div>
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

  const totalRevenue = sessions.reduce((s, sess) => s + sess.total_revenue, 0);
  const totalOrders  = sessions.reduce((s, sess) => s + sess.total_orders, 0);

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">POS</p>
          <h1 className="font-heading text-3xl text-white">SESSION ORDERS</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-[#E4002B]/40 rounded-sm"
          />
          <button
            onClick={() => fetchSessions(date)}
            className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:border-white/30 hover:text-white rounded-sm transition-colors"
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="border border-white/5 bg-[#111] rounded-sm px-4 py-3">
            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1">TOTAL ORDERS</p>
            <p className="font-heading text-2xl text-white">{totalOrders}</p>
          </div>
          <div className="border border-white/5 bg-[#111] rounded-sm px-4 py-3">
            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1">TOTAL REVENUE</p>
            <p className="font-heading text-2xl text-white">{formatPKR(totalRevenue)}</p>
          </div>
          <div className="border border-white/5 bg-[#111] rounded-sm px-4 py-3">
            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1">CASHIERS ACTIVE</p>
            <p className="font-heading text-2xl text-white">{sessions.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-white/20 font-heading text-sm tracking-widest animate-pulse">
          LOADING…
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center text-white/20 font-heading text-sm tracking-widest">
          NO POS ORDERS FOR THIS DATE
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.staff_id} className="border border-white/5 bg-[#111] rounded-sm overflow-hidden">
              {/* Session header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => toggleExpand(session.staff_id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-heading text-sm text-white">{session.staff_name}</p>
                    <p className="font-heading text-xs text-white/30 mt-0.5">
                      {session.total_orders} ORDER{session.total_orders !== 1 ? 'S' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-heading text-lg text-white">{formatPKR(session.total_revenue)}</p>
                    <p className="font-heading text-[10px] text-white/30">
                      CASH {formatPKR(session.orders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + o.total, 0))} ·
                      CARD {formatPKR(session.orders.filter(o => o.payment_method === 'card').reduce((s, o) => s + o.total, 0))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); printSessionSummary(session); }}
                      className="font-heading text-[10px] tracking-widest px-3 py-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 rounded-sm transition-colors"
                    >
                      🖨 PRINT SUMMARY
                    </button>
                    <span className="font-heading text-white/20 text-sm">{expanded[session.staff_id] ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {/* Order list */}
              {expanded[session.staff_id] && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {session.orders.map(order => {
                    const time = new Date(order.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={order.id} className="flex items-start justify-between px-5 py-3 gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-heading text-sm text-white">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className={`font-heading text-[10px] px-1.5 py-0.5 border rounded-sm ${STATUS_STYLES[order.status] ?? 'text-white/30 border-white/10 bg-white/5'}`}>
                              {order.status.toUpperCase()}
                            </span>
                            <span className="font-heading text-[10px] text-white/30">{time}</span>
                            {order.table_number && (
                              <span className="font-heading text-[10px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded-sm">
                                TABLE {order.table_number}
                              </span>
                            )}
                          </div>
                          <p className="font-heading text-xs text-white/30 mb-1.5">
                            {order.customer_name}
                            {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                            {' · '}{order.payment_method.toUpperCase()}
                          </p>
                          <p className="font-body text-xs text-white/20 leading-tight">
                            {order.order_items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-heading text-sm text-white">{formatPKR(order.total)}</span>
                          <button
                            onClick={() => printOrderReceipt(order, session.staff_name.split(' (')[0])}
                            className="font-heading text-[10px] tracking-widest px-2.5 py-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 rounded-sm transition-colors"
                          >
                            🖨
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
