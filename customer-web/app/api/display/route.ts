import { NextRequest, NextResponse } from 'next/server';
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

// Mark a ready order as collected (completed). Called from the order-status display screen.
export async function PATCH(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON in request body' }, { status: 400 });
  }
  const { id } = body as { id: string };
  if (!id) return NextResponse.json({ detail: 'id required' }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db
    .from('orders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'ready');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
