'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Step = 'pin' | 'camera' | 'result';

type Result = {
  action: 'checkin' | 'checkout';
  staff_name: string;
  role: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: string | null;
  photo_url?: string | null;
};

export default function CheckInPage() {
  const [pin, setPin]         = useState('');
  const [step, setStep]       = useState<Step>('pin');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [time, setTime]       = useState(new Date());
  const [countdown, setCountdown] = useState(3);
  const [camError, setCamError]   = useState<string | null>(null);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-clear result and reset after 5 seconds
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => { setResult(null); setPin(''); setStep('pin'); }, 5000);
    return () => clearTimeout(id);
  }, [result]);

  // Stop camera when leaving camera step
  useEffect(() => {
    if (step !== 'camera') stopCamera();
  }, [step]);

  function stopCamera() {
    if (captureTimer.current) clearTimeout(captureTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

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
      // Countdown then auto-capture
      let ct = 3;
      countdownTimer.current = setInterval(() => {
        ct -= 1;
        setCountdown(ct);
        if (ct <= 0) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
        }
      }, 1000);
      captureTimer.current = setTimeout(() => captureAndSubmit(), 3500);
    } catch {
      setCamError('Camera not accessible. Check browser permissions.');
      // Submit without photo
      submitCheckin(pin, null);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function captureAndSubmit() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { submitCheckin(pin, null); return; }

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) { submitCheckin(pin, null); return; }
    // Mirror like a selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) { submitCheckin(pin, null); return; }
      // Upload to /api/checkin/upload → returns photo_url
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
    setError(null);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin, photo_url: photoUrl }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.detail ?? 'Error');
      setPin('');
      setStep('pin');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setResult({ ...data, photo_url: photoUrl });
    setStep('result');
  }

  function handleKey(digit: string) {
    if (step !== 'pin') return;
    if (pin.length < 4) setPin(p => p + digit);
  }

  function handleDelete() {
    if (step === 'pin') setPin(p => p.slice(0, -1));
  }

  // Auto-open camera when 4th digit entered
  useEffect(() => {
    if (pin.length !== 4 || step !== 'pin') return;
    setStep('camera');
    // Small delay so the 4th dot renders
    const id = setTimeout(() => startCamera(), 200);
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

      {/* ── RESULT ── */}
      {step === 'result' && result && (
        <div className={`w-full max-w-sm border rounded-sm overflow-hidden ${
          result.action === 'checkin'
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-blue-500/40 bg-blue-500/5'
        }`}>
          {result.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.photo_url}
              alt="Check-in photo"
              className="w-full aspect-video object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          <div className="px-8 py-8 text-center">
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
        </div>
      )}

      {/* ── CAMERA ── */}
      {step === 'camera' && (
        <div className="w-full max-w-sm">
          <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-white/10 mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Countdown overlay */}
            {!camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
                <div className="bg-black/60 rounded-full w-14 h-14 flex items-center justify-center">
                  <span className="font-heading text-3xl text-white tabular-nums">
                    {countdown > 0 ? countdown : '📸'}
                  </span>
                </div>
              </div>
            )}
            {/* Corner brackets */}
            <div className="absolute inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#E4002B]" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#E4002B]" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#E4002B]" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#E4002B]" />
            </div>
          </div>

          {camError ? (
            <p className="text-center font-heading text-xs text-orange-400 tracking-wider">{camError}</p>
          ) : (
            <p className="text-center font-heading text-xs tracking-widest text-white/30">
              {loading ? 'PROCESSING…' : 'LOOK AT THE CAMERA'}
            </p>
          )}
        </div>
      )}

      {/* ── PIN PAD ── */}
      {step === 'pin' && (
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

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
