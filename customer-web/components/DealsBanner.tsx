import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from './Reveal';

const DEALS = [
  {
    tag: 'COMBO',
    title: 'Zinger Meal',
    desc: 'Burger + fries + drink — the perfect combo.',
    price: 'Rs. 650',
    href: '/menu?category=Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=75',
    featured: false,
  },
  {
    tag: 'MOST POPULAR',
    title: 'XL Pizza Feast',
    desc: 'Any X-Large special pizza — feeds the whole family.',
    price: 'Rs. 2,000',
    href: '/menu?category=Pizza%20Special',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=75',
    featured: true,
  },
  {
    tag: 'NEW',
    title: 'TNB Special Pasta',
    desc: 'Signature creamy chicken pasta, made fresh.',
    price: 'Rs. 750',
    href: '/menu?category=Pastas',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=75',
    featured: false,
  },
];

export function DealsBanner() {
  return (
    <section className="bg-card py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-2">LIMITED TIME</p>
              <h2 className="text-3xl sm:text-5xl text-primary leading-none">FEATURED<br/>DEALS</h2>
            </div>
            <Link href="/menu" className="hidden sm:flex items-center gap-2 font-heading text-xs tracking-widest text-muted hover:text-brand-red transition-colors duration-200">
              VIEW ALL
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-3">
          {DEALS.map((deal, i) => (
            <Reveal key={deal.title} direction="up" delay={i * 80}>
              <Link
                href={deal.href}
                className={`group relative overflow-hidden rounded-sm flex flex-col ${
                  deal.featured ? 'sm:row-span-1' : ''
                }`}
              >
                {/* Image */}
                <div className={`relative overflow-hidden ${deal.featured ? 'h-56' : 'h-44'}`}>
                  <Image
                    src={deal.image}
                    alt={deal.title}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover brightness-75 group-hover:brightness-90 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute top-4 left-4 font-heading text-xs tracking-[0.25em] bg-brand-red text-white px-2.5 py-1">
                    {deal.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="bg-surface border border-theme p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-xl text-primary">{deal.title}</h3>
                    <p className="mt-1 text-sm text-muted leading-relaxed">{deal.desc}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-heading text-2xl text-brand-red">{deal.price}</span>
                    <span className="font-heading text-xs tracking-widest text-muted group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                      ORDER →
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
