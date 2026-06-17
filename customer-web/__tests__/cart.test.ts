import { describe, it, expect, beforeEach } from 'vitest';
import { useCart } from '@/store/cart';
import { act } from '@testing-library/react';

describe('useCart store', () => {
  beforeEach(() => {
    // Reset store between tests
    act(() => {
      useCart.setState({ lines: [] });
    });
  });

  describe('addLine', () => {
    it('adds a new line with default quantity 1', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'PZ-tikka-M',
          menu_item_id: 'item-1',
          name: 'Chicken Tikka Pizza (Medium)',
          price: 1000,
        });
      });

      const { lines } = useCart.getState();
      expect(lines).toHaveLength(1);
      expect(lines[0].key).toBe('PZ-tikka-M');
      expect(lines[0].quantity).toBe(1);
      expect(lines[0].price).toBe(1000);
    });

    it('adds a new line with specified quantity', () => {
      act(() => {
        useCart.getState().addLine(
          {
            key: 'PZ-tikka-L',
            menu_item_id: 'item-2',
            name: 'Chicken Tikka Pizza (Large)',
            price: 1250,
          },
          3,
        );
      });

      const { lines } = useCart.getState();
      expect(lines).toHaveLength(1);
      expect(lines[0].quantity).toBe(3);
    });

    it('increments quantity for an existing line', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'BG-zinger-NC',
          menu_item_id: 'item-3',
          name: 'Zinger Burger (No Cheese)',
          price: 450,
        });
      });
      act(() => {
        useCart.getState().addLine({
          key: 'BG-zinger-NC',
          menu_item_id: 'item-3',
          name: 'Zinger Burger (No Cheese)',
          price: 450,
        });
      });

      const { lines } = useCart.getState();
      expect(lines).toHaveLength(1);
      expect(lines[0].quantity).toBe(2);
    });

    it('increments by specified qty for existing line', () => {
      act(() => {
        useCart.getState().addLine(
          { key: 'fries-1', menu_item_id: 'item-4', name: 'Fries', price: 200 },
          2,
        );
      });
      act(() => {
        useCart.getState().addLine(
          { key: 'fries-1', menu_item_id: 'item-4', name: 'Fries', price: 200 },
          3,
        );
      });

      expect(useCart.getState().lines[0].quantity).toBe(5);
    });
  });

  describe('removeLine', () => {
    it('removes a line by key', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'item-a',
          menu_item_id: '1',
          name: 'Item A',
          price: 100,
        });
        useCart.getState().addLine({
          key: 'item-b',
          menu_item_id: '2',
          name: 'Item B',
          price: 200,
        });
      });

      act(() => {
        useCart.getState().removeLine('item-a');
      });

      const { lines } = useCart.getState();
      expect(lines).toHaveLength(1);
      expect(lines[0].key).toBe('item-b');
    });

    it('does nothing if key not found', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'item-a',
          menu_item_id: '1',
          name: 'Item A',
          price: 100,
        });
      });

      act(() => {
        useCart.getState().removeLine('nonexistent');
      });

      expect(useCart.getState().lines).toHaveLength(1);
    });
  });

  describe('setQuantity', () => {
    it('updates quantity for an existing line', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'item-x',
          menu_item_id: '1',
          name: 'Item X',
          price: 300,
        });
      });

      act(() => {
        useCart.getState().setQuantity('item-x', 5);
      });

      expect(useCart.getState().lines[0].quantity).toBe(5);
    });

    it('removes item when quantity set to 0', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'item-x',
          menu_item_id: '1',
          name: 'Item X',
          price: 300,
        });
      });

      act(() => {
        useCart.getState().setQuantity('item-x', 0);
      });

      expect(useCart.getState().lines).toHaveLength(0);
    });

    it('removes item when quantity set to negative', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'item-x',
          menu_item_id: '1',
          name: 'Item X',
          price: 300,
        });
      });

      act(() => {
        useCart.getState().setQuantity('item-x', -1);
      });

      expect(useCart.getState().lines).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('removes all lines', () => {
      act(() => {
        useCart.getState().addLine({
          key: 'a',
          menu_item_id: '1',
          name: 'A',
          price: 100,
        });
        useCart.getState().addLine({
          key: 'b',
          menu_item_id: '2',
          name: 'B',
          price: 200,
        });
      });

      act(() => {
        useCart.getState().clear();
      });

      expect(useCart.getState().lines).toHaveLength(0);
    });
  });

  describe('totalItems', () => {
    it('returns 0 for empty cart', () => {
      expect(useCart.getState().totalItems()).toBe(0);
    });

    it('sums quantities across lines', () => {
      act(() => {
        useCart.getState().addLine(
          { key: 'a', menu_item_id: '1', name: 'A', price: 100 },
          2,
        );
        useCart.getState().addLine(
          { key: 'b', menu_item_id: '2', name: 'B', price: 200 },
          3,
        );
      });

      expect(useCart.getState().totalItems()).toBe(5);
    });
  });

  describe('totalPrice', () => {
    it('returns 0 for empty cart', () => {
      expect(useCart.getState().totalPrice()).toBe(0);
    });

    it('computes price * quantity for all lines', () => {
      act(() => {
        useCart.getState().addLine(
          { key: 'a', menu_item_id: '1', name: 'A', price: 500 },
          2,
        );
        useCart.getState().addLine(
          { key: 'b', menu_item_id: '2', name: 'B', price: 1000 },
          1,
        );
      });

      // 500*2 + 1000*1 = 2000
      expect(useCart.getState().totalPrice()).toBe(2000);
    });
  });
});
