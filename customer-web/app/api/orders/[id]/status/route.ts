import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/admin-auth';

const VALID_STATUSES = new Set(['pending', 'preparing', 'ready', 'completed']);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = await requireStaffApi();
  if (authErr) return authErr;

  const { status } = await req.json();

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ detail: 'Invalid status' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: 'Order not found' }, { status: 404 });
  return NextResponse.json(data);
}
