import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ detail: 'Order not found' }, { status: 404 });
  return NextResponse.json(data);
}
