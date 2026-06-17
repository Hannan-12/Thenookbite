import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from_date');
  const to   = searchParams.get('to_date');

  let query = result.db
    .from('expenses')
    .select('id, category, amount, description, expense_date, created_at')
    .order('expense_date', { ascending: false });

  if (from) query = query.gte('expense_date', from);
  if (to)   query = query.lte('expense_date', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { category, amount, description, expense_date } = await req.json();

  if (!category?.trim()) return NextResponse.json({ detail: 'category is required' }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ detail: 'amount must be positive' }, { status: 400 });

  const { data, error } = await result.db
    .from('expenses')
    .insert({
      category:     category.trim(),
      amount:       parseInt(amount),
      description:  description?.trim() || null,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
