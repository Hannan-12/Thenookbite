import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const db = createClient();
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
  });
}
