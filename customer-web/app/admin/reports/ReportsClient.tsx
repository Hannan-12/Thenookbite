'use client';

import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPKR } from '@/lib/format';

// ── Types ──────────────────────────────────────────────────────────────────

type Preset = 'today' | '7d' | '30d' | 'custom';
type ReportType = 'daily' | 'top_items' | 'top_categories';
type SortBy = 'revenue' | 'qty';

interface Summary { total_revenue: number; total_orders: number; total_items_sold: number; avg_order_value: number; }
interface DayRow   { label: string; revenue: number; orders: number; }
interface TopItem  { item_name: string; revenue: number; qty: number; orders: number; }
interface TopCat   { category: string; revenue: number; qty: number; orders: number; }

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
  const from = new Date(today); from.setDate(today.getDate() - 29);
  return { from: toISO(from), to };
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2, fontFamily: 'var(--font-heading, sans-serif)', fontSize: 11, color: '#fff',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2 space-y-1">
      <p className="text-white/40 text-[10px] tracking-widest mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-xs font-heading tracking-wider">
          {p.dataKey === 'revenue' ? formatPKR(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ReportsClient() {
  const [preset, setPreset]         = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [sortBy, setSortBy]         = useState<SortBy>('revenue');
  const [metric, setMetric]         = useState<'revenue' | 'orders'>('revenue');

  const [summary, setSummary]       = useState<Summary | null>(null);
  const [dailyRows, setDailyRows]   = useState<DayRow[]>([]);
  const [topItems, setTopItems]     = useState<TopItem[]>([]);
  const [topCats, setTopCats]       = useState<TopCat[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const dates = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : presetDates(preset);

  const fetchAll = useCallback(async () => {
    if (!dates.from || !dates.to) return;
    setLoading(true);
    setError(null);
    const base = `/api/admin/reports`;
    const q = `from_date=${dates.from}&to_date=${dates.to}`;

    try {
      const [sumRes, dailyRes, itemsRes, catsRes] = await Promise.all([
        fetch(`${base}/summary?${q}`),
        fetch(`${base}/sales-over-time?${q}&group_by=day`),
        fetch(`${base}/top-items?${q}&sort_by=${sortBy}&limit=10`),
        fetch(`${base}/top-categories?${q}&sort_by=${sortBy}`),
      ]);

      if (!sumRes.ok || !dailyRes.ok || !itemsRes.ok || !catsRes.ok) {
        setError('Failed to load report data. Try refreshing.');
      } else {
        setSummary(await sumRes.json());
        setDailyRows(await dailyRes.json());
        setTopItems(await itemsRes.json());
        setTopCats(await catsRes.json());
      }
    } catch {
      setError('Network error — check your connection and try again.');
    }
    setLoading(false);
  }, [dates.from, dates.to, sortBy]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleExportCSV() {
    const type = reportType === 'daily' ? 'daily' : reportType === 'top_items' ? 'items' : 'categories';
    const url = `/api/admin/reports/export-csv?from_date=${dates.from}&to_date=${dates.to}&type=${type}&sort_by=${sortBy}`;
    window.open(url, '_blank');
  }

  function handleExportPDF() {
    if (!summary) return;
    const period = `${dates.from} → ${dates.to}`;
    const generated = new Date().toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const kpiRows = [
      ['TOTAL REVENUE',   `Rs.${summary.total_revenue.toLocaleString()}`],
      ['TOTAL ORDERS',    String(summary.total_orders)],
      ['ITEMS SOLD',      String(summary.total_items_sold)],
      ['AVG ORDER VALUE', `Rs.${summary.avg_order_value.toLocaleString()}`],
    ].map(([label, val]) => `
      <div style="border:1px solid #e5e7eb;border-radius:4px;padding:14px 18px;flex:1;min-width:140px;">
        <div style="font-size:10px;color:#6b7280;letter-spacing:0.1em;margin-bottom:6px;">${label}</div>
        <div style="font-size:20px;font-weight:700;color:#111;">${val}</div>
      </div>`).join('');

    let detailSection = '';
    if (reportType === 'daily' && dailyRows.length > 0) {
      const rows = [...dailyRows].reverse().filter(r => r.orders > 0).map(r =>
        `<tr><td>${r.label}</td><td style="text-align:right;">${r.orders}</td><td style="text-align:right;">Rs.${r.revenue.toLocaleString()}</td><td style="text-align:right;">Rs.${Math.round(r.revenue / r.orders).toLocaleString()}</td></tr>`
      ).join('');
      detailSection = `
        <h3 style="font-size:11px;letter-spacing:0.15em;color:#6b7280;margin:24px 0 10px;">DAILY BREAKDOWN</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #e5e7eb;">
            <th style="text-align:left;padding:6px 0;">DATE</th>
            <th style="text-align:right;padding:6px 0;">ORDERS</th>
            <th style="text-align:right;padding:6px 0;">REVENUE</th>
            <th style="text-align:right;padding:6px 0;">AVG ORDER</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    } else if (reportType === 'top_items' && topItems.length > 0) {
      const rows = topItems.map((item, i) =>
        `<tr><td style="color:#9ca3af;">${i + 1}</td><td>${item.item_name}</td><td style="text-align:right;">${item.qty}</td><td style="text-align:right;">Rs.${item.revenue.toLocaleString()}</td></tr>`
      ).join('');
      detailSection = `
        <h3 style="font-size:11px;letter-spacing:0.15em;color:#6b7280;margin:24px 0 10px;">TOP ITEMS</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #e5e7eb;">
            <th style="text-align:left;padding:6px 0;width:24px;">#</th>
            <th style="text-align:left;padding:6px 0;">ITEM</th>
            <th style="text-align:right;padding:6px 0;">QTY SOLD</th>
            <th style="text-align:right;padding:6px 0;">REVENUE</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    } else if (reportType === 'top_categories' && topCats.length > 0) {
      const rows = topCats.map((cat, i) =>
        `<tr><td style="color:#9ca3af;">${i + 1}</td><td>${cat.category}</td><td style="text-align:right;">${cat.orders}</td><td style="text-align:right;">${cat.qty}</td><td style="text-align:right;">Rs.${cat.revenue.toLocaleString()}</td></tr>`
      ).join('');
      detailSection = `
        <h3 style="font-size:11px;letter-spacing:0.15em;color:#6b7280;margin:24px 0 10px;">BY CATEGORY</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #e5e7eb;">
            <th style="text-align:left;padding:6px 0;width:24px;">#</th>
            <th style="text-align:left;padding:6px 0;">CATEGORY</th>
            <th style="text-align:right;padding:6px 0;">ORDERS</th>
            <th style="text-align:right;padding:6px 0;">QTY SOLD</th>
            <th style="text-align:right;padding:6px 0;">REVENUE</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Sales Report — ${period}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; padding: 32px 40px; color: #111; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.05em; }
  table tbody tr { border-bottom: 1px solid #f3f4f6; }
  table tbody td { padding: 7px 0; }
  @media print { @page { margin: 20mm; size: A4; } }
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <div style="font-size:11px;letter-spacing:0.15em;color:#E4002B;margin-bottom:4px;">THE NOOK BITE</div>
      <h1>SALES REPORT</h1>
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Period: ${period}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#9ca3af;">
      Generated: ${generated}
    </div>
  </div>
  <div style="border-top:2px solid #E4002B;margin-bottom:24px;"></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">${kpiRows}</div>
  ${detailSection}
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

  const maxItemQty  = topItems[0]?.qty ?? 1;
  const maxItemRev  = topItems[0]?.revenue ?? 1;
  const maxCatRev   = topCats[0]?.revenue ?? 1;

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'today', label: 'TODAY' },
    { key: '7d',    label: 'LAST 7D' },
    { key: '30d',   label: 'LAST 30D' },
    { key: 'custom', label: 'CUSTOM' },
  ];

  return (
    <div className="px-4 sm:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">ANALYTICS</p>
          <h1 className="font-heading text-3xl text-white">SALES REPORTS</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!summary}
            className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
          >
            ↓ PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 rounded-sm transition-colors"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`font-heading text-xs tracking-widest px-4 py-2 rounded-sm border transition-colors ${
              preset === p.key ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#E4002B]/40 font-body"
            />
            <span className="text-white/20 font-heading text-xs">TO</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#E4002B]/40 font-body"
            />
          </div>
        )}
        {loading && <span className="font-heading text-[10px] tracking-widest text-white/20 ml-2">LOADING…</span>}
      </div>

      {/* Error banner */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/5 rounded-sm px-5 py-3 flex items-center justify-between">
          <p className="font-heading text-xs tracking-wider text-red-400">⚠ {error}</p>
          <button onClick={fetchAll} className="font-heading text-[10px] tracking-widest text-red-400/60 hover:text-red-400 transition-colors">
            RETRY
          </button>
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL REVENUE',    value: summary ? formatPKR(summary.total_revenue)         : '—' },
          { label: 'TOTAL ORDERS',     value: summary ? String(summary.total_orders)              : '—' },
          { label: 'ITEMS SOLD',       value: summary ? String(summary.total_items_sold)          : '—' },
          { label: 'AVG ORDER VALUE',  value: summary ? formatPKR(summary.avg_order_value)        : '—' },
        ].map((card, i) => (
          <div key={card.label} className={`border rounded-sm px-5 py-5 ${i === 0 ? 'border-[#E4002B]/20 bg-[#E4002B]/5' : 'border-white/5 bg-[#111]'}`}>
            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-2">{card.label}</p>
            <p className={`font-heading text-2xl ${loading ? 'text-white/20' : 'text-white'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Report type tabs + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-white/5">
          {([
            { key: 'daily',          label: 'DAILY SALES' },
            { key: 'top_items',      label: 'TOP ITEMS' },
            { key: 'top_categories', label: 'BY CATEGORY' },
          ] as { key: ReportType; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`font-heading text-xs tracking-widest px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                reportType === t.key ? 'border-[#E4002B] text-white' : 'border-transparent text-white/30 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {reportType !== 'daily' && (
          <div className="flex gap-1.5">
            {(['revenue', 'qty'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                  sortBy === s ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/20 hover:text-white'
                }`}
              >
                BY {s.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {reportType === 'daily' && (
          <div className="flex gap-1.5">
            {(['revenue', 'orders'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                  metric === m ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/20 hover:text-white'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── DAILY SALES ── */}
      {reportType === 'daily' && (
        <div className="bg-[#111] border border-white/5 rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="font-heading text-xs tracking-widest text-white/40">
              REVENUE OVER TIME · {dates.from} → {dates.to}
            </p>
          </div>
          <div className="p-4 sm:p-6">
            {dailyRows.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-white/20 font-heading text-xs tracking-widest">
                {loading ? 'LOADING…' : 'NO COMPLETED ORDERS IN THIS PERIOD'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {metric === 'revenue' ? (
                  <AreaChart data={dailyRows} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E4002B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#E4002B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Area type="monotone" dataKey="revenue" stroke="#E4002B" strokeWidth={2} fill="url(#revGrad)"/>
                  </AreaChart>
                ) : (
                  <BarChart data={dailyRows} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Bar dataKey="orders" fill="#E4002B" radius={[2,2,0,0]} maxBarSize={24}/>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily table */}
          {dailyRows.length > 0 && (
            <div className="border-t border-white/5 overflow-x-auto">
              <table className="w-full text-xs font-heading">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 tracking-widest text-white/30">DATE</th>
                    <th className="text-right px-5 py-3 tracking-widest text-white/30">ORDERS</th>
                    <th className="text-right px-5 py-3 tracking-widest text-white/30">REVENUE</th>
                    <th className="text-right px-5 py-3 tracking-widest text-white/30">AVG ORDER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...dailyRows].reverse().filter(r => r.orders > 0).map(row => (
                    <tr key={row.label} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 text-white">{row.label}</td>
                      <td className="px-5 py-2.5 text-right text-white/60">{row.orders}</td>
                      <td className="px-5 py-2.5 text-right text-white">{formatPKR(row.revenue)}</td>
                      <td className="px-5 py-2.5 text-right text-white/40">{formatPKR(Math.round(row.revenue / row.orders))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TOP ITEMS ── */}
      {reportType === 'top_items' && (
        <div className="bg-[#111] border border-white/5 rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="font-heading text-xs tracking-widest text-white/40">TOP ITEMS · {dates.from} → {dates.to}</p>
          </div>
          {topItems.length === 0 ? (
            <div className="px-5 py-12 text-center text-white/20 font-heading text-xs tracking-widest">
              {loading ? 'LOADING…' : 'NO DATA FOR THIS PERIOD'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {topItems.map((item, i) => (
                <div key={item.item_name} className="flex items-center gap-4 px-5 py-3">
                  <span className="font-heading text-xs text-white/20 w-5 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-white truncate">{item.item_name}</p>
                    <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E4002B] rounded-full transition-all"
                        style={{ width: `${Math.round(((sortBy === 'qty' ? item.qty : item.revenue) / (sortBy === 'qty' ? maxItemQty : maxItemRev)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-heading text-sm text-white">{sortBy === 'qty' ? `${item.qty} sold` : formatPKR(item.revenue)}</p>
                    <p className="font-heading text-xs text-white/30">{sortBy === 'qty' ? formatPKR(item.revenue) : `${item.qty} sold`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TOP CATEGORIES ── */}
      {reportType === 'top_categories' && (
        <div className="bg-[#111] border border-white/5 rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="font-heading text-xs tracking-widest text-white/40">BY CATEGORY · {dates.from} → {dates.to}</p>
          </div>
          {topCats.length === 0 ? (
            <div className="px-5 py-12 text-center text-white/20 font-heading text-xs tracking-widest">
              {loading ? 'LOADING…' : 'NO DATA FOR THIS PERIOD'}
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/5">
                {topCats.map((cat, i) => (
                  <div key={cat.category} className="flex items-center gap-4 px-5 py-3">
                    <span className="font-heading text-xs text-white/20 w-5 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm text-white">{cat.category}</p>
                      <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E4002B] rounded-full transition-all"
                          style={{ width: `${Math.round((cat.revenue / maxCatRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-heading text-sm text-white">{formatPKR(cat.revenue)}</p>
                      <p className="font-heading text-xs text-white/30">{cat.qty} items · {cat.orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 overflow-x-auto">
                <table className="w-full text-xs font-heading">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-5 py-3 tracking-widest text-white/30">CATEGORY</th>
                      <th className="text-right px-5 py-3 tracking-widest text-white/30">ORDERS</th>
                      <th className="text-right px-5 py-3 tracking-widest text-white/30">QTY SOLD</th>
                      <th className="text-right px-5 py-3 tracking-widest text-white/30">REVENUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topCats.map(cat => (
                      <tr key={cat.category} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-2.5 text-white">{cat.category}</td>
                        <td className="px-5 py-2.5 text-right text-white/60">{cat.orders}</td>
                        <td className="px-5 py-2.5 text-right text-white/40">{cat.qty}</td>
                        <td className="px-5 py-2.5 text-right text-white">{formatPKR(cat.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
