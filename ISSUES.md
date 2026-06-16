# TNB — Pending Issues (Post-Audit)

Last audited: 2026-06-16 | Score: 8.2 / 10

---

## MEDIUM — Fix before go-live

### 1. Admin email exposed to browser
- **File:** `customer-web/app/login/page.tsx:34`
- **Problem:** `process.env.NEXT_PUBLIC_ADMIN_EMAIL` is a public env var — visible in DevTools to anyone
- **Fix:** Replace client-side email comparison with a server action or `/api/admin/verify` route that checks against `process.env.ADMIN_EMAIL` (server-only)

### 2. Unavailable pizza size removes entire card
- **File:** `customer-web/lib/menu.ts:55`
- **Problem:** `.eq('available', true)` filters at DB level. If one pizza size SKU is marked unavailable, the whole pizza card disappears instead of just disabling that size button
- **Fix:** Fetch all SKUs regardless of availability, filter per-size on the frontend (already handled in MenuCard — just needs the fetch to include unavailable rows)

### 3. Kitchen display — no READY column
- **File:** `customer-web/app/kitchen/KitchenDisplay.tsx:70`
- **Problem:** When kitchen marks an order "ready", the card vanishes. No visual that food is waiting for pickup
- **Fix:** Add a third READY column (or a bottom tray) showing ready orders until they're marked completed by front-of-house

---

## LOW — Polish when time allows

### 4. Custom tip truncates decimals, no max guard
- **File:** `customer-web/app/checkout/page.tsx:31`
- **Problem:** `parseInt(customTip)` silently drops decimals. No maximum value — user could type 9999999
- **Fix:** Use `Math.round(parseFloat(customTip) || 0)` and add `max="10000"` on the input

### 5. My Orders uses polling instead of Realtime
- **File:** `customer-web/app/my-orders/MyOrdersClient.tsx:33`
- **Problem:** `router.refresh()` every 30s — status updates lag up to 30 seconds
- **Fix:** Replace interval with Supabase Realtime subscription on `orders` table filtered by `user_id`

### 6. Menu category filter not synced to URL
- **File:** `customer-web/components/MenuBrowser.tsx:15`
- **Problem:** Selecting "Burgers" then refreshing reverts to "All" — state is not in the URL
- **Fix:** Use `router.push(?category=Burgers)` and read `searchParams` as initial state

### 7. Kitchen display doesn't show order type
- **File:** `customer-web/app/kitchen/KitchenDisplay.tsx:254`
- **Problem:** Kitchen sees items but not DINE-IN / TAKEAWAY / DELIVERY — doesn't know where food is going
- **Fix:** Add order type badge on each kitchen card (data already in `order.order_type`)
