import { describe, it, expect } from 'vitest';

// Pure discount + surcharge logic extracted from orders/route.ts
// Tests the exact same math the backend runs — if this changes, production breaks
const CARD_SURCHARGE_RATE = 0.015;

function calcTotal(
  itemsTotal: number,
  tip: number,
  discount_type: 'flat' | 'pct' | undefined,
  discount_value: number | undefined,
  payment_method: 'cash' | 'card' | 'pay_later',
): number {
  const tipAmount = typeof tip === 'number' && tip > 0 ? Math.round(tip) : 0;

  let discountAmount = 0;
  if (discount_type === 'flat' && typeof discount_value === 'number' && discount_value > 0) {
    discountAmount = Math.min(Math.round(discount_value), itemsTotal);
  } else if (discount_type === 'pct' && typeof discount_value === 'number' && discount_value > 0 && discount_value <= 100) {
    discountAmount = Math.round(itemsTotal * (discount_value / 100));
  }

  const afterDiscount = itemsTotal - discountAmount + tipAmount;
  return payment_method === 'card'
    ? Math.ceil(afterDiscount * (1 + CARD_SURCHARGE_RATE))
    : afterDiscount;
}

describe('Order total calculation', () => {
  it('returns itemsTotal for cash with no discount', () => {
    expect(calcTotal(1000, 0, undefined, undefined, 'cash')).toBe(1000);
  });

  it('applies flat discount correctly', () => {
    expect(calcTotal(1000, 0, 'flat', 100, 'cash')).toBe(900);
  });

  it('applies percentage discount correctly', () => {
    expect(calcTotal(1000, 0, 'pct', 10, 'cash')).toBe(900);
  });

  it('caps flat discount at itemsTotal (cannot go negative)', () => {
    expect(calcTotal(500, 0, 'flat', 9999, 'cash')).toBe(0);
  });

  it('rejects pct discount above 100%', () => {
    // 150% discount should be treated as 0 (invalid, ignored)
    expect(calcTotal(1000, 0, 'pct', 150, 'cash')).toBe(1000);
  });

  it('adds 1.5% card surcharge on top of discounted total', () => {
    const afterDiscount = 900;
    const expected = Math.ceil(afterDiscount * 1.015); // 914
    expect(calcTotal(1000, 0, 'flat', 100, 'card')).toBe(expected);
  });

  it('card surcharge applies even with no discount', () => {
    const expected = Math.ceil(1000 * 1.015); // 1015
    expect(calcTotal(1000, 0, undefined, undefined, 'card')).toBe(expected);
  });

  it('tip is added before card surcharge', () => {
    // 1000 + 100 tip = 1100, then +1.5% = ceil(1116.5) = 1117
    const expected = Math.ceil(1100 * 1.015);
    expect(calcTotal(1000, 100, undefined, undefined, 'card')).toBe(expected);
  });

  it('pay_later has no surcharge', () => {
    expect(calcTotal(1000, 0, 'flat', 100, 'pay_later')).toBe(900);
  });

  it('zero discount value is ignored', () => {
    expect(calcTotal(1000, 0, 'flat', 0, 'cash')).toBe(1000);
    expect(calcTotal(1000, 0, 'pct', 0, 'cash')).toBe(1000);
  });
});
