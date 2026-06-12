'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';

type MenuItem = { id: string; sku: string; name: string; category: string; price: number; available: boolean };

const CATEGORIES = ['All', 'Appetizers', 'Burgers', 'Food Bank', 'Pastas', 'Pizza Regular v1', 'Pizza Special', 'Rolls & Wraps', 'Sandwiches', 'Drinks & Desserts'];

export function AdminMenuClient({ initialItems }: { initialItems: MenuItem[] }) {
  const [items, setItems]     = useState<MenuItem[]>(initialItems);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  async function toggleAvailability(item: MenuItem) {
    setLoading(item.id);
    const res = await fetch(`/api/menu/${item.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: !item.available }),
    });
    setLoading(null);
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
      showToast(`${item.name} marked as ${!item.available ? 'available' : 'unavailable'}`);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = items.filter(i => {
    const matchCat    = filter === 'All' || i.category === filter;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const byCategory = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-4 py-2 rounded-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">MANAGE</p>
        <h1 className="font-heading text-3xl text-white">MENU</h1>
        <p className="text-white/30 text-xs mt-1">{items.length} items total</p>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search items…"
        className="w-full mb-4 bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm"
      />

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-shrink-0 font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors duration-150 ${
              filter === cat
                ? 'bg-[#E4002B] border-[#E4002B] text-white'
                : 'border-white/10 text-white/30 hover:text-white hover:border-white/30'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Items grouped by category */}
      <div className="space-y-6">
        {Object.keys(byCategory).length === 0 && (
          <div className="py-16 text-center text-white/20 font-heading text-sm tracking-wider">
            NO ITEMS MATCH YOUR SEARCH
          </div>
        )}
        {Object.entries(byCategory).map(([category, catItems]) => (
          <div key={category}>
            <h2 className="font-heading text-xs tracking-widest text-[#E4002B] mb-2 px-1">{category.toUpperCase()}</h2>
            <div className="border border-white/5 rounded-sm bg-[#111111] divide-y divide-white/5">
              {catItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 sm:px-5 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`font-heading text-sm truncate ${item.available ? 'text-white' : 'text-white/30 line-through'}`}>
                      {item.name}
                    </p>
                    <p className="font-heading text-xs text-white/20 mt-0.5">{formatPKR(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-colors duration-150"
                    >
                      EDIT
                    </Link>
                    <button
                      onClick={() => toggleAvailability(item)}
                      disabled={loading === item.id}
                      className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors duration-150 disabled:opacity-40 ${
                        item.available
                          ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                          : 'border-white/10 text-white/30 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
                      }`}
                    >
                      {loading === item.id ? '…' : item.available ? 'AVAILABLE' : 'SOLD OUT'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
