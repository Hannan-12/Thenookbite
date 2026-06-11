'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [staff, setStaff]       = useState<StaffMember[]>(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'cashier' | 'manager'>('cashier');
  const [showPass, setShowPass] = useState(false);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, email, password, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.detail ?? 'Failed to create staff');
      return;
    }

    setStaff(prev => [data, ...prev]);
    setSuccess(`Account created for ${name}. Welcome email sent to ${email}.`);
    setShowForm(false);
    setName(''); setEmail(''); setPassword(''); setRole('cashier');
    setTimeout(() => setSuccess(null), 5000);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
      router.refresh();
    }
  }

  const inputClass = 'w-full bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/60 transition-colors rounded-sm';

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">TEAM</p>
          <h1 className="font-heading text-3xl text-white">STAFF</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(null); }}
          className="font-heading text-xs tracking-widest px-5 py-2.5 bg-[#E4002B] text-white hover:bg-red-700 transition-colors rounded-sm"
        >
          + NEW STAFF
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 border border-green-500/30 bg-green-500/5 rounded-sm px-5 py-3 text-green-400 font-heading text-xs tracking-wider">
          ✓ {success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-8 border border-white/10 bg-[#111] rounded-sm p-6">
          <h2 className="font-heading text-sm tracking-widest text-white mb-5">CREATE STAFF ACCOUNT</h2>
          <form onSubmit={createStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-heading text-[10px] tracking-widest text-white/40 block mb-1.5">FULL NAME</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Staff name" required className={inputClass} />
            </div>
            <div>
              <label className="font-heading text-[10px] tracking-widest text-white/40 block mb-1.5">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@email.com" required className={inputClass} />
            </div>
            <div>
              <label className="font-heading text-[10px] tracking-widest text-white/40 block mb-1.5">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  className={inputClass}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-heading text-[10px] tracking-wider text-white/30 hover:text-white transition-colors">
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
            <div>
              <label className="font-heading text-[10px] tracking-widest text-white/40 block mb-1.5">ROLE</label>
              <select value={role} onChange={e => setRole(e.target.value as 'cashier' | 'manager')}
                className={inputClass + ' cursor-pointer'}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {error && (
              <div className="sm:col-span-2 text-[#E4002B] text-xs font-body flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={loading}
                className="font-heading text-xs tracking-widest px-6 py-2.5 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 transition-colors rounded-sm">
                {loading ? 'CREATING…' : 'CREATE & SEND EMAIL'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="font-heading text-xs tracking-widest px-6 py-2.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors rounded-sm">
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h2 className="font-heading text-xs tracking-widest text-white/40">
            {staff.length} STAFF MEMBER{staff.length !== 1 ? 'S' : ''}
          </h2>
        </div>

        {staff.length === 0 ? (
          <div className="px-5 py-16 text-center text-white/20 font-heading text-sm tracking-wider">
            NO STAFF YET — CREATE YOUR FIRST ACCOUNT ABOVE
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-green-500' : 'bg-white/10'}`} />
                  <div>
                    <p className="font-heading text-sm text-white">{s.full_name}</p>
                    <p className="font-heading text-xs text-white/30 mt-0.5">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-heading text-[10px] tracking-widest px-2 py-1 rounded-sm border ${
                    s.role === 'manager'
                      ? 'border-[#E4002B]/30 text-[#E4002B]/70'
                      : 'border-white/10 text-white/30'
                  }`}>
                    {s.role.toUpperCase()}
                  </span>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`font-heading text-[10px] tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                      s.is_active
                        ? 'border-white/10 text-white/30 hover:border-red-500/40 hover:text-red-400'
                        : 'border-green-500/30 text-green-400/60 hover:text-green-400'
                    }`}
                  >
                    {s.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
