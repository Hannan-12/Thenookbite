'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_LABELS, type Category, type MenuCard as MenuCardType } from '@/lib/types';
import { MenuCard } from './MenuCard';
import { Reveal } from './Reveal';

export function MenuBrowser({
  cards,
  initialCategory,
}: {
  cards: MenuCardType[];
  initialCategory?: Category;
}) {
  const [active, setActive] = useState<Category | 'All'>(initialCategory ?? 'All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      const matchCat = active === 'All' || c.category === active;
      const matchQ = q === '' || c.name.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [cards, active, query]);

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            className="w-full bg-surface border border-theme pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-red/50 transition-colors text-sm font-body text-primary placeholder:text-muted rounded-sm"
          />
        </div>
      </div>

      {/* Category tabs — horizontally scrollable on mobile */}
      <div className="mb-8 sm:mb-10 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['All', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`font-heading text-xs tracking-widest px-4 py-2.5 border rounded-sm transition-all duration-150 flex-shrink-0 ${
              active === cat
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-surface text-muted border-theme hover:border-primary hover:text-primary'
            }`}
          >
            {(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-heading text-3xl text-primary">NOTHING FOUND</p>
          <p className="mt-2 text-sm text-muted">No items match your search — try another keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((card, i) => (
            <Reveal
              key={`${card.category}-${card.name}`}
              direction="zoom"
              delay={(i % 3) * 60}
            >
              <MenuCard card={card} animateIn={false} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
