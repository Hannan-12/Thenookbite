import { describe, it, expect } from 'vitest';
import { pkDate, pkHour } from '../lib/timezone';

describe('pkDate', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const date = pkDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date within reasonable range of today', () => {
    const date = new Date(pkDate());
    const now = new Date();
    const diffDays = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    // PKT is UTC+5 so at most 1 day off from UTC
    expect(diffDays).toBeLessThan(2);
  });
});

describe('pkHour', () => {
  it('returns a number between 0 and 23', () => {
    const hour = pkHour();
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it('returns an integer', () => {
    expect(Number.isInteger(pkHour())).toBe(true);
  });
});
