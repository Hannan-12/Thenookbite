'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin',          label: 'DASHBOARD', icon: '▦' },
  { href: '/admin/orders',   label: 'ORDERS',    icon: '◈' },
  { href: '/admin/menu',     label: 'MENU',      icon: '◉' },
  { href: '/admin/staff',      label: 'STAFF',      icon: '◎' },
  { href: '/admin/attendance', label: 'ATTENDANCE', icon: '◷' },
  { href: '/admin/inventory',  label: 'INVENTORY',  icon: '◫' },
  { href: '/admin/ledger',     label: 'LEDGER',     icon: '₨' },
  { href: '/admin/reports',    label: 'REPORTS',    icon: '▲' },
  { href: '/admin/users',      label: 'CUSTOMERS',  icon: '◑' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen flex bg-[#0d0d0d] font-body">
      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-[#111111] border-r border-white/5 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#E4002B] text-white font-heading text-sm px-2.5 py-1 leading-none tracking-wider">
              TNB
            </div>
            <span className="font-heading text-white/60 text-xs tracking-[0.2em]">ADMIN</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-heading tracking-widest transition-colors duration-150 ${
                  active
                    ? 'bg-[#E4002B] text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-heading tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-colors duration-150"
          >
            <span className="text-base leading-none">⎋</span>
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="bg-[#E4002B] text-white font-heading text-xs px-2 py-1 leading-none">TNB</div>
            <span className="font-heading text-white/40 text-xs tracking-widest">ADMIN</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="text-white/40 hover:text-white p-1"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1"/>
              <rect y="9" width="20" height="2" rx="1"/>
              <rect y="15" width="20" height="2" rx="1"/>
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
