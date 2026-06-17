import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  // Default to Pakistan date (UTC+5) if not specified
  const pkNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const date  = req.nextUrl.searchParams.get('date') ?? pkNow.toISOString().slice(0, 10);
  const month = req.nextUrl.searchParams.get('month'); // YYYY-MM for monthly view

  const db = createServiceClient();

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Today in PKT — don't count future days as absent
    const pkToday = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cutoff  = pkToday < monthEnd ? pkToday : monthEnd;

    const [{ data: records }, { data: allStaff }] = await Promise.all([
      db.from('attendance')
        .select('*, staff(full_name, role, staff_type)')
        .gte('date', `${month}-01`)
        .lte('date', monthEnd)
        .order('date', { ascending: false }),
      db.from('staff').select('id, full_name, role, staff_type').eq('is_active', true),
    ]);

    // Build a set of (staff_id, date) pairs that have a real record
    type RawRecord = { staff_id: string; date: string; staff: { full_name: string; role: string; staff_type: string } };
    const recordSet = new Set((records ?? []).map((r: RawRecord) => `${r.staff_id}|${r.date}`));

    // For each staff × each past day in the month with no record → inject absent row
    const absentRows: object[] = [];
    for (const s of allStaff ?? []) {
      // Collect staff info from existing records (join data comes from there)
      for (let d = 1; ; d++) {
        const dayStr = `${month}-${String(d).padStart(2, '0')}`;
        if (dayStr > cutoff) break;
        if (d > lastDay) break;
        if (!recordSet.has(`${s.id}|${dayStr}`)) {
          absentRows.push({
            id: null,
            staff_id: s.id,
            date: dayStr,
            status: 'absent',
            check_in: null,
            check_out: null,
            note: null,
            staff: { full_name: s.full_name, role: s.role, staff_type: s.staff_type },
          });
        }
      }
    }

    // Ensure staff with zero records still appear in the summary
    const staffInRecords = new Set([...(records ?? []).map((r: RawRecord) => r.staff_id), ...absentRows.map((r: object) => (r as RawRecord).staff_id)]);
    const noRecordPlaceholders = (allStaff ?? [])
      .filter(s => !staffInRecords.has(s.id))
      .map(s => ({
        id: null, staff_id: s.id, date: `${month}-01`, status: 'no_records',
        check_in: null, check_out: null, note: null,
        staff: { full_name: s.full_name, role: s.role, staff_type: s.staff_type },
      }));

    return NextResponse.json([...(records ?? []), ...absentRows, ...noRecordPlaceholders]);
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON in request body' }, { status: 400 });
  }
  const db   = createServiceClient();

  const { data, error } = await db
    .from('attendance')
    .upsert(body, { onConflict: 'staff_id,date' })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
