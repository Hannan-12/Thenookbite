'use client';

import { useState, useEffect } from 'react';

const POSITIONS = [
  'Cashier',
  'Chef',
  'Kitchen Helper',
  'Food Packer',
  'Delivery Rider',
  'Manager',
  'Cleaner',
];

export function ApplyForm({
  selectedPosition,
  onPositionChange,
}: {
  selectedPosition?: string;
  onPositionChange?: (p: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    position: selectedPosition ?? '',
    message: '',
  });

  useEffect(() => {
    if (selectedPosition) setForm(f => ({ ...f, position: selectedPosition }));
  }, [selectedPosition]);
  const [phoneError, setPhoneError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handlePhone(v: string) {
    const cleaned = v.replace(/[^\d]/g, '');
    setForm(f => ({ ...f, phone: cleaned }));
    if (cleaned.length > 0 && !/^03[0-9]{0,9}$/.test(cleaned)) {
      setPhoneError('Must start with 03 (e.g. 03001234567)');
    } else if (cleaned.length === 11 && !/^03[0-9]{9}$/.test(cleaned)) {
      setPhoneError('Invalid Pakistani number');
    } else {
      setPhoneError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phoneError || form.phone.length !== 11) {
      setPhoneError('Enter a valid 11-digit Pakistani number');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.detail ?? 'Something went wrong.'); setStatus('error'); return; }
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-green-500/30 bg-green-500/5 rounded-sm px-8 py-12 text-center">
        <div className="text-green-400 text-4xl mb-4">✓</div>
        <h3 className="font-heading text-2xl text-white mb-2">APPLICATION SENT</h3>
        <p className="text-white/40 font-body text-sm">
          We&apos;ll contact you on <span className="text-white/70">{form.phone}</span> if you&apos;re a good fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block font-heading text-[10px] tracking-widest text-white/40 mb-1.5">
          FULL NAME <span className="text-[#E4002B]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Muhammad Ali"
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-sm px-4 py-3 text-white font-body text-sm placeholder-white/20 focus:outline-none focus:border-[#E4002B]/60 transition-colors"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block font-heading text-[10px] tracking-widest text-white/40 mb-1.5">
          MOBILE NUMBER <span className="text-[#E4002B]">*</span>
        </label>
        <div className="relative">
          <input
            type="tel"
            required
            value={form.phone}
            onChange={e => handlePhone(e.target.value)}
            placeholder="03001234567"
            maxLength={11}
            className={`w-full bg-[#1a1a1a] border rounded-sm px-4 py-3 text-white font-body text-sm placeholder-white/20 focus:outline-none transition-colors ${
              phoneError ? 'border-red-500/60' : form.phone.length === 11 ? 'border-green-500/40' : 'border-white/10 focus:border-[#E4002B]/60'
            }`}
          />
          {form.phone.length === 11 && !phoneError && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
          )}
        </div>
        {phoneError && <p className="mt-1 text-xs text-red-400 font-body">{phoneError}</p>}
      </div>

      {/* Position */}
      <div>
        <label className="block font-heading text-[10px] tracking-widest text-white/40 mb-1.5">
          POSITION <span className="text-[#E4002B]">*</span>
        </label>
        <select
          required
          value={form.position}
          onChange={e => {
            setForm(f => ({ ...f, position: e.target.value }));
            onPositionChange?.(e.target.value);
          }}
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-sm px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-[#E4002B]/60 transition-colors appearance-none"
        >
          <option value="" disabled>Select a position</option>
          {POSITIONS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block font-heading text-[10px] tracking-widest text-white/40 mb-1.5">
          WHY DO YOU WANT TO JOIN? <span className="text-white/20 font-body normal-case tracking-normal text-[11px]">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Tell us a bit about yourself..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-sm px-4 py-3 text-white font-body text-sm placeholder-white/20 focus:outline-none focus:border-[#E4002B]/60 transition-colors resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-400 font-body text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-[#E4002B] text-white font-heading text-sm tracking-widest py-4 rounded-sm hover:bg-[#c00025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'SENDING...' : 'SUBMIT APPLICATION →'}
      </button>
    </form>
  );
}
