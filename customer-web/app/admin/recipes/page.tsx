import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { RecipesClient } from './RecipesClient';

export const dynamic = 'force-dynamic';

export default async function RecipesPage() {
  await requireAdmin();
  const db = createServiceClient();

  const [{ data: menuItems }, { data: ingredients }] = await Promise.all([
    db.from('menu_items').select('id, name, category, sku').eq('available', true).order('category').order('name'),
    db.from('ingredients').select('*').order('name'),
  ]);

  return (
    <AdminShell>
      <RecipesClient
        initialMenuItems={menuItems ?? []}
        initialIngredients={ingredients ?? []}
      />
    </AdminShell>
  );
}
