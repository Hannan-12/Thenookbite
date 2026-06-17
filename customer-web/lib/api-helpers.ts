import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

/**
 * Runs admin auth check and returns the service-role Supabase client.
 * Returns an error response if the caller is not an authenticated admin.
 */
export async function withAdminDb(): Promise<
  { db: SupabaseClient; error: null } | { db: null; error: NextResponse }
> {
  const authErr = await requireAdminApi();
  if (authErr) return { db: null, error: authErr };
  return { db: createServiceClient(), error: null };
}

/**
 * Parse and validate `from_date` / `to_date` query params.
 * Returns the raw strings plus a `toEndISO` (start of the next day) for
 * half-open range queries (`>= from … < toEnd`).
 */
export function parseDateRange(req: NextRequest): {
  from: string;
  to: string;
  toEndISO: string;
} | NextResponse {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from_date');
  const to = searchParams.get('to_date');

  if (!from || !to) {
    return NextResponse.json(
      { detail: 'from_date and to_date are required' },
      { status: 400 },
    );
  }

  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);

  return { from, to, toEndISO: toEnd.toISOString() };
}

/**
 * Fetch IDs of completed orders within a date range.
 * Accepts optional extra select columns (e.g. 'id, total').
 */
export async function getCompletedOrderIds(
  db: SupabaseClient,
  from: string,
  toEndISO: string,
  select = 'id',
) {
  const { data, error } = await db
    .from('orders')
    .select(select)
    .eq('status', 'completed')
    .gte('created_at', new Date(from).toISOString())
    .lt('created_at', toEndISO);

  if (error) return { data: null, orderIds: [] as string[], error };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as Record<string, any>[];
  const orderIds = rows.map(o => o.id as string);
  return { data: rows, orderIds, error: null };
}

/**
 * Generic admin PATCH: update a row by id and return it.
 */
export async function adminPatch(
  table: string,
  id: string,
  body: Record<string, unknown>,
  errorStatus = 500,
): Promise<NextResponse> {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { data, error } = await result.db
    .from(table)
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: errorStatus });
  return NextResponse.json(data);
}

/**
 * Generic admin DELETE: delete a row by id.
 */
export async function adminDelete(
  table: string,
  id: string,
  errorStatus = 500,
): Promise<NextResponse> {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { error } = await result.db.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ detail: error.message }, { status: errorStatus });
  return NextResponse.json({ ok: true });
}

/** Current date string in PKT (UTC+5), e.g. "2025-01-15". */
export function getPKTToday(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
