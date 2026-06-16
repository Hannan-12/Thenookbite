import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildMenuCards } from '@/lib/menu';
import type { MenuItem } from '@/lib/types';
import { POSTerminal } from './POSTerminal';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/pos/login');

  const db = createServiceClient();
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = user.email === adminEmail;

  if (!isAdmin) {
    const { data: staffRow } = await db
      .from('staff')
      .select('id, is_active')
      .eq('id', user.id)
      .single();

    if (!staffRow || !staffRow.is_active) redirect('/pos/login');
  }

  const { data: staffRow } = await db
    .from('staff')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const staffName = staffRow?.full_name ?? (isAdmin ? 'Admin' : 'Staff');
  const staffRole = staffRow?.role ?? (isAdmin ? 'admin' : 'cashier');

  // Reuse today's active session if one exists (PKT = UTC+5), otherwise open a new one
  // Use a 24h lookback to avoid timezone edge cases on Vercel (UTC server)
  const lookbackISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existing, error: existErr } = await db
    .from('pos_sessions')
    .select('id')
    .eq('staff_id', user.id)
    .is('ended_at', null)
    .gte('started_at', lookbackISO)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('[POS] existing session:', existing?.id, 'err:', existErr?.message);

  let sessionId = existing?.id ?? '';

  if (!sessionId) {
    const { data: newSession, error: sessErr } = await db
      .from('pos_sessions')
      .insert({ staff_id: user.id })
      .select('id')
      .single();
    if (sessErr) console.error('[POS] Failed to create session:', sessErr.message);
    else console.log('[POS] created new session:', newSession?.id);
    sessionId = newSession?.id ?? '';
  }

  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d0d] text-red-400 font-heading text-sm">
        Failed to load menu: {error.message}
      </div>
    );
  }

  const items = (data ?? []) as MenuItem[];
  const cards = buildMenuCards(items);

  return (
    <POSTerminal
      cards={cards}
      staffId={user.id}
      staffName={staffName}
      staffRole={staffRole}
      sessionId={sessionId}
    />
  );
}
