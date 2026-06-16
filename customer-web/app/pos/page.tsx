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

  // Open a new POS session in DB
  const { data: session, error: sessErr } = await db
    .from('pos_sessions')
    .insert({ staff_id: user.id })
    .select('id')
    .single();

  if (sessErr) console.error('[POS] Failed to create session:', sessErr.message);
  const sessionId = session?.id ?? '';

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
