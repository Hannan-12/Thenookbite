'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from './Reveal';

function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function DealOfTheDay() {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(secondsUntilMidnight());
    const id = setInterval(() => setSecs(secondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = secs === null ? 0 : Math.floor(secs / 3600);
  const m = secs === null ? 0 : Math.floor((secs % 3600) / 60);
  const s = secs === null ? 0 : secs % 60;

  return (
    <section className="bg-surface py-14 sm:py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image side */}
          <Reveal direction="left">
            <div className="relative aspect-[4/3] rounded-sm overflow-hidden bg-card">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80"
                alt="XL Pizza Feast Deal"
                fill
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover"
              />
              {/* Badge */}
              <div className="absolute top-5 left-5 bg-brand-red text-white font-heading text-sm tracking-widest px-3 py-2">
                TODAY ONLY
              </div>
              {/* Price overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-4xl text-white">Rs. 1,800</span>
                  <span className="font-heading text-xl text-white/40 line-through">Rs. 2,300</span>
                  <span className="bg-brand-red text-white font-heading text-xs px-2 py-1 ml-1">-22%</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Text side */}
          <Reveal direction="right">
            <p className="font-heading text-xs tracking-[0.4em] text-brand-red mb-4">DEAL OF THE DAY</p>
            <h2 className="font-heading text-4xl sm:text-6xl text-primary leading-none">
              XL PIZZA<br />
              <span className="text-brand-red">FEAST DEAL</span>
            </h2>
            <p className="mt-5 text-muted max-w-sm leading-relaxed">
              Any X-Large special pizza + 1.5L drink. Feeds 3–4 people. Today only — don&apos;t miss it.
            </p>

            {/* Claimed bar */}
            <div className="mt-8">
              <div className="flex justify-between font-heading text-xs tracking-widest text-muted mb-2">
                <span>68% CLAIMED</span>
                <span>32 LEFT</span>
              </div>
              <div className="h-1.5 bg-card rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            {/* Countdown */}
            <div className="mt-8">
              <p className="font-heading text-xs tracking-[0.3em] text-muted mb-4">DEAL ENDS IN</p>
              <div className="flex gap-4" suppressHydrationWarning>
                {[{ v: h, l: 'HRS' }, { v: m, l: 'MIN' }, { v: s, l: 'SEC' }].map((unit) => (
                  <div key={unit.l} className="text-center">
                    <div className="bg-card border border-theme w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center rounded-sm">
                      <span className="font-heading text-2xl sm:text-3xl text-primary tabular-nums">
                        {pad(unit.v)}
                      </span>
                    </div>
                    <span className="font-heading text-xs tracking-widest text-muted mt-1.5 block">
                      {unit.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/menu?category=Pizza%20Special"
              className="mt-10 inline-flex items-center gap-2 bg-brand-red text-white font-heading text-sm tracking-widest px-8 py-4 hover:bg-primary hover:text-surface transition-colors duration-300"
            >
              GRAB THIS DEAL
              <span>→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
