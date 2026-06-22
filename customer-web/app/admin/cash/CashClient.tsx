'use client';

import { useState, useCallback, useEffect } from 'react';
import { formatPKR } from '@/lib/format';

interface Reset {
  id: string;
  amount_at_reset: number;
  reset_at: string;
  reset_by: string;
}

interface CashData {
  cashTotal: number;
  cashSinceReset: number;
  resets: Reset[];
}

export function CashClient({ initial }: { initial: CashData }) {
  const [data, setData]       = useState<CashData>(initial);
  const [resetting, setResetting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/cash', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleReset() {
    setResetting(true);
    await fetch('/api/admin/cash', { method: 'POST' });
    setResetting(false);
    setConfirm(false);
    refresh();
  }

  const { cashTotal, cashSinceReset, resets } = data;

  return (
    <div className="px-4 sm:px-8 py-8">
      <div className="mb-6">
        <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">FINANCES</p>
        <h1 className="font-heading text-3xl text-white">CASH DRAWER</h1>
        <p className="text-white text-xs mt-1">Cash collected from orders + settled pay-later</p>
      </div>

      {/* Main totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="border border-green-500/20 bg-green-500/5 rounded-sm px-6 py-6">
          <p className="font-heading text-xs tracking-widest text-green-400/60 mb-1">TODAY&apos;S TOTAL CASH</p>
          <p className="font-heading text-5xl text-green-400">{formatPKR(cashTotal)}</p>
          <p className="font-heading text-[10px] tracking-widest text-green-400/40 mt-2">ALL CASH SINCE MIDNIGHT</p>
        </div>
        <div className="border border-white/5 rounded-sm px-6 py-6">
          <p className="font-heading text-xs tracking-widest text-white mb-1">SINCE LAST RESET</p>
          <p className="font-heading text-5xl text-white">{formatPKR(cashSinceReset)}</p>
          <p className="font-heading text-[10px] tracking-widest text-white mt-2">
            {resets.length > 0
              ? `LAST RESET: ${new Date(resets[0].reset_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'NO RESETS TODAY'}
          </p>
        </div>
      </div>

      {/* Reset section */}
      <div className="mb-8 border border-white/5 rounded-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-heading text-xs tracking-widest text-white mb-0.5">RESET CASH COUNTER</p>
            <p className="font-heading text-[10px] tracking-widest text-white">
              Records current total, then marks a new counting period
            </p>
          </div>
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="font-heading text-xs tracking-widest px-5 py-2.5 border border-[#E4002B]/30 text-[#E4002B] hover:bg-[#E4002B]/10 rounded-sm transition-colors"
            >
              RESET TO ZERO
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-heading text-[10px] tracking-widest text-yellow-400">CONFIRM RESET?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="font-heading text-xs tracking-widest px-4 py-2 bg-[#E4002B] text-white hover:bg-red-700 rounded-sm transition-colors disabled:opacity-50"
              >
                {resetting ? 'RESETTING…' : 'YES, RESET'}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="font-heading text-xs tracking-widest px-4 py-2 border border-white/10 text-white hover:border-white/30 rounded-sm transition-colors"
              >
                CANCEL
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reset history */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <p className="font-heading text-xs tracking-widest text-white">RESET HISTORY</p>
        </div>
        {resets.length === 0 ? (
          <div className="px-5 py-10 text-center font-heading text-xs tracking-widest text-white">
            NO RESETS YET
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {resets.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-heading text-xs text-white">
                    {new Date(r.reset_at).toLocaleString('en-PK', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="font-heading text-[10px] tracking-widest text-white mt-0.5">
                    RESET BY {r.reset_by.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-sm text-white">{formatPKR(r.amount_at_reset)}</p>
                  <p className="font-heading text-[9px] tracking-widest text-white mt-0.5">AT TIME OF RESET</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
