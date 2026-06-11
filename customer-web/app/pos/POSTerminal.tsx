'use client';

import { useState, useRef } from 'react';
import { CATEGORIES, type Category, type MenuCard } from '@/lib/types';
import { formatPKR } from '@/lib/format';
import { imageForItem } from '@/lib/itemImages';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartLine {
  key: string;
  name: string;
  price: number;
  quantity: number;
  menu_item_id: string;
}

type OrderType = 'dine-in' | 'takeaway';
type PaymentMethod = 'cash' | 'card';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cardImage(card: MenuCard): string {
  const dbUrl = 'item' in card ? card.item.image_url : card.base.image_url;
  return imageForItem(card.name, card.category, dbUrl);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function POSTerminal({
  cards,
  staffId,
  staffName,
  staffRole,
}: {
  cards: MenuCard[];
  staffId: string;
  staffName: string;
  staffRole: string;
}) {
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<Category | 'All'>('All');
  const [cart, setCart]             = useState<CartLine[]>([]);
  const [orderType, setOrderType]   = useState<OrderType>('dine-in');
  const [table, setTable]           = useState('');
  const [customer, setCustomer]     = useState('');
  const [notes, setNotes]           = useState('');
  const [payment, setPayment]       = useState<PaymentMethod>('cash');
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<{ id: string; total: number } | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const searchRef                   = useRef<HTMLInputElement>(null);

  // ── Filter cards ────────────────────────────────────────────────────────────
  const filtered = cards.filter(c => {
    const matchCat = category === 'All' || c.category === category;
    const matchQ   = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  function addLine(line: Omit<CartLine, 'quantity'>) {
    setCart(prev => {
      const existing = prev.find(l => l.key === line.key);
      if (existing) return prev.map(l => l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { ...line, quantity: 1 }];
    });
    showToast(`+ ${line.name}`);
  }

  function adjustQty(key: string, delta: number) {
    setCart(prev => {
      const updated = prev.map(l => l.key === key ? { ...l, quantity: l.quantity + delta } : l);
      return updated.filter(l => l.quantity > 0);
    });
  }

  function clearCart() {
    setCart([]);
    setTable('');
    setCustomer('');
    setNotes('');
    setOrderType('dine-in');
    setPayment('cash');
  }

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  // ── Place order ───────────────────────────────────────────────────────────────
  async function placeOrder() {
    if (!cart.length) return;
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer || (orderType === 'dine-in' ? `Table ${table || '?'}` : 'Counter'),
          table_number: orderType === 'dine-in' ? (table || null) : null,
          special_notes: notes || null,
          payment_method: payment,
          user_id: null,
          staff_id: staffId,
          items: cart.map(l => ({
            menu_item_id: l.menu_item_id,
            item_name: l.name,
            item_price: l.price,
            quantity: l.quantity,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();
      setLastOrder({ id: order.id, total: order.total });
      clearCart();
      showToast('Order placed!');
    } catch (e) {
      showToast('Failed: ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setPlacing(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="flex h-screen bg-[#0d0d0d] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* ── LEFT: Menu panel ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-white/5">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border-b border-white/5 flex-shrink-0">
          <div className="bg-[#E4002B] text-white font-heading text-xs px-2.5 py-1 tracking-wider">TNB</div>
          <span className="font-heading text-white/40 text-xs tracking-[0.3em]">POS TERMINAL</span>
          <div className="ml-auto flex items-center gap-4">
            <span className="font-heading text-[10px] tracking-widest text-white/20">
              {new Date().toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[10px] tracking-widest text-white/40 uppercase">{staffName}</span>
              <span className="font-heading text-[9px] px-1.5 py-0.5 border border-white/10 text-white/20 rounded-sm uppercase">{staffRole}</span>
            </div>
            <button
              onClick={async () => { await createClient().auth.signOut(); window.location.href = '/pos/login'; }}
              className="font-heading text-[10px] tracking-widest text-white/20 hover:text-white transition-colors"
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Search + category bar */}
        <div className="px-4 py-3 bg-[#111] border-b border-white/5 flex-shrink-0 space-y-2">
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {(['All', ...CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat as Category | 'All')}
                className={`flex-shrink-0 font-heading text-[10px] tracking-widest px-2.5 py-1.5 rounded-sm border transition-colors duration-100 ${
                  category === cat
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white/30 hover:text-white hover:border-white/30'
                }`}
              >
                {cat === 'Pizza Regular v1' ? 'PIZZA REG' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/20 font-heading text-xs tracking-widest">
              NO ITEMS FOUND
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filtered.map(card => (
                <POSCard key={card.name + card.category} card={card} onAdd={addLine} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart + order panel ─────────────────────────────────────── */}
      <div className="w-80 xl:w-96 flex flex-col bg-[#111111] flex-shrink-0">

        {/* Order type */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex gap-2">
            {(['dine-in', 'takeaway'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 font-heading text-xs tracking-widest py-2 rounded-sm border transition-colors duration-100 ${
                  orderType === t
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white/30 hover:text-white'
                }`}
              >
                {t === 'dine-in' ? '🍽 DINE IN' : '🥡 TAKEAWAY'}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="Customer name (opt)"
              className="flex-1 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
            />
            {orderType === 'dine-in' && (
              <input
                value={table}
                onChange={e => setTable(e.target.value)}
                placeholder="Table #"
                className="w-20 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
              />
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span className="font-heading text-xs tracking-widest">CART EMPTY</span>
              <span className="text-[10px] text-white/10">Tap items to add</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {cart.map(line => (
                <div key={line.key} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-xs text-white truncate">{line.name}</p>
                    <p className="font-heading text-[10px] text-white/30">{formatPKR(line.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => adjustQty(line.key, -1)}
                      className="w-6 h-6 rounded-sm bg-white/5 text-white/50 hover:bg-[#E4002B] hover:text-white font-heading text-sm leading-none transition-colors"
                    >
                      −
                    </button>
                    <span className="font-heading text-sm text-white w-5 text-center">{line.quantity}</span>
                    <button
                      onClick={() => adjustQty(line.key, +1)}
                      className="w-6 h-6 rounded-sm bg-white/5 text-white/50 hover:bg-green-600 hover:text-white font-heading text-sm leading-none transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-heading text-xs text-white/60 w-16 text-right flex-shrink-0">
                    {formatPKR(line.price * line.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="px-4 pb-2 border-t border-white/5 pt-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Special notes…"
            rows={2}
            className="w-full bg-[#1a1a1a] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body resize-none"
          />
        </div>

        {/* Payment */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {(['cash', 'card'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPayment(p)}
                className={`flex-1 font-heading text-xs tracking-widest py-2 rounded-sm border transition-colors duration-100 ${
                  payment === p
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-white/5 text-white/20 hover:text-white hover:border-white/10'
                }`}
              >
                {p === 'cash' ? '💵 CASH' : '💳 CARD'}
              </button>
            ))}
          </div>
        </div>

        {/* Total + place order */}
        <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs tracking-widest text-white/40">TOTAL</span>
            <span className="font-heading text-2xl text-white">{formatPKR(total)}</span>
          </div>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="font-heading text-xs tracking-widest px-4 py-3 border border-white/10 text-white/30 hover:text-white hover:border-white/30 rounded-sm transition-colors"
              >
                CLEAR
              </button>
            )}
            <button
              onClick={placeOrder}
              disabled={!cart.length || placing}
              className="flex-1 font-heading text-sm tracking-widest py-3 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              {placing ? 'PLACING…' : 'PLACE ORDER'}
            </button>
          </div>
        </div>

        {/* Last order confirmation */}
        {lastOrder && (
          <div className="mx-4 mb-4 border border-green-500/30 bg-green-500/5 rounded-sm px-4 py-3">
            <p className="font-heading text-xs tracking-widest text-green-400 mb-0.5">ORDER PLACED ✓</p>
            <p className="font-heading text-xs text-white/50">#{lastOrder.id.slice(-6).toUpperCase()} — {formatPKR(lastOrder.total)}</p>
            <a
              href={`/admin/orders/${lastOrder.id}`}
              className="font-heading text-[10px] tracking-widest text-green-400/60 hover:text-green-400 transition-colors"
            >
              VIEW ORDER →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POS Card ─────────────────────────────────────────────────────────────────
function POSCard({ card, onAdd }: {
  card: MenuCard;
  onAdd: (line: Omit<CartLine, 'quantity'>) => void;
}) {
  const [sizeIdx, setSizeIdx]   = useState(0);
  const [variantIdx, setVariantIdx] = useState(0);

  function getLine(): Omit<CartLine, 'quantity'> {
    if (card.kind === 'pizza') {
      const s = card.sizes[sizeIdx];
      return { key: s.sku, name: `${card.name} (${s.label})`, price: s.price, menu_item_id: card.base.id };
    }
    if (card.kind === 'burger') {
      const v = card.variants[variantIdx];
      return { key: v.sku, name: `${card.name} (${v.label})`, price: v.price, menu_item_id: card.base.id };
    }
    return { key: card.item.sku, name: card.name, price: card.item.price, menu_item_id: card.item.id };
  }

  const currentPrice = card.kind === 'pizza'
    ? card.sizes[sizeIdx]?.price
    : card.kind === 'burger'
    ? card.variants[variantIdx]?.price
    : card.item.price;

  const img = cardImage(card);

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-sm overflow-hidden hover:border-[#E4002B]/40 transition-colors group flex flex-col">
      {/* Image */}
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => onAdd(getLine())}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={card.name}
          className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="bg-[#E4002B] text-white font-heading text-xs tracking-widest px-3 py-1.5">
            + ADD
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <p className="font-heading text-xs text-white leading-tight truncate">{card.name}</p>

        {/* Size picker for pizzas */}
        {card.kind === 'pizza' && (
          <div className="flex gap-1 flex-wrap">
            {card.sizes.map((s, i) => (
              <button
                key={s.sku}
                onClick={() => setSizeIdx(i)}
                className={`font-heading text-[9px] tracking-wider px-1.5 py-0.5 rounded-sm border transition-colors ${
                  i === sizeIdx
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white'
                }`}
              >
                {s.size}
              </button>
            ))}
          </div>
        )}

        {/* Variant for burgers */}
        {card.kind === 'burger' && (
          <div className="flex gap-1">
            {card.variants.map((v, i) => (
              <button
                key={v.sku}
                onClick={() => setVariantIdx(i)}
                className={`font-heading text-[9px] tracking-wider px-1.5 py-0.5 rounded-sm border transition-colors ${
                  i === variantIdx
                    ? 'bg-[#E4002B] border-[#E4002B] text-white'
                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="font-heading text-xs text-white/60">{formatPKR(currentPrice)}</span>
          <button
            onClick={() => onAdd(getLine())}
            className="bg-[#E4002B] text-white font-heading text-[10px] tracking-widest px-2 py-1 rounded-sm hover:bg-red-700 transition-colors"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
