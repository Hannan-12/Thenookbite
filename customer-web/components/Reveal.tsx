'use client';

import { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'zoom';

const HIDDEN: Record<Direction, string> = {
  up: 'translate-y-10 opacity-0',
  down: '-translate-y-10 opacity-0',
  left: 'translate-x-10 opacity-0',
  right: '-translate-x-10 opacity-0',
  zoom: 'scale-95 opacity-0',
};

/**
 * Freshmart-style scroll reveal: animates children in when they
 * scroll into view. Re-usable wrapper around IntersectionObserver.
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  once = true,
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : HIDDEN[direction]
      } ${className}`}
    >
      {children}
    </div>
  );
}
