import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { elapsed, elapsedColor } from '@/lib/useStopwatch';

describe('elapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows seconds when less than a minute', () => {
    const now = new Date('2024-01-01T12:00:30Z');
    vi.setSystemTime(now);
    expect(elapsed('2024-01-01T12:00:00Z')).toBe('30s');
  });

  it('shows 0s for current time', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(elapsed('2024-01-01T12:00:00Z')).toBe('0s');
  });

  it('shows minutes and seconds when >= 1 minute', () => {
    const now = new Date('2024-01-01T12:05:30Z');
    vi.setSystemTime(now);
    expect(elapsed('2024-01-01T12:00:00Z')).toBe('5m 30s');
  });

  it('shows hours and minutes when >= 60 minutes', () => {
    const now = new Date('2024-01-01T13:25:00Z');
    vi.setSystemTime(now);
    expect(elapsed('2024-01-01T12:00:00Z')).toBe('1h 25m');
  });

  it('handles exact minute boundaries', () => {
    const now = new Date('2024-01-01T12:03:00Z');
    vi.setSystemTime(now);
    expect(elapsed('2024-01-01T12:00:00Z')).toBe('3m 0s');
  });
});

describe('elapsedColor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns green for < 5 minutes', () => {
    const now = new Date('2024-01-01T12:03:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-green-400');
  });

  it('returns yellow for >= 5 and < 10 minutes', () => {
    const now = new Date('2024-01-01T12:07:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-yellow-400');
  });

  it('returns red for >= 10 minutes', () => {
    const now = new Date('2024-01-01T12:15:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-red-400');
  });

  it('returns green for 0 elapsed', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-green-400');
  });

  it('returns yellow at exactly 5 minutes', () => {
    const now = new Date('2024-01-01T12:05:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-yellow-400');
  });

  it('returns red at exactly 10 minutes', () => {
    const now = new Date('2024-01-01T12:10:00Z');
    vi.setSystemTime(now);
    expect(elapsedColor('2024-01-01T12:00:00Z')).toBe('text-red-400');
  });
});
