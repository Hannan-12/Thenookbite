import { createClient } from '@/lib/supabase/server';
import type {
  Category,
  MenuCard,
  MenuItem,
  PizzaSize,
  SizeOption,
  VariantOption,
} from '@/lib/types';

const SIZE_ORDER: Record<PizzaSize, number> = { S: 0, M: 1, L: 2, XL: 3 };
const SIZE_LABEL: Record<PizzaSize, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'X-Large',
};

// Parse the trailing size token from a pizza SKU, e.g. "PZ-tikka-XL" -> "XL".
function pizzaSizeFromSku(sku: string): PizzaSize | null {
  const token = sku.split('-').pop()?.toUpperCase();
  if (token === 'S' || token === 'M' || token === 'L' || token === 'XL') return token;
  return null;
}

// Parse the trailing cheese token from a burger SKU, e.g. "BG-zinger-CH" -> "CH".
function cheeseFromSku(sku: string): 'NC' | 'CH' | null {
  const token = sku.split('-').pop()?.toUpperCase();
  if (token === 'NC' || token === 'CH') return token;
  return null;
}

// SKU minus its trailing variant token — the stable grouping key.
// "PZ-pizzatikka-XL" -> "PZ-pizzatikka"; "burzinger-CH" -> "burzinger".
function skuBase(sku: string): string {
  return sku.replace(/-(S|M|L|XL|NC|CH)$/i, '');
}

// Strip size/cheese suffixes from a name for a clean card title.
// "Chicken Tikka Pizza - Small" -> "Chicken Tikka Pizza"
// "Zinger Burger (No Cheese)"   -> "Zinger Burger"
function cleanName(name: string): string {
  return name
    .replace(/\s*-\s*(Small|Medium|Large|X-Large)\s*$/i, '')
    .replace(/\s*\((No Cheese|Cheese)\)\s*$/i, '')
    .trim();
}

/** Fetch all available menu items from Supabase, ordered for display. */
export async function fetchMenuItems(): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load menu: ${error.message}`);
  return (data ?? []) as MenuItem[];
}

/**
 * Group raw per-SKU rows into presentation cards.
 *   • Pizza categories  → one card per name with a size picker.
 *   • Burgers           → one card per name with a cheese toggle.
 *   • Everything else   → one card per item.
 */
export function buildMenuCards(items: MenuItem[]): MenuCard[] {
  const cards: MenuCard[] = [];
  const pizzaGroups = new Map<string, MenuItem[]>();
  const burgerGroups = new Map<string, MenuItem[]>();

  // Group by SKU pattern, not category: any "-S/-M/-L/-XL" SKU is a sized card
  // (size picker), any "-NC/-CH" SKU is a cheese card (toggle). Covers pizzas,
  // pastas, rolls and burgers uniformly.
  for (const item of items) {
    if (pizzaSizeFromSku(item.sku)) {
      const key = skuBase(item.sku);
      (pizzaGroups.get(key) ?? pizzaGroups.set(key, []).get(key)!).push(item);
    } else if (cheeseFromSku(item.sku)) {
      const key = skuBase(item.sku);
      (burgerGroups.get(key) ?? burgerGroups.set(key, []).get(key)!).push(item);
    } else {
      cards.push({ kind: 'plain', name: item.name, category: item.category, item });
    }
  }

  for (const group of pizzaGroups.values()) {
    const sizes: SizeOption[] = group
      .map((it): SizeOption | null => {
        const size = pizzaSizeFromSku(it.sku);
        if (!size) return null;
        return {
          size,
          label: SIZE_LABEL[size],
          sku: it.sku,
          price: it.price,
          available: it.available,
        };
      })
      .filter((s): s is SizeOption => s !== null)
      .sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size]);

    const base = group[0];
    cards.push({
      kind: 'pizza',
      name: cleanName(base.name),
      category: base.category,
      base,
      sizes,
    });
  }

  for (const group of burgerGroups.values()) {
    const variants: VariantOption[] = group
      .map((it): VariantOption | null => {
        const variant = cheeseFromSku(it.sku);
        if (!variant) return null;
        return {
          variant,
          label: variant === 'CH' ? 'Cheese' : 'No Cheese',
          sku: it.sku,
          price: it.price,
          available: it.available,
        };
      })
      .filter((v): v is VariantOption => v !== null)
      .sort((a, b) => a.price - b.price);

    const base = group[0];
    cards.push({
      kind: 'burger',
      name: cleanName(base.name),
      category: base.category,
      base,
      variants,
    });
  }

  return cards;
}

/** Cards grouped by category, preserving CLAUDE.md category order. */
export function cardsByCategory(cards: MenuCard[]): Map<Category, MenuCard[]> {
  const map = new Map<Category, MenuCard[]>();
  for (const card of cards) {
    (map.get(card.category) ?? map.set(card.category, []).get(card.category)!).push(card);
  }
  return map;
}
