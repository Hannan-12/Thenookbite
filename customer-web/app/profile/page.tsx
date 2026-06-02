import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/profile');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single();

  return (
    <div className="bg-surface min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-12 sm:py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-3">MY ACCOUNT</p>
          <h1 className="font-heading text-3xl sm:text-5xl text-white leading-none">
            {profile?.full_name?.toUpperCase() ?? 'YOUR PROFILE'}
          </h1>
          <p className="mt-2 text-white/40 text-sm">{user.email}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <ProfileClient
          userId={user.id}
          initialName={profile?.full_name ?? ''}
          initialPhone={profile?.phone ?? ''}
          email={user.email ?? ''}
        />
      </div>
    </div>
  );
}
