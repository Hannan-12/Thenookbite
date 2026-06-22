import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = createServiceClient();
    await db.from('orders').select('id').limit(1);
    return NextResponse.json({ status: 'ok', ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: 'error', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 503 },
    );
  }
}
