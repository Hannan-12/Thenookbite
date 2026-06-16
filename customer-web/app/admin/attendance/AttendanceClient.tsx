'use client';

import { useState, useEffect, useCallback } from 'react';

interface AttendanceRecord {
  id: string | null;
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'no_records';
  check_in: string | null;
  check_out: string | null;
  note: string | null;
  staff: { full_name: string; role: string; staff_type: string };
}

const STATUS_STYLES: Record<string, string> = {
  present:    'border-green-500/30 bg-green-500/5 text-green-400',
  late:       'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
  absent:     'border-red-500/30 bg-red-500/5 text-red-400',
  no_records: 'border-white/5 bg-white/3 text-white/20',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function hours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  const h = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
  return h.toFixed(1) + 'h';
}

export function AttendanceClient() {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const [view, setView]       = useState<'daily' | 'monthly'>('daily');
  const [date, setDate]       = useState(today);
  const [month, setMonth]     = useState(thisMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = view === 'daily'
      ? `/api/admin/attendance?date=${date}`
      : `/api/admin/attendance?month=${month}`;
    try {
      const res = await fetch(url);
      if (!res.ok) { setError('Failed to load attendance data.'); }
      else { setRecords(await res.json()); }
    } catch {
      setError('Network error — check your connection.');
    }
    setLoading(false);
  }, [view, date, month]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(record: AttendanceRecord, status: 'present' | 'absent' | 'late') {
    if (record.id) {
      await fetch(`/api/admin/attendance/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } else {
      await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: record.staff_id, date: record.date, status }),
      });
    }
    load();
  }

  // Monthly summary — skip no_records placeholders in counts
  const staffSummary = records.reduce<Record<string, { name: string; role: string; present: number; late: number; absent: number }>>((acc, r) => {
    const id = r.staff_id;
    if (!acc[id]) acc[id] = { name: r.staff?.full_name, role: r.staff?.role, present: 0, late: 0, absent: 0 };
    if (r.status !== 'no_records') acc[id][r.status]++;
    return acc;
  }, {});

  const presentToday  = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentToday   = records.filter(r => r.status === 'absent').length;

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">TEAM</p>
          <h1 className="font-heading text-3xl text-white">ATTENDANCE</h1>
        </div>
        <a
          href="/checkin"
          target="_blank"
          className="font-heading text-xs tracking-widest px-4 py-2.5 border border-[#E4002B]/40 text-[#E4002B] hover:bg-[#E4002B] hover:text-white rounded-sm transition-colors"
        >
          OPEN CHECK-IN TABLET →
        </a>
      </div>

      {/* View toggle + date picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {(['daily', 'monthly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                view === v ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
              }`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        {view === 'daily' ? (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 text-white text-sm font-heading px-3 py-1.5 rounded-sm focus:outline-none focus:border-[#E4002B]/40"
          />
        ) : (
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 text-white text-sm font-heading px-3 py-1.5 rounded-sm focus:outline-none focus:border-[#E4002B]/40"
          />
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/5 rounded-sm px-5 py-3 flex items-center justify-between">
          <p className="font-heading text-xs tracking-wider text-red-400">⚠ {error}</p>
          <button onClick={load} className="font-heading text-[10px] tracking-widest text-red-400/60 hover:text-red-400 transition-colors">
            RETRY
          </button>
        </div>
      )}

      {/* Daily summary pills */}
      {view === 'daily' && (
        <div className="flex gap-3 mb-6">
          <div className="border border-green-500/30 bg-green-500/5 rounded-sm px-5 py-3 text-center">
            <p className="font-heading text-2xl text-green-400">{presentToday}</p>
            <p className="font-heading text-[10px] tracking-widest text-green-400/60 mt-0.5">PRESENT</p>
          </div>
          <div className="border border-red-500/30 bg-red-500/5 rounded-sm px-5 py-3 text-center">
            <p className="font-heading text-2xl text-red-400">{absentToday}</p>
            <p className="font-heading text-[10px] tracking-widest text-red-400/60 mt-0.5">ABSENT</p>
          </div>
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-sm px-5 py-3 text-center">
            <p className="font-heading text-2xl text-yellow-400">{records.filter(r => r.status === 'late').length}</p>
            <p className="font-heading text-[10px] tracking-widest text-yellow-400/60 mt-0.5">LATE</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-white/20 font-heading text-xs tracking-widest">LOADING…</div>
      ) : view === 'daily' ? (
        /* ── Daily view ── */
        <div className="border border-white/5 rounded-sm overflow-hidden">
          <div className="divide-y divide-white/5">
            {records.length === 0 ? (
              <div className="px-5 py-12 text-center text-white/20 font-heading text-xs tracking-widest">
                NO STAFF FOUND
              </div>
            ) : records.map((r, i) => (
              <div key={r.staff_id + i} className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className={`font-heading text-[10px] tracking-widest px-2 py-1 rounded-sm border ${STATUS_STYLES[r.status]}`}>
                    {r.status.toUpperCase()}
                  </span>
                  <div>
                    <p className="font-heading text-sm text-white">{r.staff?.full_name}</p>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5 uppercase">{r.staff?.role} · {r.staff?.staff_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-heading text-xs text-white/40">
                      IN {fmt(r.check_in)} · OUT {fmt(r.check_out)}
                    </p>
                    {hours(r.check_in, r.check_out) && (
                      <p className="font-heading text-[10px] text-white/20">{hours(r.check_in, r.check_out)} worked</p>
                    )}
                  </div>
                  {/* Admin override */}
                  <div className="flex gap-1.5">
                    {(['present', 'late', 'absent'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(r, s)}
                        className={`font-heading text-[9px] tracking-widest px-2 py-1 rounded-sm border transition-colors ${
                          r.status === s
                            ? STATUS_STYLES[s]
                            : 'border-white/5 text-white/20 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Monthly view ── */
        <div className="border border-white/5 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-heading">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 tracking-widest text-white/30">STAFF</th>
                  <th className="text-left px-5 py-3 tracking-widest text-white/30">ROLE</th>
                  <th className="text-center px-4 py-3 tracking-widest text-green-400/60">PRESENT</th>
                  <th className="text-center px-4 py-3 tracking-widest text-yellow-400/60">LATE</th>
                  <th className="text-center px-4 py-3 tracking-widest text-white/30">ABSENT</th>
                  <th className="text-center px-4 py-3 tracking-widest text-white/30">TOTAL DAYS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(staffSummary).map(([id, s]) => (
                  <tr key={id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-white">{s.name}</td>
                    <td className="px-5 py-3 text-white/40 uppercase">{s.role}</td>
                    <td className="px-4 py-3 text-center text-green-400">{s.present}</td>
                    <td className="px-4 py-3 text-center text-yellow-400">{s.late}</td>
                    <td className="px-4 py-3 text-center text-white/30">{s.absent}</td>
                    <td className="px-4 py-3 text-center text-white/50">{s.present + s.late + s.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
