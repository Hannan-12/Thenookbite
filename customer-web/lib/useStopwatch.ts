import { useEffect, useState } from 'react';

export function elapsed(from: string): string {
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function elapsedColor(from: string): string {
  const mins = Math.floor((Date.now() - new Date(from).getTime()) / 60000);
  if (mins < 5)  return 'text-green-400';
  if (mins < 10) return 'text-yellow-400';
  return 'text-red-400';
}

// Re-renders every second
export function useStopwatchTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}
