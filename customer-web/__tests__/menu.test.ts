import { describe, it, expect } from 'vitest';
import { buildMenuCards, cardsByCategory } from '@/lib/menu';
import type { MenuItem, MenuCard, Category } from '@/lib/types';

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'id-1',
    sku: 'PLAIN-001',
    name: 'Test Item',
    category: 'Appetizers',
    price: 500,
    image_url: null,
    description: null,
    available: true,
    sort_order: 1,
    ...overrides,
  };
}

describe('buildMenuCards', () => {
  it('returns empty array for empty input', () => {
    expect(buildMenuCards([])).toEqual([]);
  });

  it('creates a plain card for a non-variant item', () => {
    const items = [makeItem({ sku: 'APP-wings', name: '10 x Wings' })];
    const cards = buildMenuCards(items);

    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe('plain');
    expect(cards[0].name).toBe('10 x Wings');
  });

  it('groups pizza SKUs into a single card with size picker', () => {
    const items = [
      makeItem({
        id: 'p1',
        sku: 'PZ-tikka-S',
        name: 'Chicken Tikka Pizza - Small',
        category: 'Pizza Regular v1',
        price: 500,
      }),
      makeItem({
        id: 'p2',
        sku: 'PZ-tikka-M',
        name: 'Chicken Tikka Pizza - Medium',
        category: 'Pizza Regular v1',
        price: 1000,
      }),
      makeItem({
        id: 'p3',
        sku: 'PZ-tikka-L',
        name: 'Chicken Tikka Pizza - Large',
        category: 'Pizza Regular v1',
        price: 1250,
      }),
      makeItem({
        id: 'p4',
        sku: 'PZ-tikka-XL',
        name: 'Chicken Tikka Pizza - X-Large',
        category: 'Pizza Regular v1',
        price: 1900,
      }),
    ];

    const cards = buildMenuCards(items);
    expect(cards).toHaveLength(1);

    const card = cards[0];
    expect(card.kind).toBe('pizza');
    if (card.kind === 'pizza') {
      expect(card.name).toBe('Chicken Tikka Pizza');
      expect(card.sizes).toHaveLength(4);
      expect(card.sizes[0].size).toBe('S');
      expect(card.sizes[0].price).toBe(500);
      expect(card.sizes[1].size).toBe('M');
      expect(card.sizes[2].size).toBe('L');
      expect(card.sizes[3].size).toBe('XL');
      expect(card.sizes[3].price).toBe(1900);
    }
  });

  it('groups burger SKUs into a single card with cheese toggle', () => {
    const items = [
      makeItem({
        id: 'b1',
        sku: 'BG-zinger-NC',
        name: 'Zinger Burger (No Cheese)',
        category: 'Burgers',
        price: 450,
      }),
      makeItem({
        id: 'b2',
        sku: 'BG-zinger-CH',
        name: 'Zinger Burger (Cheese)',
        category: 'Burgers',
        price: 500,
      }),
    ];

    const cards = buildMenuCards(items);
    expect(cards).toHaveLength(1);

    const card = cards[0];
    expect(card.kind).toBe('burger');
    if (card.kind === 'burger') {
      expect(card.name).toBe('Zinger Burger');
      expect(card.variants).toHaveLength(2);
      expect(card.variants[0].variant).toBe('NC');
      expect(card.variants[0].label).toBe('No Cheese');
      expect(card.variants[1].variant).toBe('CH');
      expect(card.variants[1].label).toBe('Cheese');
    }
  });

  it('handles a mix of plain, pizza, and burger items', () => {
    const items = [
      makeItem({ sku: 'APP-wings', name: 'Wings', category: 'Appetizers' }),
      makeItem({ id: 'p1', sku: 'PZ-fajita-S', name: 'Fajita Pizza - Small', category: 'Pizza Regular v1', price: 500 }),
      makeItem({ id: 'p2', sku: 'PZ-fajita-M', name: 'Fajita Pizza - Medium', category: 'Pizza Regular v1', price: 1000 }),
      makeItem({ id: 'b1', sku: 'BG-petti-NC', name: 'Petti Burger (No Cheese)', category: 'Burgers', price: 350 }),
      makeItem({ id: 'b2', sku: 'BG-petti-CH', name: 'Petti Burger (Cheese)', category: 'Burgers', price: 400 }),
    ];

    const cards = buildMenuCards(items);
    expect(cards).toHaveLength(3);

    const kinds = cards.map((c) => c.kind).sort();
    expect(kinds).toEqual(['burger', 'pizza', 'plain']);
  });

  it('sorts pizza sizes in correct order S < M < L < XL', () => {
    const items = [
      makeItem({ id: 'p1', sku: 'PZ-sup-XL', name: 'Supreme Pizza - X-Large', category: 'Pizza Regular v1', price: 1900 }),
      makeItem({ id: 'p2', sku: 'PZ-sup-S', name: 'Supreme Pizza - Small', category: 'Pizza Regular v1', price: 500 }),
      makeItem({ id: 'p3', sku: 'PZ-sup-L', name: 'Supreme Pizza - Large', category: 'Pizza Regular v1', price: 1250 }),
      makeItem({ id: 'p4', sku: 'PZ-sup-M', name: 'Supreme Pizza - Medium', category: 'Pizza Regular v1', price: 1000 }),
    ];

    const cards = buildMenuCards(items);
    const card = cards[0];
    if (card.kind === 'pizza') {
      expect(card.sizes.map((s) => s.size)).toEqual(['S', 'M', 'L', 'XL']);
    }
  });

  it('sorts burger variants by price (no cheese < cheese)', () => {
    const items = [
      makeItem({ id: 'b1', sku: 'BG-tower-CH', name: 'Tower Burger (Cheese)', category: 'Burgers', price: 700 }),
      makeItem({ id: 'b2', sku: 'BG-tower-NC', name: 'Tower Burger (No Cheese)', category: 'Burgers', price: 650 }),
    ];

    const cards = buildMenuCards(items);
    const card = cards[0];
    if (card.kind === 'burger') {
      expect(card.variants[0].variant).toBe('NC');
      expect(card.variants[1].variant).toBe('CH');
    }
  });
});

describe('cardsByCategory', () => {
  it('groups cards by category', () => {
    const cards: MenuCard[] = [
      { kind: 'plain', name: 'Wings', category: 'Appetizers', item: makeItem({ category: 'Appetizers' }) },
      { kind: 'plain', name: 'Fries', category: 'Appetizers', item: makeItem({ category: 'Appetizers' }) },
      { kind: 'plain', name: 'Wrap', category: 'Rolls & Wraps', item: makeItem({ category: 'Rolls & Wraps' }) },
    ];

    const map = cardsByCategory(cards);
    expect(map.get('Appetizers')).toHaveLength(2);
    expect(map.get('Rolls & Wraps')).toHaveLength(1);
    expect(map.get('Burgers')).toBeUndefined();
  });

  it('returns empty map for empty input', () => {
    const map = cardsByCategory([]);
    expect(map.size).toBe(0);
  });
});
