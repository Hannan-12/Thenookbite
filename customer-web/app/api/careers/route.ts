import { NextRequest, NextResponse } from 'next/server';
import { isValidPakistaniPhone, escapeHtml } from '@/lib/format';

export async function POST(req: NextRequest) {
  const { name, phone, position, message } = await req.json();

  if (!name || !phone || !position) {
    return NextResponse.json({ detail: 'Name, phone and position are required.' }, { status: 400 });
  }

  if (!isValidPakistaniPhone(phone)) {
    return NextResponse.json({ detail: 'Enter a valid Pakistani mobile number (03XXXXXXXXX).' }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailDomain = process.env.EMAIL_DOMAIN ?? 'thenookbite.com';
  const adminEmail = process.env.ADMIN_EMAIL ?? `owner@${emailDomain}`;

  if (!resendKey) {
    return NextResponse.json({ detail: 'Email service not configured.' }, { status: 500 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: `TNB Careers <noreply@${emailDomain}>`,
      to: [adminEmail],
      reply_to: undefined,
      subject: `New Job Application — ${position}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d0d0d;color:#fff;padding:36px;border-radius:6px">
          <div style="background:#E4002B;color:#fff;font-weight:700;font-size:16px;padding:6px 14px;display:inline-block;letter-spacing:3px;margin-bottom:28px">TNB</div>
          <h2 style="margin:0 0 6px;font-size:22px;font-weight:700">New Job Application</h2>
          <p style="color:#888;margin:0 0 28px;font-size:14px">Someone applied for a position at The Nook Bite.</p>

          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:24px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">POSITION</p>
            <p style="margin:0 0 20px;font-weight:700;font-size:18px;color:#E4002B">${escapeHtml(position)}</p>

            <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">APPLICANT NAME</p>
            <p style="margin:0 0 20px;font-weight:600;font-size:15px;color:#fff">${escapeHtml(name)}</p>

            <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">PHONE</p>
            <p style="margin:0 0 20px;font-weight:600;font-size:15px;color:#FFD700">${escapeHtml(phone)}</p>

            ${message ? `
            <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px">MESSAGE</p>
            <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6">${escapeHtml(message)}</p>
            ` : ''}
          </div>

          <p style="color:#444;font-size:12px;border-top:1px solid #1f1f1f;padding-top:16px;margin:0">
            The Nook Bite · Careers · Mandi Bahauddin, Pakistan
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ detail: 'Failed to send application.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
