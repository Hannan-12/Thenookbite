import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = createServiceClient();

  // Today's date in PKT (UTC+5): midnight PKT = 19:00 UTC previous day
  const nowUtc = new Date();
  const pktOffset = 5 * 60 * 60 * 1000;
  const todayPkt = new Date(nowUtc.getTime() + pktOffset);
  todayPkt.setUTCHours(0, 0, 0, 0);
  const todayStartUtc = new Date(todayPkt.getTime() - pktOffset).toISOString();

  // Only show today's verified orders — POS orders are auto-verified on creation,
  // online orders must be approved on the verify screen first
  const { data, error } = await db
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ['pending', 'preparing'])
    .eq('verified', true)
    .gte('created_at', todayStartUtc)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}
