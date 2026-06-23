'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    // Verify admin status server-side (ADMIN_EMAIL is never exposed to the client)
    const verify = await fetch('/api/admin/verify');
    const { isAdmin } = await verify.json();
    if (!isAdmin) {
      await supabase.auth.signOut();
      setError('You are not authorised to access the admin panel.');
      setLoading(false);
      return;
    }

    router.push('/admin');
  }

  const inputClass = 'w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/60 transition-colors rounded-sm';

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-[#E4002B] text-white font-heading text-base px-3 py-1.5 leading-none tracking-wider">
            TNB
          </div>
          <span className="font-heading text-white tracking-[0.3em] text-sm">ADMIN</span>
        </div>

        <h1 className="font-heading text-3xl text-white mb-1">SIGN IN</h1>
        <p className="text-white text-sm mb-8">Owner access only.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-white transition-colors text-xs font-heading tracking-wider"
            >
              {showPass ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {error && (
            <p className="text-[#E4002B] text-xs font-body flex items-center gap-2">
              <span>⚠</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E4002B] text-white font-heading text-sm py-4 tracking-widest hover:bg-white hover:text-[#0d0d0d] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </form>
      </div>
    </div>
  );
}
