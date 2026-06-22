import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkRateLimit } from '@/lib/ratelimit';
import { pkDate, pkHour } from '@/lib/timezone';

export async function POST(req: NextRequest) {
  const rateLimitErr = await checkRateLimit(req, 'checkin');
  if (rateLimitErr) return rateLimitErr;

  const { pin, photo_url } = await req.json();

  if (!pin || pin.length !== 4) {
    return NextResponse.json({ detail: 'Enter a 4-digit PIN' }, { status: 400 });
  }

  const db = createServiceClient();

  // Find active staff with this PIN
  const { data: staff } = await db
    .from('staff')
    .select('id, full_name, role, staff_type')
    .eq('pin', pin)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return NextResponse.json({ detail: 'Invalid PIN' }, { status: 401 });
  }

  const today = pkDate();
  const now   = new Date().toISOString();

  // Check if already checked in today
  const { data: existing } = await db
    .from('attendance')
    .select('id, check_in, check_out, status')
    .eq('staff_id', staff.id)
    .eq('date', today)
    .single();

  if (existing?.check_in && !existing?.check_out) {
    // Already checked in — this is a check-out
    await db
      .from('attendance')
      .update({ check_out: now })
      .eq('id', existing.id);

    const hoursWorked = existing.check_in
      ? ((new Date(now).getTime() - new Date(existing.check_in).getTime()) / 3600000).toFixed(1)
      : null;

    return NextResponse.json({
      action: 'checkout',
      staff_name: staff.full_name,
      role: staff.role,
      check_out: now,
      hours_worked: hoursWorked,
    });
  }

  // Check-in (upsert in case record exists but no check_in)
  // Late if checking in after 10:00 AM Pakistan time
  const status = pkHour() >= 10 ? 'late' : 'present';

  await db.from('attendance').upsert({
    staff_id:  staff.id,
    date:      today,
    check_in:  now,
    status,
    checkin_photo: photo_url ?? null,
  }, { onConflict: 'staff_id,date' });

  return NextResponse.json({
    action: 'checkin',
    staff_name: staff.full_name,
    role: staff.role,
    status,
    check_in: now,
  });
}
