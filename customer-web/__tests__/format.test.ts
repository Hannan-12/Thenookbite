import { describe, it, expect } from 'vitest';
import { formatPKR, isValidPakistaniPhone, normalizePhone } from '../lib/format';

describe('formatPKR', () => {
  it('formats whole rupees with comma separator', () => {
    expect(formatPKR(1250)).toBe('Rs. 1,250');
  });

  it('formats zero', () => {
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('formats large amounts', () => {
    expect(formatPKR(100000)).toBe('Rs. 100,000');
  });
});

describe('isValidPakistaniPhone', () => {
  it('accepts valid 03X numbers', () => {
    expect(isValidPakistaniPhone('03001234567')).toBe(true);
    expect(isValidPakistaniPhone('03451234567')).toBe(true);
  });

  it('rejects numbers not starting with 03', () => {
    expect(isValidPakistaniPhone('02001234567')).toBe(false);
    expect(isValidPakistaniPhone('3001234567')).toBe(false);
  });

  it('rejects short numbers', () => {
    expect(isValidPakistaniPhone('0300123456')).toBe(false);
  });

  it('rejects long numbers', () => {
    expect(isValidPakistaniPhone('030012345678')).toBe(false);
  });

  it('accepts numbers with spaces (strips them)', () => {
    expect(isValidPakistaniPhone('0300 123 4567')).toBe(true);
  });

  it('accepts numbers with dashes (strips them)', () => {
    expect(isValidPakistaniPhone('0300-123-4567')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidPakistaniPhone('')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('strips spaces', () => {
    expect(normalizePhone('0300 123 4567')).toBe('03001234567');
  });

  it('strips dashes', () => {
    expect(normalizePhone('0300-123-4567')).toBe('03001234567');
  });

  it('leaves clean number unchanged', () => {
    expect(normalizePhone('03001234567')).toBe('03001234567');
  });
});
