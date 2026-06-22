import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isAdmin: false });

  const adminEmail = process.env.ADMIN_EMAIL; // server-only — never NEXT_PUBLIC_
  const isAdmin = !!adminEmail && user.email === adminEmail;
  return NextResponse.json({ isAdmin });
}
