import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = createServiceClient();
  // Only show verified orders — POS orders are auto-verified on creation,
  // online orders must be approved on the verify screen first
  const { data, error } = await db
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['pending', 'preparing'])
    .eq('verified', true)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}
