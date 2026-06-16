'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-white placeholder:text-white/20 rounded-sm';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/profile';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err || !data.user) {
      setError(err?.message ?? 'Invalid email or password.');
      setLoading(false);
      return;
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && data.user.email === adminEmail) {
      await supabase.auth.signOut();
      setError('Admin accounts cannot log in here. Use the admin panel.');
      setLoading(false);
      return;
    }

    const { data: staffRow } = await supabase.from('staff').select('id').eq('id', data.user.id).maybeSingle();
    if (staffRow) {
      await supabase.auth.signOut();
      setError('Staff accounts must use the POS terminal to sign in.');
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
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

      <div>
        <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
          PASSWORD <span className="text-brand-red">*</span>
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors text-xs font-heading tracking-wider"
          >
            {showPass ? 'HIDE' : 'SHOW'}
          </button>
        </div>
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
        {loading ? 'SIGNING IN…' : 'SIGN IN →'}
      </button>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-white/30">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white font-heading tracking-wider hover:text-brand-red transition-colors">
            SIGN UP
          </Link>
        </p>
        <Link href="/forgot-password" className="text-xs text-white/30 font-heading tracking-wider hover:text-white transition-colors">
          FORGOT PASSWORD?
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-6">
            TNB
          </div>
          <h1 className="font-heading text-4xl text-white leading-none">WELCOME BACK</h1>
          <p className="mt-3 text-sm text-white/40">Sign in to track your orders and more.</p>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-sm p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          <Link href="/menu" className="hover:text-white/50 transition-colors">
            ← Continue as guest
          </Link>
        </p>
      </div>
    </div>
  );
}
