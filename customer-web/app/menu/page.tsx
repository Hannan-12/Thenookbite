import { fetchMenuItems, buildMenuCards } from '@/lib/menu';
import { CATEGORIES, type Category } from '@/lib/types';
import { MenuBrowser } from '@/components/MenuBrowser';

export const dynamic = 'force-dynamic';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const rawCat = searchParams.category;
  const initialCategory =
    rawCat && CATEGORIES.includes(rawCat as Category) ? (rawCat as Category) : undefined;

  let cards;
  try {
    const items = await fetchMenuItems();
    cards = buildMenuCards(items);
  } catch (e) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-3xl text-brand-red">Menu unavailable</h1>
        <p className="mt-3 text-muted text-sm">
          We couldn&apos;t load the menu right now. Please try again shortly.
        </p>
        <p className="mt-2 text-xs text-muted/60">
          {e instanceof Error ? e.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="bg-[#0a0a0a] py-12 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-3">139+ ITEMS</p>
          <h1 className="font-heading text-4xl sm:text-6xl text-white leading-none">ORDER<br/>ONLINE</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <MenuBrowser cards={cards} initialCategory={initialCategory} />
      </div>
    </div>
  );
}
