import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/profile');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single();

  // Auto-create profile row if it doesn't exist yet
  if (!profile) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      phone: user.user_metadata?.phone ?? user.phone ?? null,
    });
  }

  // Fall back to auth metadata if profile row is missing or incomplete
  const metaName  = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
  const metaPhone = user.user_metadata?.phone ?? user.phone ?? '';

  return (
    <ProfileClient
      userId={user.id}
      initialName={profile?.full_name || metaName}
      initialPhone={profile?.phone || metaPhone}
      email={user.email ?? ''}
    />
  );
}
