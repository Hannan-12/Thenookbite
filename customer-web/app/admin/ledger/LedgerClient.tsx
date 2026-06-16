'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatPKR } from '@/lib/format';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'summary' | 'purchases' | 'expenses' | 'vendors';
type Preset = 'today' | '7d' | '30d' | 'month' | 'custom';
interface Toast { msg: string; ok: boolean; }

interface Summary {
  total_revenue: number;
  total_purchases: number;
  total_expenses: number;
  total_costs: number;
  net_profit: number;
  expense_breakdown: { category: string; amount: number }[];
}

interface Purchase {
  id: string;
  vendor_name: string;
  amount: number;
  description: string | null;
  purchase_date: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
}

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  notes: string | null;
}

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Maintenance', 'Supplies', 'Other'];

const inputClass = 'bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/50 rounded-sm font-body w-full';
const labelClass = 'font-heading text-[10px] tracking-widest text-white/30 block mb-1.5';

// ── Helpers ────────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function presetDates(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const to = toISO(today);
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') {
    const from = new Date(today); from.setDate(today.getDate() - 6);
    return { from: toISO(from), to };
  }
  if (preset === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to };
  }
  const from = new Date(today); from.setDate(today.getDate() - 29);
  return { from: toISO(from), to };
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Summary Tab ────────────────────────────────────────────────────────────

function SummaryTab() {
  const [preset, setPreset]         = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const dates = preset === 'custom' ? { from: customFrom, to: customTo } : presetDates(preset);

  const fetch_ = useCallback(async () => {
    if (!dates.from || !dates.to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ledger/summary?from_date=${dates.from}&to_date=${dates.to}`);
      if (!res.ok) setError('Failed to load summary data.');
      else setSummary(await res.json());
    } catch {
      setError('Network error — check your connection.');
    }
    setLoading(false);
  }, [dates.from, dates.to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function handleExportPDF() {
    if (!summary) return;
    const period = `${dates.from} → ${dates.to}`;
    const generated = new Date().toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const profitPositive = summary.net_profit >= 0;

    const cards = [
      { label: 'REVENUE',    value: `Rs.${summary.total_revenue.toLocaleString()}`,   sub: 'Completed orders',         color: '#16a34a' },
      { label: 'PURCHASES',  value: `Rs.${summary.total_purchases.toLocaleString()}`,  sub: 'Stock & supplies bought',  color: '#2563eb' },
      { label: 'EXPENSES',   value: `Rs.${summary.total_expenses.toLocaleString()}`,   sub: 'Rent, utilities, etc.',    color: '#d97706' },
      { label: 'NET PROFIT', value: `Rs.${summary.net_profit.toLocaleString()}`,        sub: 'Revenue − Purchases − Expenses', color: profitPositive ? '#111' : '#dc2626' },
    ].map(c => `
      <div style="border:1px solid #e5e7eb;border-radius:4px;padding:14px 18px;flex:1;min-width:140px;">
        <div style="font-size:10px;color:#6b7280;letter-spacing:0.1em;margin-bottom:6px;">${c.label}</div>
        <div style="font-size:20px;font-weight:700;color:${c.color};">${c.value}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${c.sub}</div>
      </div>`).join('');

    const breakdownRows = summary.expense_breakdown.length > 0
      ? summary.expense_breakdown.map(e => {
          const pct = summary.total_expenses > 0 ? Math.round((e.amount / summary.total_expenses) * 100) : 0;
          return `<tr><td>${e.category}</td><td style="text-align:right;">${pct}%</td><td style="text-align:right;">Rs.${e.amount.toLocaleString()}</td></tr>`;
        }).join('')
      : '<tr><td colspan="3" style="color:#9ca3af;text-align:center;padding:12px 0;">No expenses recorded</td></tr>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>P&L Summary — ${period}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; padding: 32px 40px; color: #111; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  table thead tr { border-bottom: 2px solid #e5e7eb; }
  table thead th { padding: 6px 0; text-align: left; }
  table tbody tr { border-bottom: 1px solid #f3f4f6; }
  table tbody td { padding: 7px 0; }
  @media print { @page { margin: 20mm; size: A4; } }
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <div style="font-size:11px;letter-spacing:0.15em;color:#E4002B;margin-bottom:4px;">THE NOOK BITE</div>
      <h1>PROFIT & LOSS SUMMARY</h1>
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Period: ${period}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#9ca3af;">Generated: ${generated}</div>
  </div>
  <div style="border-top:2px solid #E4002B;margin-bottom:24px;"></div>

  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;">${cards}</div>

  <h3 style="font-size:11px;letter-spacing:0.15em;color:#6b7280;margin-bottom:10px;">EXPENSE BREAKDOWN</h3>
  <table>
    <thead><tr>
      <th>CATEGORY</th>
      <th style="text-align:right;">% OF EXPENSES</th>
      <th style="text-align:right;">AMOUNT</th>
    </tr></thead>
    <tbody>${breakdownRows}</tbody>
  </table>

  <div style="margin-top:24px;padding:14px 18px;background:#f9fafb;border-radius:4px;display:flex;align-items:center;gap:8px;font-size:13px;">
    <span style="color:#16a34a;font-weight:700;">Rs.${summary.total_revenue.toLocaleString()}</span>
    <span style="color:#9ca3af;">−</span>
    <span style="color:#2563eb;font-weight:700;">Rs.${summary.total_purchases.toLocaleString()}</span>
    <span style="color:#9ca3af;">−</span>
    <span style="color:#d97706;font-weight:700;">Rs.${summary.total_expenses.toLocaleString()}</span>
    <span style="color:#9ca3af;">=</span>
    <span style="font-weight:800;font-size:16px;color:${profitPositive ? '#111' : '#dc2626'};">Rs.${summary.net_profit.toLocaleString()}</span>
  </div>

  <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;">
    The Nook Bite — Internal Report — Confidential
  </div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'today', label: 'TODAY' },
    { key: '7d',    label: 'LAST 7D' },
    { key: 'month', label: 'THIS MONTH' },
    { key: '30d',   label: 'LAST 30D' },
    { key: 'custom', label: 'CUSTOM' },
  ];

  const profitPositive = (summary?.net_profit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Date filter + export */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)}
            className={`font-heading text-xs tracking-widest px-4 py-2 rounded-sm border transition-colors ${
              preset === p.key ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
            }`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-xs text-white rounded-sm focus:outline-none font-body" />
            <span className="text-white/20 text-xs font-heading">TO</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-xs text-white rounded-sm focus:outline-none font-body" />
          </div>
        )}
        {loading && <span className="font-heading text-[10px] tracking-widest text-white/20">LOADING…</span>}
      </div>
        <button
          onClick={handleExportPDF}
          disabled={!summary}
          className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors flex-shrink-0"
        >
          ↓ PDF
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/5 rounded-sm px-5 py-3 flex items-center justify-between">
          <p className="font-heading text-xs tracking-wider text-red-400">⚠ {error}</p>
          <button onClick={fetch_} className="font-heading text-[10px] tracking-widest text-red-400/60 hover:text-red-400 transition-colors">
            RETRY
          </button>
        </div>
      )}

      {/* P&L cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-green-500/20 bg-green-500/5 rounded-sm px-5 py-5">
          <p className="font-heading text-[10px] tracking-widest text-green-400/60 mb-2">REVENUE</p>
          <p className={`font-heading text-2xl text-white ${loading ? 'opacity-30' : ''}`}>
            {summary ? formatPKR(summary.total_revenue) : '—'}
          </p>
          <p className="font-heading text-[10px] text-white/20 mt-1">Completed orders</p>
        </div>
        <div className="border border-blue-500/20 bg-blue-500/5 rounded-sm px-5 py-5">
          <p className="font-heading text-[10px] tracking-widest text-blue-400/60 mb-2">PURCHASES</p>
          <p className={`font-heading text-2xl text-white ${loading ? 'opacity-30' : ''}`}>
            {summary ? formatPKR(summary.total_purchases) : '—'}
          </p>
          <p className="font-heading text-[10px] text-white/20 mt-1">Stock & supplies bought</p>
        </div>
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-sm px-5 py-5">
          <p className="font-heading text-[10px] tracking-widest text-yellow-400/60 mb-2">EXPENSES</p>
          <p className={`font-heading text-2xl text-white ${loading ? 'opacity-30' : ''}`}>
            {summary ? formatPKR(summary.total_expenses) : '—'}
          </p>
          <p className="font-heading text-[10px] text-white/20 mt-1">Rent, utilities, etc.</p>
        </div>
        <div className={`border rounded-sm px-5 py-5 ${profitPositive ? 'border-[#E4002B]/30 bg-[#E4002B]/5' : 'border-red-800/40 bg-red-900/10'}`}>
          <p className="font-heading text-[10px] tracking-widest text-white/40 mb-2">NET PROFIT</p>
          <p className={`font-heading text-2xl ${loading ? 'opacity-30' : ''} ${profitPositive ? 'text-white' : 'text-red-400'}`}>
            {summary ? formatPKR(summary.net_profit) : '—'}
          </p>
          <p className="font-heading text-[10px] text-white/20 mt-1">Revenue − Purchases − Expenses</p>
        </div>
      </div>

      {/* Expense breakdown */}
      {summary && summary.expense_breakdown.length > 0 && (
        <div className="border border-white/5 bg-[#111] rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="font-heading text-xs tracking-widest text-white/40">EXPENSE BREAKDOWN</p>
          </div>
          <div className="divide-y divide-white/5">
            {summary.expense_breakdown.map(e => (
              <div key={e.category} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-heading text-sm text-white">{e.category}</span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-48">
                    <div className="h-full bg-yellow-400/60 rounded-full"
                      style={{ width: `${Math.round((e.amount / summary.total_expenses) * 100)}%` }} />
                  </div>
                </div>
                <span className="font-heading text-sm text-white/70">{formatPKR(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* P&L formula */}
      {summary && (
        <div className="border border-white/5 bg-[#111] rounded-sm px-5 py-4">
          <p className="font-heading text-[10px] tracking-widest text-white/20 mb-3">PROFIT & LOSS FORMULA</p>
          <div className="flex flex-wrap items-center gap-2 font-heading text-sm">
            <span className="text-green-400">{formatPKR(summary.total_revenue)}</span>
            <span className="text-white/20">−</span>
            <span className="text-blue-400">{formatPKR(summary.total_purchases)}</span>
            <span className="text-white/20">−</span>
            <span className="text-yellow-400">{formatPKR(summary.total_expenses)}</span>
            <span className="text-white/20">=</span>
            <span className={profitPositive ? 'text-white' : 'text-red-400'}>{formatPKR(summary.net_profit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Purchases Tab ──────────────────────────────────────────────────────────

function PurchasesTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<Toast | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [preset, setPreset]       = useState<Preset>('month');

  // form state
  const [vendorId, setVendorId]   = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [date, setDate]           = useState(toISO(new Date()));
  const [adding, setAdding]       = useState(false);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  const dates = presetDates(preset);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/ledger/purchases?from_date=${dates.from}&to_date=${dates.to}`).then(r => r.ok ? r.json() : []),
      fetch('/api/admin/ledger/vendors').then(r => r.ok ? r.json() : []),
    ]).then(([p, v]) => {
      setPurchases(Array.isArray(p) ? p : []);
      setVendors(Array.isArray(v) ? v : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dates.from, dates.to]);

  function handleVendorSelect(id: string) {
    setVendorId(id);
    const v = vendors.find(v => v.id === id);
    if (v) setVendorName(v.name);
    else setVendorName('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorName.trim() || !amount) return;
    setAdding(true);
    const res = await fetch('/api/admin/ledger/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId || null, vendor_name: vendorName, amount: parseInt(amount), description: desc, purchase_date: date }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed', false); return; }
    setPurchases(prev => [data, ...prev]);
    setVendorId(''); setVendorName(''); setAmount(''); setDesc('');
    showToast('Purchase added');
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/ledger/purchases/${id}`, { method: 'DELETE' });
    if (res.ok) { setPurchases(prev => prev.filter(p => p.id !== id)); setDeleteId(null); showToast('Deleted'); }
    else showToast('Delete failed', false);
  }

  const total = purchases.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none ${toast.ok ? 'bg-green-600' : 'bg-[#E4002B]'}`}>{toast.msg}</div>}

      {/* Add form */}
      <form onSubmit={handleAdd} className="border border-white/5 bg-[#111] rounded-sm px-5 py-5 mb-6 space-y-4">
        <p className="font-heading text-xs tracking-widest text-white/40 mb-1">ADD PURCHASE</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>VENDOR</label>
            <select value={vendorId} onChange={e => handleVendorSelect(e.target.value)}
              className={inputClass + ' cursor-pointer'}>
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>VENDOR NAME <span className="text-[#E4002B]">*</span></label>
            <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Or type manually" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>AMOUNT (PKR) <span className="text-[#E4002B]">*</span></label>
            <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className={labelClass}>DESCRIPTION (OPTIONAL)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What was purchased?" className={inputClass} />
          </div>
          <button type="submit" disabled={adding}
            className="font-heading text-xs tracking-widest px-6 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors flex-shrink-0">
            {adding ? 'ADDING…' : '+ ADD'}
          </button>
        </div>
      </form>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['today', '7d', 'month', '30d'] as Preset[]).map(p => (
          <button key={p} onClick={() => setPreset(p)}
            className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
              preset === p ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
            }`}>
            {p === 'today' ? 'TODAY' : p === '7d' ? 'LAST 7D' : p === 'month' ? 'THIS MONTH' : 'LAST 30D'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <p className="font-heading text-xs tracking-widest text-white/40">PURCHASES · {dates.from} → {dates.to}</p>
          {purchases.length > 0 && <p className="font-heading text-xs text-white/60">TOTAL: <span className="text-white">{formatPKR(total)}</span></p>}
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">LOADING…</div>
        ) : purchases.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">NO PURCHASES YET</div>
        ) : (
          <div className="divide-y divide-white/5">
            {purchases.map(p => (
              <div key={p.id}>
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-heading text-sm text-white">{p.vendor_name}</p>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5">{formatDate(p.purchase_date)}{p.description ? ` · ${p.description}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm text-blue-400">{formatPKR(p.amount)}</span>
                    <button onClick={() => setDeleteId(deleteId === p.id ? null : p.id)}
                      className="font-heading text-[10px] tracking-widest px-2 py-1 border border-red-500/20 text-red-400/40 hover:text-red-400 hover:border-red-500/50 rounded-sm transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
                {deleteId === p.id && (
                  <div className="px-5 py-2.5 bg-red-950/30 flex items-center gap-4">
                    <p className="font-heading text-xs text-red-400">Delete this purchase?</p>
                    <button onClick={() => handleDelete(p.id)} className="font-heading text-[10px] px-3 py-1 bg-red-600 text-white rounded-sm hover:bg-red-700">CONFIRM</button>
                    <button onClick={() => setDeleteId(null)} className="font-heading text-[10px] text-white/30 hover:text-white">CANCEL</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Expenses Tab ───────────────────────────────────────────────────────────

function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<Toast | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [preset, setPreset]     = useState<Preset>('month');

  const [category, setCategory] = useState('Rent');
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [date, setDate]         = useState(toISO(new Date()));
  const [adding, setAdding]     = useState(false);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  const dates = presetDates(preset);

  useEffect(() => {
    fetch(`/api/admin/ledger/expenses?from_date=${dates.from}&to_date=${dates.to}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dates.from, dates.to]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setAdding(true);
    const res = await fetch('/api/admin/ledger/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount: parseInt(amount), description: desc, expense_date: date }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed', false); return; }
    setExpenses(prev => [data, ...prev]);
    setAmount(''); setDesc('');
    showToast('Expense added');
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/ledger/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) { setExpenses(prev => prev.filter(e => e.id !== id)); setDeleteId(null); showToast('Deleted'); }
    else showToast('Delete failed', false);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none ${toast.ok ? 'bg-green-600' : 'bg-[#E4002B]'}`}>{toast.msg}</div>}

      {/* Add form */}
      <form onSubmit={handleAdd} className="border border-white/5 bg-[#111] rounded-sm px-5 py-5 mb-6 space-y-3">
        <p className="font-heading text-xs tracking-widest text-white/40 mb-1">ADD EXPENSE</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>CATEGORY <span className="text-[#E4002B]">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass + ' cursor-pointer'}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>AMOUNT (PKR) <span className="text-[#E4002B]">*</span></label>
            <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>DESCRIPTION (OPTIONAL)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Details…" className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={adding}
            className="font-heading text-xs tracking-widest px-6 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors">
            {adding ? 'ADDING…' : '+ ADD'}
          </button>
        </div>
      </form>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['today', '7d', 'month', '30d'] as Preset[]).map(p => (
          <button key={p} onClick={() => setPreset(p)}
            className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
              preset === p ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
            }`}>
            {p === 'today' ? 'TODAY' : p === '7d' ? 'LAST 7D' : p === 'month' ? 'THIS MONTH' : 'LAST 30D'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <p className="font-heading text-xs tracking-widest text-white/40">EXPENSES · {dates.from} → {dates.to}</p>
          {expenses.length > 0 && <p className="font-heading text-xs text-white/60">TOTAL: <span className="text-white">{formatPKR(total)}</span></p>}
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">LOADING…</div>
        ) : expenses.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">NO EXPENSES YET</div>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map(e => (
              <div key={e.id}>
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-[9px] tracking-widest px-2 py-0.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-sm">{e.category.toUpperCase()}</span>
                      {e.description && <p className="font-heading text-sm text-white">{e.description}</p>}
                    </div>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5">{formatDate(e.expense_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-sm text-yellow-400">{formatPKR(e.amount)}</span>
                    <button onClick={() => setDeleteId(deleteId === e.id ? null : e.id)}
                      className="font-heading text-[10px] tracking-widest px-2 py-1 border border-red-500/20 text-red-400/40 hover:text-red-400 hover:border-red-500/50 rounded-sm transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
                {deleteId === e.id && (
                  <div className="px-5 py-2.5 bg-red-950/30 flex items-center gap-4">
                    <p className="font-heading text-xs text-red-400">Delete this expense?</p>
                    <button onClick={() => handleDelete(e.id)} className="font-heading text-[10px] px-3 py-1 bg-red-600 text-white rounded-sm hover:bg-red-700">CONFIRM</button>
                    <button onClick={() => setDeleteId(null)} className="font-heading text-[10px] text-white/30 hover:text-white">CANCEL</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Vendors Tab ────────────────────────────────────────────────────────────

function VendorsTab() {
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<Toast | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);

  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [cat, setCat]           = useState('');
  const [notes, setNotes]       = useState('');
  const [adding, setAdding]     = useState(false);

  const [editName, setEditName]   = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCat, setEditCat]     = useState('');
  const [editSaving, setEditSaving] = useState(false);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    fetch('/api/admin/ledger/vendors')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setVendors(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const res = await fetch('/api/admin/ledger/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, category: cat, notes }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed', false); return; }
    setVendors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setName(''); setPhone(''); setCat(''); setNotes('');
    showToast('Vendor added');
  }

  function startEdit(v: Vendor) { setEditId(v.id); setEditName(v.name); setEditPhone(v.phone ?? ''); setEditCat(v.category ?? ''); }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    const res = await fetch(`/api/admin/ledger/vendors/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, phone: editPhone || null, category: editCat || null }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed', false); return; }
    setVendors(prev => prev.map(v => v.id === editId ? data : v));
    setEditId(null);
    showToast('Vendor updated');
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/ledger/vendors/${id}`, { method: 'DELETE' });
    if (res.ok) { setVendors(prev => prev.filter(v => v.id !== id)); setDeleteId(null); showToast('Deleted'); }
    else showToast('Delete failed', false);
  }

  return (
    <>
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none ${toast.ok ? 'bg-green-600' : 'bg-[#E4002B]'}`}>{toast.msg}</div>}

      {/* Add form */}
      <form onSubmit={handleAdd} className="border border-white/5 bg-[#111] rounded-sm px-5 py-5 mb-6">
        <p className="font-heading text-xs tracking-widest text-white/40 mb-4">ADD VENDOR</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className={labelClass}>NAME <span className="text-[#E4002B]">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Vendor name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PHONE</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CATEGORY</label>
            <input value={cat} onChange={e => setCat(e.target.value)} placeholder="e.g. Meat, Dairy, Packaging" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>NOTES</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={adding}
            className="font-heading text-xs tracking-widest px-6 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors">
            {adding ? 'ADDING…' : '+ ADD VENDOR'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <p className="font-heading text-xs tracking-widest text-white/40">VENDORS ({vendors.length})</p>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">LOADING…</div>
        ) : vendors.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 font-heading text-xs tracking-widest">NO VENDORS YET</div>
        ) : (
          <div className="divide-y divide-white/5">
            {vendors.map(v => (
              <>
                <div key={v.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-heading text-sm text-white">{v.name}</p>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5">
                      {[v.phone, v.category].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editId === v.id ? setEditId(null) : startEdit(v)}
                      className="font-heading text-[10px] tracking-widest px-3 py-1.5 border border-white/10 text-white/30 hover:text-white rounded-sm transition-colors">
                      {editId === v.id ? 'CANCEL' : 'EDIT'}
                    </button>
                    <button onClick={() => setDeleteId(deleteId === v.id ? null : v.id)}
                      className="font-heading text-[10px] tracking-widest px-2 py-1.5 border border-red-500/20 text-red-400/40 hover:text-red-400 rounded-sm transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
                {editId === v.id && (
                  <div key={v.id + '-edit'} className="px-5 py-4 bg-[#0d0d0d]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div><label className={labelClass}>NAME</label><input value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>PHONE</label><input value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>CATEGORY</label><input value={editCat} onChange={e => setEditCat(e.target.value)} className={inputClass} /></div>
                    </div>
                    <button onClick={saveEdit} disabled={editSaving}
                      className="font-heading text-[10px] tracking-widest px-5 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors">
                      {editSaving ? 'SAVING…' : 'SAVE'}
                    </button>
                  </div>
                )}
                {deleteId === v.id && (
                  <div key={v.id + '-del'} className="px-5 py-2.5 bg-red-950/30 flex items-center gap-4">
                    <p className="font-heading text-xs text-red-400">Delete &quot;{v.name}&quot;?</p>
                    <button onClick={() => handleDelete(v.id)} className="font-heading text-[10px] px-3 py-1 bg-red-600 text-white rounded-sm hover:bg-red-700">CONFIRM</button>
                    <button onClick={() => setDeleteId(null)} className="font-heading text-[10px] text-white/30 hover:text-white">CANCEL</button>
                  </div>
                )}
              </>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function LedgerClient() {
  const [tab, setTab] = useState<Tab>('summary');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'summary',   label: 'SUMMARY' },
    { key: 'purchases', label: 'PURCHASES' },
    { key: 'expenses',  label: 'EXPENSES' },
    { key: 'vendors',   label: 'VENDORS' },
  ];

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">FINANCE</p>
        <h1 className="font-heading text-3xl text-white">LEDGER</h1>
        <p className="text-white/30 text-xs mt-1 font-heading tracking-wider">Track purchases, expenses and profit</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 mb-8">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`font-heading text-xs tracking-widest px-5 py-3 border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-[#E4002B] text-white' : 'border-transparent text-white/30 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary'   && <SummaryTab />}
      {tab === 'purchases' && <PurchasesTab />}
      {tab === 'expenses'  && <ExpensesTab />}
      {tab === 'vendors'   && <VendorsTab />}
    </div>
  );
}
