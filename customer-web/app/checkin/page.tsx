'use client';

import { useState, useEffect } from 'react';

type Result = {
  action: 'checkin' | 'checkout';
  staff_name: string;
  role: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: string | null;
};

export default function CheckInPage() {
  const [pin, setPin]         = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [time, setTime]       = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-clear result after 4 seconds
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => { setResult(null); setPin(''); }, 4000);
    return () => clearTimeout(id);
  }, [result]);

  function handleKey(digit: string) {
    if (pin.length < 4) setPin(p => p + digit);
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
  }

  async function handleSubmit() {
    if (pin.length !== 4) return;
    setLoading(true);
    setError(null);

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.detail ?? 'Error');
      setPin('');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setResult(data);
  }

  // Auto-submit 600ms after 4th digit — short window to correct a mistake via backspace
  useEffect(() => {
    if (pin.length !== 4) return;
    const id = setTimeout(() => handleSubmit(), 600);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 select-none">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-block bg-[#E4002B] text-white font-heading text-xl px-4 py-2 tracking-widest mb-4">
          TNB
        </div>
        <p className="font-heading text-white/40 text-sm tracking-[0.3em]">STAFF CHECK-IN</p>
        <p className="font-heading text-white/20 text-xs tracking-widest mt-2">
          {time.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {time.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Result screen */}
      {result ? (
        <div className={`w-full max-w-sm border rounded-sm px-8 py-10 text-center ${
          result.action === 'checkin'
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-blue-500/40 bg-blue-500/5'
        }`}>
          <p className={`font-heading text-5xl mb-4 ${result.action === 'checkin' ? 'text-green-400' : 'text-blue-400'}`}>
            {result.action === 'checkin' ? '✓' : '👋'}
          </p>
          <p className="font-heading text-2xl text-white mb-1">{result.staff_name}</p>
          <p className="font-heading text-xs tracking-widest text-white/40 mb-4 uppercase">{result.role}</p>
          {result.action === 'checkin' ? (
            <>
              <p className={`font-heading text-lg tracking-widest mb-1 ${result.status === 'late' ? 'text-yellow-400' : 'text-green-400'}`}>
                {result.status === 'late' ? 'CHECKED IN — LATE' : 'CHECKED IN'}
              </p>
              <p className="font-heading text-sm text-white/30">
                {new Date(result.check_in!).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-lg tracking-widest text-blue-400 mb-1">CHECKED OUT</p>
              <p className="font-heading text-sm text-white/30">
                {new Date(result.check_out!).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {result.hours_worked && (
                <p className="font-heading text-xs text-white/20 mt-2">{result.hours_worked} hrs worked</p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-xs">
          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-[#E4002B] border-[#E4002B]'
                  : 'bg-transparent border-white/20'
              }`} />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-[#E4002B] font-heading text-sm tracking-widest mb-4">{error}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((k, i) => (
              k === '' ? <div key={i} /> :
              k === '⌫' ? (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="aspect-square flex items-center justify-center font-heading text-xl text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-sm transition-colors"
                >
                  ⌫
                </button>
              ) : (
                <button
                  key={i}
                  onClick={() => handleKey(k)}
                  disabled={loading}
                  className="aspect-square flex items-center justify-center font-heading text-2xl text-white bg-[#1a1a1a] hover:bg-[#E4002B] border border-white/5 hover:border-[#E4002B] rounded-sm transition-colors duration-100 active:scale-95"
                >
                  {k}
                </button>
              )
            ))}
          </div>

          <p className="text-center font-heading text-[10px] tracking-widest text-white/20 mt-6">
            ENTER YOUR 4-DIGIT PIN
          </p>
        </div>
      )}
    </div>
  );
}
