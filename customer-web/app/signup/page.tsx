'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-surface border border-theme px-4 py-3 focus:outline-none focus:border-brand-red/60 transition-colors text-sm font-body text-primary placeholder:text-muted rounded-sm';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signupErr) {
      setError(signupErr.message);
      setLoading(false);
      return;
    }

    // Insert profile row
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        phone: phone || null,
      });
    }

    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="bg-surface min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block bg-brand-red text-white font-heading text-base px-3 py-1.5 tracking-wider mb-6">
            TNB
          </div>
          <h1 className="font-heading text-4xl text-primary leading-none">CREATE ACCOUNT</h1>
          <p className="mt-3 text-sm text-muted">Join TNB to track orders and checkout faster.</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-theme rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
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

            <div>
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
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
              <label className="font-heading text-xs tracking-[0.25em] text-muted block mb-2">
                PASSWORD <span className="text-brand-red">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-brand-red text-sm font-body flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red text-white font-heading text-sm py-4 tracking-widest hover:bg-primary hover:text-surface transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm mt-2"
            >
              {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT →'}
            </button>

            <p className="text-center text-sm text-muted pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-heading tracking-wider hover:text-brand-red transition-colors">
                SIGN IN
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/menu" className="hover:text-primary transition-colors">
            ← Continue as guest
          </Link>
        </p>
      </div>
    </div>
  );
}
