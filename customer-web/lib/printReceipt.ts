export interface ReceiptOrder {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  table_number?: string | null;
  delivery_address?: string | null;
  rider_name?: string | null;
  order_type?: string | null;
  payment_method: string;
  special_notes?: string | null;
  total: number;
  created_at: string;
  order_items: { item_name: string; item_price: number; quantity: number }[];
}

export function printOrderReceipt(order: ReceiptOrder) {
  const logoUrl   = `${window.location.origin}/logo-dark.png`;
  const placedAt  = new Date(order.created_at);
  const dateStr   = placedAt.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr   = placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const shortId   = parseInt(order.id.replace(/-/g, '').slice(-4), 16).toString().padStart(4, '0');
  const orderType = order.order_type ?? 'dine-in';

  const typeLabel =
    orderType === 'delivery' ? 'DELIVERY' :
    orderType === 'takeaway' ? 'TAKEAWAY' :
    order.table_number       ? `DINE-IN · TABLE ${order.table_number}` : 'DINE-IN';

  const rows = order.order_items.map(i => `
    <tr>
      <td style="padding:4px 0 2px;font-size:12px;vertical-align:top;">${i.item_name}</td>
      <td style="padding:4px 0 2px;font-size:12px;text-align:center;white-space:nowrap;">×${i.quantity}</td>
      <td style="padding:4px 0 2px;font-size:12px;text-align:right;white-space:nowrap;">${i.item_price * i.quantity}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 74mm; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .small  { font-size: 10px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
</style>
</head><body>
  <div class="center" style="margin-bottom:6px;">
    <img src="${logoUrl}" alt="TNB" style="width:64px;height:auto;display:block;margin:0 auto 4px;" />
    <p class="bold" style="font-size:13px;letter-spacing:2px;">THE NOOK BITE</p>
    <p class="small" style="color:#555;">ORDER RECEIPT</p>
  </div>

  <hr class="divider" />

  <table>
    <tr><td class="small">Order</td><td class="small right bold">#${shortId}</td></tr>
    <tr><td class="small">Date</td><td class="small right">${dateStr}</td></tr>
    <tr><td class="small">Time</td><td class="small right">${timeStr}</td></tr>
    <tr><td class="small">Type</td><td class="small right">${typeLabel}</td></tr>
    ${order.delivery_address ? `<tr><td class="small">Address</td><td class="small right" style="max-width:120px;word-break:break-word;">${order.delivery_address}</td></tr>` : ''}
    ${order.rider_name ? `<tr><td class="small">Rider</td><td class="small right">${order.rider_name}</td></tr>` : ''}
    ${order.customer_name ? `<tr><td class="small">Customer</td><td class="small right">${order.customer_name}</td></tr>` : ''}
    ${order.customer_phone ? `<tr><td class="small">Phone</td><td class="small right">${order.customer_phone}</td></tr>` : ''}
    <tr><td class="small">Payment</td><td class="small right">${order.payment_method.toUpperCase()}</td></tr>
  </table>

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th style="font-size:10px;text-align:left;padding-bottom:3px;">ITEM</th>
        <th style="font-size:10px;text-align:center;padding-bottom:3px;">QTY</th>
        <th style="font-size:10px;text-align:right;padding-bottom:3px;">PKR</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <hr class="divider" />

  <table>
    <tr>
      <td class="bold" style="font-size:14px;">TOTAL</td>
      <td class="bold right" style="font-size:14px;">Rs. ${order.total}</td>
    </tr>
  </table>

  ${order.special_notes ? `<hr class="divider" /><p class="small center" style="color:#555;">Note: ${order.special_notes}</p>` : ''}

  <hr class="divider" />
  <p class="center small" style="color:#555;margin-top:4px;">Thank you for your order!</p>
  <p class="center small" style="color:#555;">thenookbite.com</p>
  <br/><br/>
</body></html>`;

  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}
