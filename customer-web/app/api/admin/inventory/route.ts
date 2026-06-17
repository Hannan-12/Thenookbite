import { NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { data, error } = await result.db
    .from('ingredients')
    .select('id, name, unit, stock_qty, low_stock_threshold, updated_at')
    .order('name');

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  const enriched = (data ?? []).map(i => ({
    ...i,
    low_stock: i.stock_qty <= i.low_stock_threshold,
  }));

  return NextResponse.json(enriched);
}
