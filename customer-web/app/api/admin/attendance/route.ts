import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb, getPKTToday } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const db = result.db;
  const date  = req.nextUrl.searchParams.get('date') ?? getPKTToday();
  const month = req.nextUrl.searchParams.get('month');

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

    const pkToday = getPKTToday();
    const cutoff  = pkToday < monthEnd ? pkToday : monthEnd;

    const [{ data: records }, { data: allStaff }] = await Promise.all([
      db.from('attendance')
        .select('*, staff(full_name, role, staff_type)')
        .gte('date', `${month}-01`)
        .lte('date', monthEnd)
        .order('date', { ascending: false }),
      db.from('staff').select('id, full_name, role, staff_type').eq('is_active', true),
    ]);

    type RawRecord = { staff_id: string; date: string; staff: { full_name: string; role: string; staff_type: string } };
    const recordSet = new Set((records ?? []).map((r: RawRecord) => `${r.staff_id}|${r.date}`));

    const absentRows: object[] = [];
    for (const s of allStaff ?? []) {
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

  const [{ data: records }, { data: allStaff }] = await Promise.all([
    db.from('attendance')
      .select('*, staff(full_name, role, staff_type)')
      .eq('date', date)
      .order('check_in', { ascending: true }),
    db.from('staff').select('id, full_name, role, staff_type').eq('is_active', true),
  ]);

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
  const result = await withAdminDb();
  if (result.error) return result.error;

  const body = await req.json();
  const { data, error } = await result.db
    .from('attendance')
    .upsert(body, { onConflict: 'staff_id,date' })
    .select()
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
