import { describe, it, expect } from 'vitest';
import { imageForItem } from '@/lib/itemImages';

describe('imageForItem', () => {
  it('returns dbImageUrl when provided', () => {
    const url = 'https://example.com/img.jpg';
    expect(imageForItem('Wings', 'Appetizers', url)).toBe(url);
  });

  it('returns exact name match from BY_NAME', () => {
    const result = imageForItem('10 x Wings', 'Appetizers', null);
    expect(result).toContain('unsplash.com');
    expect(result).toContain('1608039755401');
  });

  it('normalises name by stripping size suffix before lookup', () => {
    const result = imageForItem('Chicken Tikka Pizza - Small', 'Pizza Regular v1', null);
    expect(result).toContain('unsplash.com');
    expect(result).toContain('1513104890138');
  });

  it('normalises name by stripping cheese variant before lookup', () => {
    const result = imageForItem('Zinger Burger (No Cheese)', 'Burgers', null);
    expect(result).toContain('unsplash.com');
    expect(result).toContain('1568901346375');
  });

  it('falls back to category image if name not in BY_NAME', () => {
    const result = imageForItem('Nonexistent Item XYZ', 'Burgers', null);
    expect(result).toContain('unsplash.com');
    // Burgers category image
    expect(result).toContain('1568901346375');
  });

  it('returns category fallback for all valid categories', () => {
    const categories = [
      'Appetizers',
      'Burgers',
      'Food Bank',
      'Pastas',
      'Pizza Regular v1',
      'Pizza Special',
      'Rolls & Wraps',
      'Sandwiches',
      'Drinks & Desserts',
    ] as const;

    for (const cat of categories) {
      const result = imageForItem('unknown-item-zzz', cat, null);
      expect(result).toContain('unsplash.com');
    }
  });

  it('handles case-insensitive name lookup', () => {
    const result = imageForItem('LOADED FRIES', 'Appetizers', null);
    expect(result).toContain('unsplash.com');
    expect(result).toContain('1630384060421');
  });
});
