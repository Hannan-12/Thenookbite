'use client';

import { usePathname } from 'next/navigation';

const FULLSCREEN_ROUTES = ['/kitchen', '/pos'];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some(r => pathname.startsWith(r));

  if (isFullscreen) return <>{children}</>;

  return (
    <>
      <main className="flex-1 pt-[108px]">{children}</main>
      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-brand-red text-white font-heading text-base px-3 py-1.5 leading-none tracking-wider">
                  TNB
                </div>
                <span className="font-heading text-white tracking-[0.2em] text-sm">THE NOOK BITE</span>
              </div>
              <p className="text-white/30 text-sm font-body max-w-xs leading-relaxed">
                Bold flavours, fast service. Your neighbourhood restaurant, now online.
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              {['Menu', 'Cart', 'Checkout', 'Careers'].map((link) => (
                <a
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  className="font-heading text-xs tracking-widest text-white/30 hover:text-white transition-colors duration-200"
                >
                  {link.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-white/20 text-xs font-body">
              © {new Date().getFullYear()} The Nook Bite. All rights reserved.
            </p>
            <p className="text-white/20 text-xs font-body">Mandi Bahauddin, Pakistan</p>
          </div>
        </div>
      </footer>
    </>
  );
}
