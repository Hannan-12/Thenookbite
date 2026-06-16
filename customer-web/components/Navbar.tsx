'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/store/cart';
import { useFlyToCart } from '@/components/FlyToCart';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const FULLSCREEN_ROUTES = ['/kitchen', '/pos', '/order-status', '/verify'];

export function Navbar() {
  const pathname = usePathname();
  if (FULLSCREEN_ROUTES.some(r => pathname.startsWith(r))) return null;
  const totalItems = useCart((s) => s.totalItems());
  const { registerTarget } = useFlyToCart();
  const cartRef = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => registerTarget(cartRef.current), [registerTarget]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change / resize
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const profileLink = mounted && user
    ? { href: '/my-orders', label: 'MY ORDERS' }
    : { href: '/login',     label: 'SIGN IN' };
  const showProfile = mounted && !!user;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
          scrolled
            ? 'bg-surface/95 backdrop-blur-sm border-b border-theme shadow-sm'
            : 'bg-surface border-b border-theme'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0" onClick={() => setMenuOpen(false)}>
            <Image
              src="/logo-light.png"
              alt="The Nook Bite"
              width={52}
              height={52}
              className="block dark:hidden w-[52px] h-[52px] object-contain"
              priority
            />
            <Image
              src="/logo-dark.png"
              alt="The Nook Bite"
              width={52}
              height={52}
              className="hidden dark:block w-[52px] h-[52px] object-contain"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/menu',           label: 'MENU' },
              { href: '/cart',           label: 'CART', ref: cartRef },
              { href: profileLink.href,  label: profileLink.label },
              ...(showProfile ? [{ href: '/profile', label: 'PROFILE' }] : []),
            ].map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={item.ref as React.Ref<HTMLAnchorElement> | undefined}
                  className={`relative flex items-center gap-2 font-heading text-sm tracking-widest px-4 py-2 transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted hover:text-primary'
                  }`}
                >
                  {item.label}
                  {item.href === '/cart' && mounted && totalItems > 0 && (
                    <span key={totalItems} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-xs font-bold text-white animate-pop">
                      {totalItems}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-red rounded-full" />
                  )}
                </Link>
              );
            })}
            <div className="ml-2 pl-4 border-l border-theme">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile right: cart badge + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              ref={cartRef}
              href="/cart"
              className="relative flex items-center text-muted hover:text-primary p-2 transition-colors duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
              </svg>
              {mounted && totalItems > 0 && (
                <span key={totalItems} className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white animate-pop">
                  {totalItems}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              className="p-2 text-muted hover:text-primary transition-colors duration-200"
            >
              {menuOpen ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — top-16 matches the new h-16 navbar */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <nav
            className="absolute top-16 left-0 right-0 bg-surface border-b border-theme animate-fade-up shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { href: '/menu',          label: 'MENU' },
              { href: '/cart',          label: mounted && totalItems > 0 ? `CART (${totalItems})` : 'CART' },
              { href: profileLink.href, label: profileLink.label },
              ...(showProfile ? [{ href: '/profile', label: 'PROFILE' }] : []),
            ].map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-6 py-4 font-heading text-sm tracking-widest border-b border-theme transition-colors duration-200 ${
                    isActive ? 'text-brand-red' : 'text-primary hover:text-brand-red'
                  }`}
                >
                  {item.label}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
