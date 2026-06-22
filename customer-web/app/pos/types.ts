export type OrderType    = 'dine-in' | 'takeaway' | 'delivery';
export type PaymentMethod = 'cash' | 'card' | 'pay_later';

export interface CartLine {
  key: string;
  name: string;
  price: number;
  quantity: number;
  menu_item_id: string;
}

export interface SessionOrder {
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

export interface PastOrder {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  order_items: { item_name: string; quantity: number; item_price: number }[];
}

export const QUICK_CASH_NOTES = [500, 1000, 2000, 5000]; // PKR denominations
export const CARD_SURCHARGE_RATE = 0.015;                 // 1.5% per bank agreement
