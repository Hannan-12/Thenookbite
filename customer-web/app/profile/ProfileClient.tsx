'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-surface border border-theme px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-primary placeholder:text-muted rounded-sm';

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
  const [name, setName]       = useState(initialName);
  const [phone, setPhone]     = useState(initialPhone);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: name, phone: phone || null });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      {/* Edit form */}
      <div className="bg-card border border-theme rounded-sm p-8">
        <h2 className="font-heading text-sm tracking-widest text-primary mb-6">EDIT PROFILE</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
              FULL NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} opacity-50 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
              PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 0000000"
              className={inputClass}
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
              saved
                ? 'bg-green-600 text-white'
                : 'bg-brand-red text-white hover:bg-primary hover:text-surface'
            }`}
          >
            {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>

      {/* Sidebar links */}
      <div className="flex flex-col gap-3">
        <Link
          href="/my-orders"
          className="bg-card border border-theme rounded-sm p-6 hover:border-brand-red/40 transition-colors duration-200 group"
        >
          <div className="text-brand-red mb-3">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p className="font-heading text-sm tracking-wider text-primary">MY ORDERS</p>
          <p className="text-xs text-muted mt-1">View your order history</p>
        </Link>

        <Link
          href="/menu"
          className="bg-card border border-theme rounded-sm p-6 hover:border-brand-red/40 transition-colors duration-200"
        >
          <div className="text-brand-red mb-3">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <p className="font-heading text-sm tracking-wider text-primary">BROWSE MENU</p>
          <p className="text-xs text-muted mt-1">Order something delicious</p>
        </Link>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="bg-card border border-theme rounded-sm p-6 hover:border-red-500/40 transition-colors duration-200 text-left disabled:opacity-50"
        >
          <div className="text-muted mb-3">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </div>
          <p className="font-heading text-sm tracking-wider text-muted">
            {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
          </p>
        </button>
      </div>
    </div>
  );
}
