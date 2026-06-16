import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/lib/types';
import { Reveal } from './Reveal';

interface CatMeta { image: string; count: string; }

const META: Record<Category, CatMeta> = {
  Appetizers:          { image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=75', count: '12 items' },
  Burgers:             { image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=75', count: '19 items' },
  'Food Bank':         { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=75', count: '27 items' },
  Pastas:              { image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=75', count: '10 items' },
  'Pizza Regular v1':  { image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=75', count: '24 items' },
  'Pizza Special':     { image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=75', count: '36 items' },
  'Rolls & Wraps':     { image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=75', count: '11 items' },
  Sandwiches:          { image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=75', count: '4 items'  },
  'Drinks & Desserts': { image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=75', count: '6 items'  },
};

export function CategoryGrid() {
  return (
    <section className="bg-surface py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-2">WHAT WE SERVE</p>
              <h2 className="text-3xl sm:text-5xl text-primary leading-none">EXPLORE<br/>THE MENU</h2>
            </div>
            <Link href="/menu" className="hidden sm:flex items-center gap-2 font-heading text-xs tracking-widest text-muted hover:text-brand-red transition-colors duration-200">
              ALL ITEMS
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((cat, i) => {
            const meta = META[cat];
            if (!meta) return null;
            return (
              <Reveal key={cat} direction="zoom" delay={(i % 4) * 60}>
                <Link
                  href={`/menu?category=${encodeURIComponent(cat)}`}
                  className="group relative block overflow-hidden bg-card rounded-sm aspect-[4/5]"
                >
                  {/* Image always visible, brightens on hover */}
                  <Image
                    src={meta.image}
                    alt={cat}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover brightness-50 group-hover:brightness-70 group-hover:scale-105 transition-all duration-700"
                  />

                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <span className="font-heading text-xs tracking-[0.3em] text-brand-red mb-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {meta.count}
                    </span>
                    <h3 className="font-heading text-lg sm:text-xl text-white leading-tight">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                      <span className="font-heading text-xs tracking-widest text-white/70">ORDER</span>
                      <div className="flex-1 h-px bg-brand-red" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
