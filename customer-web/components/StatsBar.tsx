'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat { to: number; suffix: string; label: string; }

const STATS: Stat[] = [
  { to: 139, suffix: '+', label: 'Menu Items' },
  { to: 7,   suffix: '',  label: 'Food Categories' },
  { to: 12,  suffix: '',  label: 'Hours Open Daily' },
  { to: 20,  suffix: 'min', label: 'Avg. Prep Time' },
];

function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref   = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const isFloat = !Number.isInteger(to);
        const duration = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(isFloat ? +(to * eased).toFixed(1) : Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return (
    <span ref={ref} className="font-heading text-3xl sm:text-5xl text-primary">
      {val}{suffix}
    </span>
  );
}

export function StatsBar() {
  return (
    <section className="bg-surface border-y border-theme">
      <div className="mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center justify-center py-8 sm:py-10 px-3 sm:px-6 gap-1 ${
              i < STATS.length - 1 ? 'border-r border-theme' : ''
            }`}
          >
            <CountUp to={stat.to} suffix={stat.suffix} />
            <p className="text-xs font-heading tracking-[0.25em] text-muted mt-1">
              {stat.label.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
