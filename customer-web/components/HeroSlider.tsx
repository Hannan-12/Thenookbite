'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Slide {
  eyebrow: string;
  heading: string[];
  sub: string;
  cta: string;
  href: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'SIGNATURE BURGERS',
    heading: ['BOLD', 'FLAVOURS.'],
    sub: 'Burgers, pizzas, pastas & wraps — cooked fresh, served hot.',
    cta: 'ORDER NOW',
    href: '/menu',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'SIGNATURE PIZZAS',
    heading: ['STONE', 'BAKED.'],
    sub: 'Four sizes, endless toppings — from Chicken Tikka to Crown Star.',
    cta: 'SEE PIZZAS',
    href: '/menu?category=Pizza%20Special',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'CRISPY & HOT',
    heading: ['FRESH', 'EVERY TIME.'],
    sub: 'Wings, loaded fries, nuggets — the perfect starter or side.',
    cta: 'EXPLORE MENU',
    href: '/menu?category=Appetizers',
    image: 'https://images.unsplash.com/photo-1612392062631-94b37f9af88a?auto=format&fit=crop&w=1600&q=80',
  },
];

const INTERVAL = 5500;

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <section
      className="motion-keep relative h-[85vh] min-h-[500px] max-h-[780px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Background images */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={s.image}
            alt={s.heading.join(' ')}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 w-full">
          <div className="max-w-2xl">
            <p
              key={`eyebrow-${index}`}
              className="font-heading text-[10px] sm:text-xs text-brand-red tracking-[0.4em] mb-4 animate-fade-in"
            >
              {slide.eyebrow}
            </p>
            <h1
              key={`heading-${index}`}
              className="font-heading text-[clamp(3rem,10vw,8rem)] text-white leading-none animate-fade-up"
            >
              {slide.heading.map((line, i) => (
                <span key={i} className={`block ${i === 1 ? 'text-brand-red' : ''}`}>
                  {line}
                </span>
              ))}
            </h1>
            <p
              key={`sub-${index}`}
              className="mt-4 sm:mt-6 text-white/60 font-body text-sm sm:text-lg max-w-sm sm:max-w-md leading-relaxed animate-fade-up"
              style={{ animationDelay: '100ms' }}
            >
              {slide.sub}
            </p>
            <div
              key={`cta-${index}`}
              className="mt-6 sm:mt-10 flex flex-wrap gap-3 animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 bg-brand-red text-white font-heading text-xs sm:text-sm tracking-widest px-6 sm:px-8 py-3 sm:py-4 hover:bg-white hover:text-black transition-colors duration-300"
              >
                {slide.cta}
                <span>→</span>
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 border border-white/30 text-white font-heading text-xs sm:text-sm tracking-widest px-6 sm:px-8 py-3 sm:py-4 hover:bg-white/10 transition-colors duration-300"
              >
                VIEW MENU
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-6 md:left-auto md:right-8 flex flex-col md:flex-row gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-400 rounded-full ${
              i === index
                ? 'w-8 md:w-8 h-2 md:h-2 bg-brand-red'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Arrow controls */}
      <button
        onClick={() => go(index - 1)}
        aria-label="Previous"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 border border-white/20 text-white/70 hover:text-white hover:border-white/60 hover:bg-white/10 transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <button
        onClick={() => go(index + 1)}
        aria-label="Next"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 border border-white/20 text-white/70 hover:text-white hover:border-white/60 hover:bg-white/10 transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </section>
  );
}
