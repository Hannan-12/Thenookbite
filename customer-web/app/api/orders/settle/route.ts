import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function PATCH(req: NextRequest) {
  const { id, payment_method } = await req.json() as {
    id: string;
    payment_method: 'cash' | 'card';
  };

  if (!id || !payment_method) {
    return NextResponse.json({ detail: 'id and payment_method required' }, { status: 400 });
  }

  const db = createServiceClient();

  const { data, error } = await db
    .from('orders')
    .update({
      payment_method,
      payment_status: 'paid',
      settled_at: new Date().toISOString(),
      settled_payment_method: payment_method,
    })
    .eq('id', id)
    .eq('payment_method', 'pay_later')
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ detail: 'Order not found or already settled' }, { status: 404 });

  return NextResponse.json(data);
}
