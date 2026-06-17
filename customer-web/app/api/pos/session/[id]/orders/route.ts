import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/admin-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authErr = await requireStaffApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('id, customer_name, customer_phone, total, order_type, table_number, delivery_address, payment_method, special_notes, created_at, order_items(item_name, item_price, quantity)')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
