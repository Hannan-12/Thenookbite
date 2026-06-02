import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email !== adminEmail) redirect('/admin/login');

  return user;
}
