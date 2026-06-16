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
  const [otp, setOtp]           = useState('');
  const [step, setStep]         = useState<'email' | 'otp'>('email');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter the OTP sent to your email.'); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: 'email',
    });
    if (err || !data.user) {
      setError(err?.message ?? 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (step === 'email') {
    return (
      <form onSubmit={handleSendOtp} className="space-y-4">
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
          <p className="text-white/20 text-xs mt-1.5 font-body">A 6-digit code will be sent to your inbox</p>
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
          {loading ? 'SENDING CODE…' : 'SEND CODE →'}
        </button>

        <p className="text-center text-sm text-white/30 pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white font-heading tracking-wider hover:text-brand-red transition-colors">
            SIGN UP
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <p className="text-white/60 text-sm font-body">Code sent to</p>
        <p className="text-white font-heading text-base tracking-wider mt-1">{email}</p>
        <p className="text-white/30 text-xs mt-1 font-body">Check your inbox (and spam folder)</p>
      </div>

      <div>
        <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
          ENTER CODE <span className="text-brand-red">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="······"
          required
          autoFocus
          className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
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
        className="w-full bg-brand-red text-white font-heading text-sm py-4 tracking-widest hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
      >
        {loading ? 'VERIFYING…' : 'VERIFY & SIGN IN →'}
      </button>

      <button
        type="button"
        onClick={() => { setStep('email'); setOtp(''); setError(null); }}
        className="w-full text-white/30 font-heading text-xs tracking-widest hover:text-white transition-colors py-2"
      >
        ← CHANGE EMAIL
      </button>
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
          <p className="mt-3 text-sm text-white/40">Sign in with your email — we'll send you a code.</p>
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
