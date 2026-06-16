// Shared domain types for TNB customer-web.

export type Category =
  | 'Appetizers'
  | 'Burgers'
  | 'Food Bank'
  | 'Pastas'
  | 'Pizza Regular v1'
  | 'Pizza Special'
  | 'Rolls & Wraps'
  | 'Sandwiches'
  | 'Drinks & Desserts';

export const CATEGORIES: Category[] = [
  'Appetizers',
  'Burgers',
  'Food Bank',
  'Pastas',
  'Pizza Regular v1',
  'Pizza Special',
  'Rolls & Wraps',
  'Sandwiches',
  'Drinks & Desserts',
];

// Raw row from menu_items (one row per SKU).
export interface MenuItem {
  id: string;
  sku: string;
  name: string;
  category: Category;
  price: number; // PKR integer
  image_url: string | null;
  description: string | null;
  available: boolean;
  sort_order: number;
}

// A pizza size option derived from a group of same-name pizza SKUs.
export type PizzaSize = 'S' | 'M' | 'L' | 'XL';

export interface SizeOption {
  size: PizzaSize;
  label: string;
  sku: string;
  price: number;
  available: boolean;
}

// A burger cheese variant derived from a group of same-name burger SKUs.
export type CheeseVariant = 'NC' | 'CH';

export interface VariantOption {
  variant: CheeseVariant;
  label: string;
  sku: string;
  price: number;
  available: boolean;
}

// A presentation card: either a plain item, a pizza (size picker),
// or a burger (cheese toggle).
export type MenuCard =
  | { kind: 'plain'; name: string; category: Category; item: MenuItem }
  | { kind: 'pizza'; name: string; category: Category; base: MenuItem; sizes: SizeOption[] }
  | { kind: 'burger'; name: string; category: Category; base: MenuItem; variants: VariantOption[] };

// Cart line — variant selection baked into a stable key.
export interface CartLine {
  key: string; // sku — uniquely identifies the chosen variant/size
  menu_item_id: string | null;
  name: string; // display name incl. size/cheese, e.g. "Chicken Tikka (Large)"
  price: number;
  quantity: number;
}
