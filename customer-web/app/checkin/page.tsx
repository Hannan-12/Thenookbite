'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Action = 'checkin' | 'checkout';
type Step   = 'action' | 'pin' | 'camera' | 'result';

type Result = {
  action: Action;
  staff_name: string;
  role: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: string | null;
};

export default function CheckInPage() {
  const [step, setStep]       = useState<Step>('action');
  const [action, setAction]   = useState<Action | null>(null);
  const [pin, setPin]         = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [time, setTime]       = useState(new Date());
  const [countdown, setCountdown] = useState(3);
  const [camError, setCamError]   = useState<string | null>(null);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const captureTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-reset after result
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => { setResult(null); setPin(''); setStep('action'); setAction(null); }, 5000);
    return () => clearTimeout(id);
  }, [result]);

  // Stop camera when leaving camera step
  useEffect(() => {
    if (step !== 'camera') stopCamera();
  }, [step]);

  function stopCamera() {
    if (captureTimer.current)   clearTimeout(captureTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function reset() {
    setPin('');
    setError(null);
    setStep('action');
    setAction(null);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  }

  function selectAction(a: Action) {
    setAction(a);
    setStep('pin');
  }

  function handleKey(digit: string) {
    if (step !== 'pin') return;
    if (pin.length < 4) setPin(p => p + digit);
  }

  function handleDelete() {
    if (step === 'pin') setPin(p => p.slice(0, -1));
  }

  // Auto-trigger camera when 4th digit entered
  useEffect(() => {
    if (pin.length !== 4 || step !== 'pin') return;
    setStep('camera');
    const id = setTimeout(() => startCamera(), 200);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setCountdown(3);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      let ct = 3;
      countdownTimer.current = setInterval(() => {
        ct -= 1;
        setCountdown(ct);
        if (ct <= 0 && countdownTimer.current) clearInterval(countdownTimer.current);
      }, 1000);
      captureTimer.current = setTimeout(() => captureAndSubmit(), 3500);
    } catch {
      setCamError('Camera not accessible.');
      submitCheckin(pin, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function captureAndSubmit() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { submitCheckin(pin, null); return; }

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) { submitCheckin(pin, null); return; }
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) { submitCheckin(pin, null); return; }
      const form = new FormData();
      form.append('photo', blob, `checkin-${Date.now()}.jpg`);
      try {
        const upRes = await fetch('/api/checkin/upload', { method: 'POST', body: form });
        const { url } = upRes.ok ? await upRes.json() : { url: null };
        submitCheckin(pin, url);
      } catch {
        submitCheckin(pin, null);
      }
    }, 'image/jpeg', 0.85);
  }

  async function submitCheckin(enteredPin: string, photoUrl: string | null) {
    setLoading(true);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin, photo_url: photoUrl, action }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      showError(data.detail ?? 'Error');
      setPin('');
      setStep('action');
      setAction(null);
      return;
    }
    setResult(data);
    setStep('result');
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 select-none">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-block bg-[#E4002B] text-white font-heading text-xl px-4 py-2 tracking-widest mb-4">
          TNB
        </div>
        <p className="font-heading text-white/40 text-sm tracking-[0.3em]">STAFF ATTENDANCE</p>
        <p className="font-heading text-white/20 text-xs tracking-widest mt-2">
          {time.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {time.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="w-full max-w-xs mb-6 border border-[#E4002B]/40 bg-[#E4002B]/10 rounded-sm px-4 py-3 text-center">
          <p className="font-heading text-sm text-[#E4002B] tracking-wider">{error}</p>
        </div>
      )}

      {/* ── STEP 1: ACTION SELECTION ── */}
      {step === 'action' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => selectAction('checkin')}
            className="w-full py-8 bg-green-500/10 border-2 border-green-500/40 hover:border-green-500 hover:bg-green-500/20 rounded-sm transition-all duration-150 group"
          >
            <p className="font-heading text-4xl text-green-400 mb-2 group-hover:scale-110 transition-transform">✓</p>
            <p className="font-heading text-xl tracking-widest text-green-400">CHECK IN</p>
            <p className="font-heading text-xs text-green-500/50 tracking-wider mt-1">START OF SHIFT</p>
          </button>

          <button
            onClick={() => selectAction('checkout')}
            className="w-full py-8 bg-blue-500/10 border-2 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/20 rounded-sm transition-all duration-150 group"
          >
            <p className="font-heading text-4xl text-blue-400 mb-2 group-hover:scale-110 transition-transform">👋</p>
            <p className="font-heading text-xl tracking-widest text-blue-400">CHECK OUT</p>
            <p className="font-heading text-xs text-blue-500/50 tracking-wider mt-1">END OF SHIFT</p>
          </button>
        </div>
      )}

      {/* ── STEP 2: PIN PAD ── */}
      {step === 'pin' && (
        <div className="w-full max-w-xs">
          {/* Action label */}
          <div className="text-center mb-6">
            <span className={`inline-block font-heading text-xs tracking-widest px-3 py-1.5 rounded-sm border ${
              action === 'checkin'
                ? 'border-green-500/40 text-green-400 bg-green-500/10'
                : 'border-blue-500/40 text-blue-400 bg-blue-500/10'
            }`}>
              {action === 'checkin' ? '✓ CHECK IN' : '👋 CHECK OUT'}
            </span>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? action === 'checkin' ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                  : 'bg-transparent border-white/20'
              }`} />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((k, i) => (
              k === '' ? <div key={i} /> :
              k === '⌫' ? (
                <button key={i} onClick={handleDelete}
                  className="aspect-square flex items-center justify-center font-heading text-xl text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-sm transition-colors">
                  ⌫
                </button>
              ) : (
                <button key={i} onClick={() => handleKey(k)}
                  className={`aspect-square flex items-center justify-center font-heading text-2xl text-white bg-[#1a1a1a] border border-white/5 rounded-sm transition-colors duration-100 active:scale-95 ${
                    action === 'checkin'
                      ? 'hover:bg-green-500 hover:border-green-500'
                      : 'hover:bg-blue-500 hover:border-blue-500'
                  }`}>
                  {k}
                </button>
              )
            ))}
          </div>

          <p className="text-center font-heading text-[10px] tracking-widest text-white/20 mt-6">ENTER YOUR 4-DIGIT PIN</p>

          <button onClick={reset} className="w-full mt-4 font-heading text-[10px] tracking-widest text-white/20 hover:text-white/50 transition-colors py-2">
            ← BACK
          </button>
        </div>
      )}

      {/* ── STEP 3: CAMERA ── */}
      {step === 'camera' && (
        <div className="w-full max-w-sm">
          <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-white/10 mb-4">
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {!camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
                <div className="bg-black/60 rounded-full w-14 h-14 flex items-center justify-center">
                  <span className="font-heading text-3xl text-white tabular-nums">
                    {countdown > 0 ? countdown : '📸'}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute inset-4 pointer-events-none">
              <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 ${action === 'checkin' ? 'border-green-500' : 'border-blue-500'}`} />
              <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 ${action === 'checkin' ? 'border-green-500' : 'border-blue-500'}`} />
              <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 ${action === 'checkin' ? 'border-green-500' : 'border-blue-500'}`} />
              <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 ${action === 'checkin' ? 'border-green-500' : 'border-blue-500'}`} />
            </div>
          </div>
          <p className="text-center font-heading text-xs tracking-widest text-white/30">
            {loading ? 'PROCESSING…' : camError ? camError : 'LOOK AT THE CAMERA'}
          </p>
        </div>
      )}

      {/* ── STEP 4: RESULT ── */}
      {step === 'result' && result && (
        <div className={`w-full max-w-sm border rounded-sm overflow-hidden ${
          result.action === 'checkin'
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-blue-500/40 bg-blue-500/5'
        }`}>
          <div className="px-8 py-10 text-center">
            <p className={`font-heading text-6xl mb-4 ${result.action === 'checkin' ? 'text-green-400' : 'text-blue-400'}`}>
              {result.action === 'checkin' ? '✓' : '👋'}
            </p>
            <p className="font-heading text-2xl text-white mb-1">{result.staff_name}</p>
            <p className="font-heading text-xs tracking-widest text-white/40 mb-5 uppercase">{result.role}</p>

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

            <p className="font-heading text-[10px] text-white/20 tracking-widest mt-6">RESETTING IN 5 SECONDS…</p>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
