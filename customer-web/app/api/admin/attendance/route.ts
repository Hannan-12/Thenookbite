import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const date  = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const month = req.nextUrl.searchParams.get('month'); // YYYY-MM for monthly view

  const db = createServiceClient();

  if (month) {
    const { data } = await db
      .from('attendance')
      .select('*, staff(full_name, role, staff_type)')
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: false });
    return NextResponse.json(data ?? []);
  }

  // Daily view — also include staff with no record today (absent)
  const [{ data: records }, { data: allStaff }] = await Promise.all([
    db.from('attendance')
      .select('*, staff(full_name, role, staff_type)')
      .eq('date', date)
      .order('check_in', { ascending: true }),
    db.from('staff').select('id, full_name, role, staff_type').eq('is_active', true),
  ]);

  // Mark staff with no record as absent in the response
  const presentIds = new Set((records ?? []).map((r: { staff_id: string }) => r.staff_id));
  const absentStaff = (allStaff ?? [])
    .filter(s => !presentIds.has(s.id))
    .map(s => ({
      id: null,
      staff_id: s.id,
      date,
      status: 'absent',
      check_in: null,
      check_out: null,
      note: null,
      staff: { full_name: s.full_name, role: s.role, staff_type: s.staff_type },
    }));

  return NextResponse.json([...(records ?? []), ...absentStaff]);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const body = await req.json();
  const db   = createServiceClient();

  const { data, error } = await db
    .from('attendance')
    .upsert(body, { onConflict: 'staff_id,date' })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
