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
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (phone && !isValidPakistaniPhone(normalizePhone(phone))) {
      setError('Enter a valid Pakistani mobile number (03XXXXXXXXX).');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name.trim(),
        phone: phone ? normalizePhone(phone) : null,
      });
    }
    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-6">
            TNB
          </div>
          <h1 className="font-heading text-4xl text-white leading-none">CREATE ACCOUNT</h1>
          <p className="mt-3 text-sm text-white/40">Join TNB to track orders and checkout faster.</p>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className="font-heading text-[10px] tracking-[0.25em] text-white/30 block mb-2">
                PHONE NUMBER
                <span className="text-white/20 normal-case font-body tracking-normal ml-2">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  maxLength={11}
                  className={inputClass}
                />
                {phone && isValidPakistaniPhone(normalizePhone(phone)) && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
                )}
              </div>
              <p className="text-white/20 text-xs mt-1.5 font-body">Used to match your past orders</p>
            </div>

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
                  placeholder="Min. 6 characters"
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
              {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT →'}
            </button>

            <p className="text-center text-sm text-white/30 pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-white font-heading tracking-wider hover:text-brand-red transition-colors">
                SIGN IN
              </Link>
            </p>
          </form>
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
