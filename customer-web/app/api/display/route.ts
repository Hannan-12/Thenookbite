import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public endpoint — no auth required. Returns only preparing/ready orders for the customer display screen.
export async function GET() {
  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .select('id, customer_name, table_number, status, created_at')
    .in('status', ['preparing', 'ready'])
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store' },
  });
}
