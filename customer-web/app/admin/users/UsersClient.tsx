'use client';

import { useState } from 'react';
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
  const [users, setUsers]     = useState<Customer[]>(initialUsers);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
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
          className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:border-white/30 hover:text-white disabled:opacity-40 rounded-sm transition-colors"
        >
          {loading ? 'LOADING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-white/5 bg-[#111] rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-2">REGISTERED</p>
          <p className="font-heading text-2xl text-white">{users.length}</p>
        </div>
        <div className="border border-white/5 bg-[#111] rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-2">WITH ORDERS</p>
          <p className="font-heading text-2xl text-white">{withOrders}</p>
        </div>
        <div className="border border-[#E4002B]/20 bg-[#E4002B]/5 rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-2">TOTAL SPENT</p>
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
          className="w-full sm:w-80 bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/60 rounded-sm transition-colors font-body"
        />
      </div>

      {/* Table */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <p className="font-heading text-xs tracking-widest text-white/40">
            {filtered.length} CUSTOMER{filtered.length !== 1 ? 'S' : ''}
            {search ? ` — FILTERED FROM ${users.length}` : ''}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-white/20 font-heading text-sm tracking-wider">
            {search ? 'NO MATCHING CUSTOMERS' : 'NO REGISTERED CUSTOMERS YET'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-heading">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 tracking-widest text-white/30">CUSTOMER</th>
                  <th className="text-left px-5 py-3 tracking-widest text-white/30 hidden md:table-cell">PHONE</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white/30">ORDERS</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white/30">TOTAL SPENT</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white/30 hidden lg:table-cell">LAST ORDER</th>
                  <th className="text-right px-5 py-3 tracking-widest text-white/30 hidden xl:table-cell">JOINED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-white">{u.full_name ?? <span className="text-white/30 italic">No name</span>}</p>
                      <p className="text-white/30 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-white/40 hidden md:table-cell">
                      {u.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.order_count > 0 ? (
                        <span className="bg-white/5 border border-white/10 rounded-sm px-2.5 py-1 text-white/60">
                          {u.order_count}
                        </span>
                      ) : (
                        <span className="text-white/20">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.total_spent > 0 ? (
                        <span className="text-white">{formatPKR(u.total_spent)}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white/30 hidden lg:table-cell">
                      {fmtDateTime(u.last_order_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white/30 hidden xl:table-cell">
                      {fmtDate(u.joined_at)}
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
