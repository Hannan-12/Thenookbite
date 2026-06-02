import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { FlyToCartProvider } from '@/components/FlyToCart';
import { ThemeProvider } from '@/components/ThemeProvider';

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dmsans',
});

export const metadata: Metadata = {
  title: 'The Nook Bite — Order Online',
  description: 'TNB (The Nook Bite) — burgers, pizzas, pastas, wraps & more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-surface text-primary">
        <ThemeProvider>
          <FlyToCartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>

            <footer className="bg-[#0a0a0a] border-t border-white/5">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                  {/* Brand */}
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

                  {/* Links */}
                  <div className="flex flex-wrap gap-6">
                    {['Menu', 'Cart', 'Checkout'].map((link) => (
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
                  <p className="text-white/20 text-xs font-body">Lahore, Pakistan</p>
                </div>
              </div>
            </footer>
          </FlyToCartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
