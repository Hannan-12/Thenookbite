'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  joined_at: string;
  last_sign_in: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  is_banned: boolean;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function UsersClient({ initialUsers }: { initialUsers: Customer[] }) {
  const [users, setUsers]         = useState<Customer[]>(initialUsers);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [banningId, setBanningId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function toggleBan(id: string, currentlyBanned: boolean) {
    setBanningId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_banned: !currentlyBanned }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !currentlyBanned } : u));
    }
    setBanningId(null);
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q)
    );
  });

  const totalRevenue = users.reduce((s, u) => s + u.total_spent, 0);
  const withOrders   = users.filter(u => u.order_count > 0).length;

  return (
    <div className="px-4 sm:px-8 py-8">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">ACCOUNTS</p>
          <h1 className="font-heading text-3xl text-white">CUSTOMERS</h1>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white hover:border-white/30 hover:text-white disabled:opacity-40 rounded-sm transition-colors"
        >
          {loading ? 'LOADING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-white/5 bg-[#111] rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white mb-2">REGISTERED</p>
          <p className="font-heading text-2xl text-white">{users.length}</p>
        </div>
        <div className="border border-white/5 bg-[#111] rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white mb-2">WITH ORDERS</p>
          <p className="font-heading text-2xl text-white">{withOrders}</p>
        </div>
        <div className="border border-[#E4002B]/20 bg-[#E4002B]/5 rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white mb-2">TOTAL SPENT</p>
          <p className="font-heading text-2xl text-white">{formatPKR(totalRevenue)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-80 bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white focus:outline-none focus:border-[#E4002B]/60 rounded-sm transition-colors font-body"
        />
      </div>

      {/* Table */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <p className="font-heading text-xs tracking-widest text-white">
            {filtered.length} CUSTOMER{filtered.length !== 1 ? 'S' : ''}
            {search ? ` — FILTERED FROM ${users.length}` : ''}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-white font-heading text-sm tracking-wider">
            {search ? 'NO MATCHING CUSTOMERS' : 'NO REGISTERED CUSTOMERS YET'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-heading">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 tracking-widest text-white">CUSTOMER</th>
                  <th className="text-left px-5 py-3 tracking-widest text-white hidden md:table-cell">PHONE</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white">ORDERS</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white">TOTAL SPENT</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white hidden lg:table-cell">LAST ORDER</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white hidden xl:table-cell">JOINED</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(u => (
                  <tr key={u.id} className={`transition-colors ${u.is_banned ? 'bg-red-950/20' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/users/${u.id}`} className="block group">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`group-hover:text-[#E4002B] transition-colors ${u.is_banned ? 'text-white line-through' : 'text-white'}`}>
                            {u.full_name ?? <span className="text-white italic">No name</span>}
                          </p>
                          {u.is_banned && (
                            <span className="font-heading text-[9px] tracking-widest px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-sm">
                              BANNED
                            </span>
                          )}
                        </div>
                        <p className="text-white mt-0.5">{u.email}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-white hidden md:table-cell">
                      {u.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.order_count > 0 ? (
                        <span className="bg-white/5 border border-white/10 rounded-sm px-2.5 py-1 text-white">
                          {u.order_count}
                        </span>
                      ) : (
                        <span className="text-white">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.total_spent > 0 ? (
                        <span className="text-white">{formatPKR(u.total_spent)}</span>
                      ) : (
                        <span className="text-white">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white hidden lg:table-cell">
                      {fmtDateTime(u.last_order_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white hidden xl:table-cell">
                      {fmtDate(u.joined_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => toggleBan(u.id, u.is_banned)}
                        disabled={banningId === u.id}
                        className={`font-heading text-[10px] tracking-widest px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-40 ${
                          u.is_banned
                            ? 'border-green-500/30 text-green-400/70 hover:text-green-400 hover:border-green-500/60'
                            : 'border-red-500/20 text-red-400/50 hover:text-red-400 hover:border-red-500/50'
                        }`}
                      >
                        {banningId === u.id ? '…' : u.is_banned ? 'UNBAN' : 'BAN'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
