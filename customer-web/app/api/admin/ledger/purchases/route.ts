import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from_date');
  const to   = searchParams.get('to_date');

  const db = createServiceClient();
  let query = db
    .from('purchases')
    .select('id, vendor_id, vendor_name, amount, description, purchase_date, created_at')
    .order('purchase_date', { ascending: false });

  if (from) query = query.gte('purchase_date', from);
  if (to)   query = query.lte('purchase_date', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { vendor_id, vendor_name, amount, description, purchase_date } = await req.json();

  if (!vendor_name?.trim()) return NextResponse.json({ detail: 'vendor_name is required' }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ detail: 'amount must be positive' }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from('purchases')
    .insert({
      vendor_id:     vendor_id || null,
      vendor_name:   vendor_name.trim(),
      amount:        parseInt(amount),
      description:   description?.trim() || null,
      purchase_date: purchase_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
