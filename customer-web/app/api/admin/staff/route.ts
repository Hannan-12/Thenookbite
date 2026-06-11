import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET() {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const db = createServiceClient();
  const { data, error } = await db
    .from('staff')
    .select('id, full_name, email, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminApi();
  if (authErr) return authErr;

  const { full_name, email, password, role } = await req.json();

  if (!full_name || !email || !password) {
    return NextResponse.json({ detail: 'full_name, email and password are required' }, { status: 400 });
  }

  const db = createServiceClient();

  // Create Supabase auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) return NextResponse.json({ detail: authError.message }, { status: 400 });

  // Insert into staff table
  const { data: staff, error: staffError } = await db
    .from('staff')
    .insert({ id: authData.user.id, full_name, email, role: role ?? 'cashier' })
    .select()
    .single();

  if (staffError) {
    // Rollback auth user
    await db.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ detail: staffError.message }, { status: 500 });
  }

  // Send welcome email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `TNB <noreply@${process.env.EMAIL_DOMAIN ?? 'thenookbite.com'}>`,
        to: [email],
        subject: 'Your TNB Staff Account',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;color:#fff;padding:32px;border-radius:4px">
            <div style="background:#E4002B;color:#fff;font-weight:700;font-size:16px;padding:6px 12px;display:inline-block;letter-spacing:2px;margin-bottom:24px">TNB</div>
            <h2 style="margin:0 0 8px;font-size:22px">Welcome, ${full_name}!</h2>
            <p style="color:#aaa;margin:0 0 24px">Your staff account has been created. Use the details below to sign in to the POS terminal.</p>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 8px;font-size:13px;color:#aaa">EMAIL</p>
              <p style="margin:0 0 16px;font-weight:600">${email}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#aaa">PASSWORD</p>
              <p style="margin:0 0 16px;font-weight:600;font-size:18px;letter-spacing:2px">${password}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#aaa">ROLE</p>
              <p style="margin:0;font-weight:600;text-transform:uppercase">${role ?? 'cashier'}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thenookbite.com'}/pos/login"
               style="background:#E4002B;color:#fff;text-decoration:none;padding:12px 24px;font-weight:700;letter-spacing:2px;font-size:13px;border-radius:4px;display:inline-block">
              OPEN POS TERMINAL →
            </a>
            <p style="color:#555;font-size:12px;margin-top:24px">Please change your password after first login.</p>
          </div>
        `,
      }),
    });
  }

  return NextResponse.json(staff, { status: 201 });
}
