#!/usr/bin/env python3
"""
Parse HC_All_Products.html (WooCommerce export) into db/seed.sql for TNB.

Rules:
  • Only emit rows that have a real price (skip price-less 'variable' parents).
  • Map source categories -> the 7 frontend categories.
  • Re-key SKUs to the conventions the frontend grouping expects:
      - pizzas:  PZ-<slug>-<S|M|L|XL>
      - burgers/rolls cheese: keep -NC / -CH suffix
      - everything else: a stable unique slug
  • Pizza size grouping relies on the trailing -S/-M/-L/-XL token.
"""
import html
import re
import sys
from pathlib import Path

SRC = Path(__file__).parent / "HC_All_Products.html"
OUT = Path(__file__).parents[1] / "seed.sql"

# Source category header -> frontend Category
CAT_MAP = {
    "Appetizers": "Appetizers",
    "Burgers": "Burgers",
    "Food Bank": "Food Bank",
    "Pastas": "Pastas",
    "Pizza Regular v1": "Pizza Regular",
    "Pizza Special": "Pizza Special",
    "Rolls & Wraps": "Rolls & Wraps",
}

PIZZA_CATS = {"Food Bank", "Pizza Regular", "Pizza Special"}
SIZE_TOKENS = {"SMALL": "S", "MEDIUM": "M", "LARGE": "L", "X-LARGE": "XL"}


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).strip()
    # The export mangled the em-dash placeholder; treat it as empty.
    if text in ("", "Ã¢â¬â", "—", "–"):
        return ""
    return text


def rebrand(text: str) -> str:
    """Replace the old 'Hunger Crave' brand with 'The Nook Bite'."""
    text = text.replace("Hunger Crave Special", "The Nook Bite Special")
    text = text.replace("Hunger Wrap", "TNB Wrap")
    return text


def parse():
    raw = SRC.read_text(encoding="utf-8", errors="replace")

    # Split into category blocks.
    blocks = re.split(r'<div class="category">', raw)[1:]
    rows = []  # (sku, name, category, price, description, sort)
    sort = 0

    for block in blocks:
        m = re.search(r'category-header">([^<]+?)\s*<span', block)
        if not m:
            continue
        src_cat = clean(m.group(1))
        category = CAT_MAP.get(src_cat)
        if not category:
            print(f"  ! unmapped category: {src_cat}", file=sys.stderr)
            continue

        for tr in re.split(r"<tr>", block)[1:]:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if len(cells) < 4:
                continue
            sku = clean(cells[0])
            name = rebrand(clean(cells[1]))
            desc = rebrand(clean(cells[2]))
            price_raw = clean(cells[3])

            if not sku or not name:
                continue
            # Keep only priced rows.
            price_digits = re.sub(r"[^\d]", "", price_raw)
            if not price_digits:
                continue
            price = int(price_digits)

            sort += 10
            rows.append((sku, name, category, price, desc, sort))

    return rows


def reslug(sku: str, name: str, category: str) -> str:
    """Re-key SKU so the frontend grouping works."""
    up = sku.upper()

    def debrand(s: str) -> str:
        return s[2:] if s.startswith("hc") else s

    # Pizza size token at the end?
    if category in PIZZA_CATS:
        for token, short in (("-XL", "XL"), ("-L", "L"), ("-M", "M"), ("-S", "S")):
            if up.endswith(token):
                base = sku[: -len(token)]
                base_slug = debrand(re.sub(r"[^A-Za-z0-9]+", "", base).lower())
                return f"PZ-{base_slug}-{short}"

    # Cheese variants (burgers / rolls)
    if up.endswith("-NC"):
        base = debrand(re.sub(r"[^A-Za-z0-9]+", "", sku[:-3]).lower())
        return f"{base}-NC"
    if up.endswith("-CH"):
        base = debrand(re.sub(r"[^A-Za-z0-9]+", "", sku[:-3]).lower())
        return f"{base}-CH"

    # Plain item — stable slug from original sku.
    slug = re.sub(r"[^A-Za-z0-9]+", "-", sku).strip("-").lower()
    return slug.replace("hc-", "tnb-", 1) if slug.startswith("hc-") else slug


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main():
    rows = parse()

    # Re-key SKUs and de-dupe.
    seen = {}
    final = []
    for sku, name, category, price, desc, sort in rows:
        new_sku = reslug(sku, name, category)
        if new_sku in seen:
            new_sku = f"{new_sku}-{sort}"  # guarantee uniqueness
        seen[new_sku] = True
        final.append((new_sku, name, category, price, desc, sort))

    # Report counts per category.
    from collections import Counter
    counts = Counter(r[2] for r in final)
    print("Priced rows per category:", file=sys.stderr)
    for cat, n in sorted(counts.items()):
        print(f"  {cat}: {n}", file=sys.stderr)
    print(f"  TOTAL: {len(final)}", file=sys.stderr)

    lines = [
        "-- TNB (The Nook Bite) — Full Menu Seed",
        "-- Auto-generated from HC_All_Products.html by db/source/parse_menu.py",
        "-- Run AFTER schema.sql in the Supabase SQL editor.",
        "",
        "truncate public.menu_items restart identity cascade;",
        "",
        "insert into public.menu_items (sku, name, category, price, description, sort_order) values",
    ]
    values = []
    for new_sku, name, category, price, desc, sort in final:
        desc_sql = "null" if not desc else f"'{sql_escape(desc)}'"
        values.append(
            f"('{sql_escape(new_sku)}', '{sql_escape(name)}', "
            f"'{sql_escape(category)}', {price}, {desc_sql}, {sort})"
        )
    lines.append(",\n".join(values) + ";")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {OUT} ({len(final)} items)", file=sys.stderr)


if __name__ == "__main__":
    main()
