const API = '/api';

export interface OrderItemPayload {
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
}

export interface CreateOrderPayload {
  customer_name: string;
  table_number?: string | null;
  special_notes?: string | null;
  payment_method: 'cash';
  items: OrderItemPayload[];
  user_id?: string | null;
}

export async function createOrder(payload: CreateOrderPayload): Promise<{ id: string }> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Order failed: ${res.status}`);
  }
  return res.json();
}
