import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) redirect('/admin/login');

  return user;
}

// For API routes — returns an error response instead of redirecting
export async function requireAdminApi() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  return null;
}

// For staff/POS routes — user must be active staff or admin
export async function requireStaffApi() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return null;

  const db = createServiceClient();
  const { data: staff } = await db
    .from('staff')
    .select('id')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!staff) return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });

  return null;
}
