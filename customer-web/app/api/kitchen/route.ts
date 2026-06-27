import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = createServiceClient();

  // Only show verified orders from the last 24 hours to avoid stale pending orders
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['pending', 'preparing'])
    .eq('verified', true)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}
