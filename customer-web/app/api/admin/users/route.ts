import { NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';
import { buildCustomerList } from '@/lib/customer-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  try {
    const customers = await buildCustomerList(result.db);
    return NextResponse.json(customers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
