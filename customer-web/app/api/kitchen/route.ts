import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = createServiceClient();

  // Today's midnight in PKT (UTC+5) expressed as UTC ISO string
  // e.g. PKT 2026-06-27 00:00 = UTC 2026-06-26T19:00:00Z
  const nowUtc = new Date();
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
  const nowPktMs = nowUtc.getTime() + PKT_OFFSET_MS;
  const pktDate = new Date(nowPktMs);
  // Build midnight PKT as a UTC timestamp by zeroing PKT h/m/s/ms
  const midnightPktMs = nowPktMs - (pktDate.getUTCHours() * 3600000 + pktDate.getUTCMinutes() * 60000 + pktDate.getUTCSeconds() * 1000 + pktDate.getUTCMilliseconds());
  const todayStartUtc = new Date(midnightPktMs - PKT_OFFSET_MS).toISOString();

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
