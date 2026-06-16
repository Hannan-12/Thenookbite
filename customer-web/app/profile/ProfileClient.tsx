'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';

export function ProfileClient({
  userId,
  initialName,
  initialPhone,
  email,
}: {
  userId: string;
  initialName: string;
  initialPhone: string;
  email: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const [name, setName]       = useState(initialName);
  const [phone, setPhone]     = useState(initialPhone);
  const isDirty = name !== initialName || phone !== initialPhone;
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const initials = (initialName || email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (phone && !isValidPakistaniPhone(norm)) {
      setError('Enter a valid Pakistani mobile number (03XXXXXXXXX).');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: name.trim(), phone: norm || null });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    if (nextUrl) { router.push(nextUrl); return; }
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero banner */}
      <div className="bg-[#111] border-b border-white/5 px-4 sm:px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
            <span className="font-heading text-white text-3xl sm:text-4xl leading-none">{initials}</span>
          </div>
          <div>
            <p className="font-heading text-[10px] tracking-[0.4em] text-brand-red mb-1">MY ACCOUNT</p>
            <h1 className="font-heading text-3xl sm:text-5xl text-white leading-none tracking-wide">
              {(initialName || 'YOUR PROFILE').toUpperCase()}
            </h1>
            <p className="mt-2 text-white/30 text-sm font-body">{email}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="grid gap-6 md:grid-cols-[1fr_240px]">

          {/* Edit form */}
          <form onSubmit={handleSave} className="bg-[#111] border border-white/5 rounded-sm p-7 space-y-5">
            <h2 className="font-heading text-xs tracking-[0.3em] text-white/40 mb-2">EDIT PROFILE</h2>

            <div>
              <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                FULL NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-white placeholder:text-white/20 rounded-sm"
              />
            </div>

            <div>
              <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                PHONE NUMBER
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  maxLength={11}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-white placeholder:text-white/20 rounded-sm"
                />
                {phone && isValidPakistaniPhone(normalizePhone(phone)) && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
                )}
              </div>
            </div>

            <div>
              <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-white/[0.02] border border-white/5 px-4 py-3 text-sm font-body text-white/20 rounded-sm cursor-not-allowed"
              />
            </div>

            {error && (
              <p className="text-brand-red text-sm flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`font-heading text-sm tracking-widest px-8 py-3 transition-colors duration-200 disabled:opacity-50 rounded-sm ${
                saved && !isDirty
                  ? 'bg-green-600 text-white'
                  : 'bg-brand-red text-white hover:bg-red-600'
              }`}
            >
              {saving ? 'SAVING…' : (saved && !isDirty) ? 'SAVED ✓' : 'SAVE CHANGES'}
            </button>
          </form>

          {/* Sidebar */}
          <div className="flex flex-col gap-3">
            <Link
              href="/my-orders"
              className="bg-[#111] border border-white/5 rounded-sm p-5 hover:border-brand-red/40 hover:bg-brand-red/5 transition-all duration-200 group flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-sm bg-brand-red/10 border border-brand-red/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-red/20 transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-brand-red">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div>
                <p className="font-heading text-sm tracking-wider text-white">MY ORDERS</p>
                <p className="text-xs text-white/30 mt-0.5">View history & reorder</p>
              </div>
            </Link>

            <Link
              href="/menu"
              className="bg-[#111] border border-white/5 rounded-sm p-5 hover:border-white/20 transition-all duration-200 group flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-white/40">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div>
                <p className="font-heading text-sm tracking-wider text-white/60">BROWSE MENU</p>
                <p className="text-xs text-white/20 mt-0.5">Order something delicious</p>
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="bg-[#111] border border-white/5 rounded-sm p-5 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200 text-left disabled:opacity-50 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-white/30">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </div>
              <div>
                <p className="font-heading text-sm tracking-wider text-white/40">
                  {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
