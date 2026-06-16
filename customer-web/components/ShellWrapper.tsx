'use client';

import { usePathname } from 'next/navigation';

const FULLSCREEN_ROUTES = ['/kitchen', '/pos', '/order-status', '/verify'];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some(r => pathname.startsWith(r));

  if (isFullscreen) return <>{children}</>;

  return (
    <>
      <main className="flex-1 pt-[108px]">{children}</main>
      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">

          {/* Top row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-brand-red text-white font-heading text-base px-3 py-1.5 leading-none tracking-wider">
                  TNB
                </div>
                <span className="font-heading text-white tracking-[0.2em] text-sm">THE NOOK BITE</span>
              </div>
              <p className="text-white/30 text-sm font-body leading-relaxed">
                Bold flavours, fast service. Your neighbourhood restaurant, now online.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p className="font-heading text-[10px] tracking-[0.3em] text-white/20 mb-4">QUICK LINKS</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { href: '/menu',      label: 'Menu' },
                  { href: '/cart',      label: 'Cart' },
                  { href: '/my-orders', label: 'My Orders' },
                  { href: '/login',     label: 'Sign In' },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="font-heading text-xs tracking-widest text-white/30 hover:text-white transition-colors duration-200 w-fit"
                  >
                    {label.toUpperCase()}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="font-heading text-[10px] tracking-[0.3em] text-white/20 mb-4">FIND US</p>
              <div className="space-y-3 text-sm font-body text-white/30 leading-relaxed">
                <p>Mandi Bahauddin, Punjab, Pakistan</p>
                <a href="tel:+923001234567" className="block hover:text-white transition-colors duration-200">
                  0300 1234567
                </a>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-white/20 text-xs font-heading tracking-widest">HOURS</span>
                  <span className="text-white/30 text-xs">12 PM – 12 AM daily</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-white/20 text-xs font-body">
              © {new Date().getFullYear()} The Nook Bite. All rights reserved.
            </p>
            <p className="text-white/20 text-xs font-body">Made with ❤️ in Pakistan</p>
          </div>
        </div>
      </footer>
    </>
  );
}
