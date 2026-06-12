import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { ShellWrapper } from '@/components/ShellWrapper';
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
            <ShellWrapper>{children}</ShellWrapper>
          </FlyToCartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
