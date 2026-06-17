import { NextRequest, NextResponse } from 'next/server';
import { withAdminDb } from '@/lib/api-helpers';

export async function GET() {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { data, error } = await result.db
    .from('staff')
    .select('id, full_name, email, role, staff_type, pin, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const result = await withAdminDb();
  if (result.error) return result.error;

  const { full_name, email, password, role, staff_type, pin } = await req.json();

  if (!full_name || !email || !password) {
    return NextResponse.json({ detail: 'full_name, email and password are required' }, { status: 400 });
  }

  const db = result.db;

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) return NextResponse.json({ detail: authError.message }, { status: 400 });

  const { data: staff, error: staffError } = await db
    .from('staff')
    .insert({ id: authData.user.id, full_name, email, role: role ?? 'cashier', staff_type: staff_type ?? 'pos', pin: pin ?? null })
    .select()
    .single();

  if (staffError) {
    await db.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ detail: staffError.message }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const emailDomain = process.env.EMAIL_DOMAIN ?? 'thenookbite.com';
    const resolvedRole = role ?? 'cashier';
    const resolvedStaffType = staff_type ?? 'pos';
    const isPOS = resolvedStaffType === 'pos';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `TNB <noreply@${emailDomain}>`,
        to: [email],
        subject: 'Your TNB Staff Account — Credentials Inside',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d0d0d;color:#fff;padding:36px;border-radius:6px">
            <div style="background:#E4002B;color:#fff;font-weight:700;font-size:16px;padding:6px 14px;display:inline-block;letter-spacing:3px;margin-bottom:28px">TNB</div>
            <h2 style="margin:0 0 6px;font-size:24px;font-weight:700">Welcome, ${full_name}!</h2>
            <p style="color:#888;margin:0 0 28px;font-size:14px">Your staff account at The Nook Bite has been created. Keep these credentials safe.</p>

            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:24px;margin-bottom:24px">

              ${isPOS ? `
              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">POS LOGIN EMAIL</p>
              <p style="margin:0 0 20px;font-weight:600;font-size:15px;color:#fff">${email}</p>

              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">POS LOGIN PASSWORD</p>
              <p style="margin:0 0 20px;font-weight:700;font-size:22px;letter-spacing:4px;color:#E4002B;background:#1f0000;padding:10px 16px;border-radius:4px;display:inline-block">${password}</p>
              ` : ''}

              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">CHECK-IN PIN</p>
              <p style="margin:0 0 4px;font-weight:700;font-size:32px;letter-spacing:10px;color:#FFD700;background:#1a1600;padding:12px 20px;border-radius:4px;display:inline-block">${pin ?? '----'}</p>
              <p style="margin:8px 0 20px;font-size:12px;color:#555">Enter this PIN on the shared tablet at the entrance to check in and out each day.</p>

              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">ROLE</p>
              <p style="margin:0 0 4px;font-weight:600;text-transform:uppercase;color:#fff">${resolvedRole}</p>
              <p style="margin:0;font-size:12px;color:#555;text-transform:uppercase">${resolvedStaffType === 'pos' ? 'POS Staff' : 'Non-POS Staff'}</p>
            </div>

            <p style="color:#444;font-size:12px;border-top:1px solid #1f1f1f;padding-top:16px;margin:0">
              The Nook Bite · Do not share your credentials or PIN with anyone.
            </p>
          </div>
        `,
      }),
    });
  }

  return NextResponse.json(staff, { status: 201 });
}
