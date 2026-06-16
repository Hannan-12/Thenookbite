'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isValidPakistaniPhone, normalizePhone } from '@/lib/format';

const inputClass =
  'w-full bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-white placeholder:text-white/20 rounded-sm';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [step, setStep]         = useState<'details' | 'otp'>('details');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Format phone to international +92 format for Supabase
  function toIntl(ph: string) {
    const n = normalizePhone(ph); // strips spaces/dashes → 03xxxxxxxx
    if (n.startsWith('0')) return '+92' + n.slice(1);
    return n;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    const norm = normalizePhone(phone);
    if (!isValidPakistaniPhone(norm)) {
      setError('Enter a valid Pakistani mobile number (03XXXXXXXXX).');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: toIntl(phone),
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter the OTP sent to your number.'); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: toIntl(phone),
      token: otp,
      type: 'sms',
    });
    if (err || !data.user) {
      setError(err?.message ?? 'Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }
    // Save profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: name.trim(),
      phone: normalizePhone(phone),
    });
    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-6">
            TNB
          </div>
          <h1 className="font-heading text-4xl text-white leading-none">CREATE ACCOUNT</h1>
          <p className="mt-3 text-sm text-white/40">Join TNB to track orders and checkout faster.</p>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-sm p-8">
          {step === 'details' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                  FULL NAME <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                  PHONE NUMBER <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-body select-none">+92</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    maxLength={11}
                    required
                    className={`${inputClass} pl-12`}
                  />
                  {isValidPakistaniPhone(normalizePhone(phone)) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
                  )}
                </div>
                <p className="text-white/20 text-xs mt-1.5 font-body">An OTP will be sent to this number</p>
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
                {loading ? 'SENDING OTP…' : 'SEND OTP →'}
              </button>

              <p className="text-center text-sm text-white/30 pt-2">
                Already have an account?{' '}
                <Link href="/login" className="text-white font-heading tracking-wider hover:text-brand-red transition-colors">
                  SIGN IN
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <p className="text-white/60 text-sm font-body">OTP sent to</p>
                <p className="text-white font-heading text-base tracking-wider mt-1">{phone}</p>
              </div>

              <div>
                <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                  ENTER OTP <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
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
                {loading ? 'VERIFYING…' : 'VERIFY & CREATE ACCOUNT →'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('details'); setOtp(''); setError(null); }}
                className="w-full text-white/30 font-heading text-xs tracking-widest hover:text-white transition-colors py-2"
              >
                ← CHANGE NUMBER
              </button>
            </form>
          )}
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
