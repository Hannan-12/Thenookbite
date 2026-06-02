'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

interface Flyer {
  id: number;
  label: string;
  from: DOMRect;
}

interface FlyToCartCtx {
  /** Register the cart icon element so flyers know their destination. */
  registerTarget: (el: HTMLElement | null) => void;
  /** Launch a flying chip from a source element toward the cart. */
  fly: (sourceRect: DOMRect, label: string) => void;
}

const Ctx = createContext<FlyToCartCtx | null>(null);

export function useFlyToCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFlyToCart must be used within <FlyToCartProvider>');
  return ctx;
}

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const targetRef = useRef<HTMLElement | null>(null);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const nextId = useRef(0);

  const registerTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const fly = useCallback((from: DOMRect, label: string) => {
    const id = nextId.current++;
    setFlyers((f) => [...f, { id, label, from }]);
    // Clean up after the animation completes.
    setTimeout(() => {
      setFlyers((f) => f.filter((x) => x.id !== id));
    }, 750);
  }, []);

  return (
    <Ctx.Provider value={{ registerTarget, fly }}>
      {children}
      {flyers.map((flyer) => {
        const target = targetRef.current?.getBoundingClientRect();
        const startX = flyer.from.left + flyer.from.width / 2;
        const startY = flyer.from.top + flyer.from.height / 2;
        const endX = target ? target.left + target.width / 2 : startX;
        const endY = target ? target.top + target.height / 2 : 0;
        return (
          <span
            key={flyer.id}
            className="pointer-events-none fixed z-[100] grid h-12 w-12 place-items-center rounded-full bg-brand-red text-xl text-white shadow-lg"
            style={
              {
                left: 0,
                top: 0,
                ['--sx' as string]: `${startX - 24}px`,
                ['--sy' as string]: `${startY - 24}px`,
                ['--ex' as string]: `${endX - 24}px`,
                ['--ey' as string]: `${endY - 24}px`,
                animation: 'fly 0.7s cubic-bezier(0.5,-0.3,0.7,1) forwards',
              } as React.CSSProperties
            }
          >
            🛒
          </span>
        );
      })}

      <style jsx global>{`
        @keyframes fly {
          0% {
            transform: translate(var(--sx), var(--sy)) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--ex), var(--ey)) scale(0.2);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fly {
            from {
              opacity: 0;
            }
            to {
              opacity: 0;
            }
          }
        }
      `}</style>
    </Ctx.Provider>
  );
}
