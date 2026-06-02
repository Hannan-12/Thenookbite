import type { Category } from '@/lib/types';

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

// Per-item photos keyed by the (lowercased) menu item name.
// Falls back to a category default when a name isn't listed.
const BY_NAME: Record<string, string> = {
  // Appetizers
  'hot wings (6 pcs)': U('1608039755401-742074f0548d'),
  'chicken nuggets (8)': U('1562967914-608f82629710'),
  'french fries': U('1573080496219-bb080dd4f877'),
  'loaded fries': U('1630384060421-cb20d0e0649d'),
  'chicken broast': U('1626645738196-c2a7c87a8f58'),
  // Burgers
  'zinger burger': U('1568901346375-23c9450c58cd'),
  'grill burger': U('1571091718767-18b5b1457add'),
  'tower burger': U('1586190848861-99aa4a171e90'),
  // Food Bank (specialty pizzas)
  'kabab bite': U('1565299624946-b28f40a0ae38'),
  'crown star': U('1604068549290-dea0e4a305ca'),
  // Pastas
  'the nook bite special pasta': U('1551183053-bf91a1d81141'),
  'regular pasta': U('1621996346565-e3dbc646d9a9'),
  'creamy pasta': U('1645112411341-6c4fd023714a'),
  lasagna: U('1574894709920-11b28e7367e3'),
  // Pizza Regular
  'chicken tikka': U('1513104890138-7c749659a591'),
  'chicken fajita': U('1565299624946-b28f40a0ae38'),
  supreme: U('1574071318508-1cdbab80d002'),
  // Pizza Special
  'cheese lover': U('1593560708920-61dd98c46a4e'),
  'chicken lover': U('1628840042765-356cda07504e'),
  // Rolls & Wraps
  'hunger wrap': U('1626700051175-6818013e1d4f'),
  shawarma: U('1561651823-34feb02250e4'),
  'zinger roll': U('1559847844-5315695dadae'),
  'paratha roll': U('1633896949673-1eb9d131a9b4'),
};

const BY_CATEGORY: Record<Category, string> = {
  Appetizers: U('1576107232684-1279f390859f'),
  Burgers: U('1568901346375-23c9450c58cd'),
  'Food Bank': U('1565299624946-b28f40a0ae38'),
  Pastas: U('1551183053-bf91a1d81141'),
  'Pizza Regular': U('1513104890138-7c749659a591'),
  'Pizza Special': U('1593560708920-61dd98c46a4e'),
  'Rolls & Wraps': U('1626700051175-6818013e1d4f'),
};

/** Resolve the best image for a menu item: DB image → name match → category default. */
export function imageForItem(
  name: string,
  category: Category,
  dbImageUrl?: string | null,
): string {
  if (dbImageUrl) return dbImageUrl;
  return BY_NAME[name.toLowerCase()] ?? BY_CATEGORY[category];
}
