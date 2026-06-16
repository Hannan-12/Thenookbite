import { Reveal } from './Reveal';

const BENEFITS = [
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    title: 'Lightning Fast',
    desc: 'Hot food ready in under 20 minutes. We don\'t make you wait.',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v10l4 2"/>
      </svg>
    ),
    title: 'Made Fresh',
    desc: 'Every item cooked to order. Never pre-made, never reheated.',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
      </svg>
    ),
    title: 'Easy Payment',
    desc: 'Pay cash at the table or at the counter — fast, simple, no hassle.',
  },
  {
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.674z"/>
      </svg>
    ),
    title: 'Top Rated',
    desc: '4.9/5 rating from 12,000+ customers. Taste for yourself.',
  },
];

export function Benefits() {
  return (
    <section className="bg-card py-14 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-2">WHY TNB</p>
              <h2 className="text-3xl sm:text-5xl text-primary leading-none">THE NOOK<br/>BITE PROMISE</h2>
            </div>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} direction="up" delay={i * 80}>
              <div className="group bg-surface border border-theme p-8 hover:border-brand-red transition-colors duration-300 rounded-sm">
                <div className="text-brand-red group-hover:scale-110 transition-transform duration-300 w-fit">
                  {b.icon}
                </div>
                <h3 className="mt-5 font-heading text-xl text-primary">{b.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
