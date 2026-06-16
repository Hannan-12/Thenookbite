'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-white placeholder:text-white/20 rounded-sm';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-10">TNB</div>
          <div className="bg-[#111] border border-white/5 rounded-sm p-10">
            <div className="w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="font-heading text-2xl text-white tracking-widest mb-3">CHECK YOUR EMAIL</h2>
            <p className="text-white/50 text-sm font-body leading-relaxed mb-1">We sent a reset link to</p>
            <p className="text-white font-heading tracking-wider mb-4">{email}</p>
            <p className="text-white/30 text-xs font-body leading-relaxed mb-8">
              Click the link in the email to set a new password. Check your spam if you don&apos;t see it.
            </p>
            <Link href="/login" className="inline-block w-full bg-brand-red text-white font-heading text-sm py-4 tracking-widest hover:bg-red-600 transition-colors rounded-sm">
              BACK TO SIGN IN →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-6">TNB</div>
          <h1 className="font-heading text-4xl text-white leading-none">RESET PASSWORD</h1>
          <p className="mt-3 text-sm text-white/40">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                EMAIL ADDRESS <span className="text-brand-red">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
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
              disabled={loading}
              className="w-full bg-brand-red text-white font-heading text-sm py-4 tracking-widest hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm mt-2"
            >
              {loading ? 'SENDING…' : 'SEND RESET LINK →'}
            </button>

            <p className="text-center text-sm text-white/30 pt-2">
              <Link href="/login" className="text-white font-heading tracking-wider hover:text-brand-red transition-colors">
                ← BACK TO SIGN IN
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
