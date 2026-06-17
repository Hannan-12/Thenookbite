import { describe, it, expect } from 'vitest';
import { formatPKR, isValidPakistaniPhone, normalizePhone } from '@/lib/format';

describe('formatPKR', () => {
  it('formats a simple integer', () => {
    expect(formatPKR(1250)).toBe('Rs. 1,250');
  });

  it('formats zero', () => {
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('formats a small number without comma', () => {
    expect(formatPKR(500)).toBe('Rs. 500');
  });

  it('formats a large number with commas', () => {
    expect(formatPKR(100000)).toBe('Rs. 100,000');
  });
});

describe('isValidPakistaniPhone', () => {
  it('accepts a valid 11-digit number starting with 03', () => {
    expect(isValidPakistaniPhone('03001234567')).toBe(true);
  });

  it('accepts a number with dashes', () => {
    expect(isValidPakistaniPhone('0300-1234567')).toBe(true);
  });

  it('accepts a number with spaces', () => {
    expect(isValidPakistaniPhone('0300 123 4567')).toBe(true);
  });

  it('rejects a number that does not start with 03', () => {
    expect(isValidPakistaniPhone('04001234567')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(isValidPakistaniPhone('030012345')).toBe(false);
  });

  it('rejects a number that is too long', () => {
    expect(isValidPakistaniPhone('030012345678')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPakistaniPhone('')).toBe(false);
  });

  it('rejects alphabetic characters', () => {
    expect(isValidPakistaniPhone('0300abcdefg')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('strips dashes', () => {
    expect(normalizePhone('0300-1234567')).toBe('03001234567');
  });

  it('strips spaces', () => {
    expect(normalizePhone('0300 123 4567')).toBe('03001234567');
  });

  it('strips mixed whitespace and dashes', () => {
    expect(normalizePhone('03 00-12 34-567')).toBe('03001234567');
  });

  it('returns unchanged if already clean', () => {
    expect(normalizePhone('03001234567')).toBe('03001234567');
  });
});
