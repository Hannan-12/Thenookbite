# TNB — Engineering Issues & Review

Last audited: 2026-06-22 | Overall Score: **6.2 / 10**

---

## Scorecard

| Area | Score | Note |
|---|---|---|
| Architecture | 7/10 | Clean structure, good separation |
| Security | 3/10 | Critical holes — see below |
| Data Integrity | 5/10 | Race conditions, no transactions |
| Frontend / POS UX | 8/10 | Strong, offline queue is smart |
| Performance | 6/10 | Unbounded queries will hurt at scale |
| Testing | 0/10 | Zero tests anywhere |
| Documentation | 2/10 | No API docs |
| Deployability | 6/10 | Missing env validation, no health checks |

---

## 🔴 CRITICAL — Fix before any real money goes through

### 1. Order creation has no authentication
- **File:** `customer-web/app/api/orders/route.ts:7`
- **Problem:** `POST /api/orders` has zero auth check. Any person on the internet can create orders, impersonate any staff member, or manipulate totals. No session is validated.
- **Fix:** Add staff session check. Verify `staff_id` in the body matches the authenticated user making the request.

### 2. `override_total` is a payment bypass
- **File:** `customer-web/app/api/orders/route.ts:38`
- **Problem:** The discount and card surcharge system sends `override_total` from the client. The backend accepts any value `>= itemsTotal`. A tampered terminal can remove the card surcharge or set any price.
- **Fix:** Remove `override_total`. Backend should receive `discount_type` + `discount_value` and calculate the final total server-side.

### 3. Stock deduction has a race condition
- **File:** `customer-web/app/api/orders/route.ts:107`
- **Problem:** Read `stock_qty` then write `stock_qty - amount` are two separate queries. Two simultaneous orders for the same item both read the same value and both succeed — causing negative stock.
- **Fix:** Use a single atomic SQL update:
  ```sql
  UPDATE ingredients SET stock_qty = stock_qty - $amount
  WHERE id = $id AND stock_qty >= $amount
  ```
  If 0 rows updated, the item is out of stock.

### 4. Customer phone lookup is unauthenticated
- **File:** `customer-web/app/api/customer-lookup/route.ts`
- **Problem:** `GET /api/customer-lookup?phone=03001234567` requires no auth and no rate limit. Returns customer name and full order history. Anyone can enumerate the entire customer database by iterating phone numbers.
- **Fix:** Require a valid staff session on this endpoint.

---

## 🟠 HIGH — Fix before real production load

### 5. No rate limiting on any endpoint
- **File:** All `POST` / `PATCH` routes under `customer-web/app/api/`
- **Problem:** No protection against brute force (PIN guessing on check-in), spam order creation, or scraping.
- **Fix:** Add rate limiting via Upstash Redis or Vercel KV. Start with check-in (5 attempts / min) and order creation (30 / min per IP).

### 6. No database transaction for order creation
- **File:** `customer-web/app/api/orders/route.ts:45`
- **Problem:** Order creation does three separate writes — `orders`, `order_items`, `stock_movements`. A server crash between any two leaves the database in an inconsistent state (order with no items, stock not deducted, etc.).
- **Fix:** Wrap in a Supabase RPC (Postgres function) so all three writes succeed or all fail together.

### 7. No idempotency on order creation
- **File:** `customer-web/app/api/orders/route.ts`
- **Problem:** If the network drops after the server creates the order but before the client gets the response, the POS retries and creates a duplicate order.
- **Fix:** Generate a UUID on the client before posting, send as `idempotency_key`. Backend checks for existing key before inserting. Returns the existing order if found.

### 8. Check-in photos are public forever
- **File:** `customer-web/app/api/checkin/upload/route.ts`
- **Problem:** The `attendance-photos` Supabase Storage bucket is public. URLs never expire. A staff photo URL from 6 months ago is accessible to anyone who has or guesses the URL.
- **Fix:** Set object lifecycle rules in Supabase Storage (e.g. delete after 90 days), or generate signed URLs with expiry when viewing in admin instead of storing the public URL.

### 9. Cancelled order filtering is scattered across 8+ files
- **File:** Multiple route files under `customer-web/app/api/admin/`
- **Problem:** Every report route manually adds `.neq('status', 'cancelled')`. Any new route added tomorrow will likely forget this, causing cancelled orders to appear in revenue again.
- **Fix:** Create a Postgres view:
  ```sql
  CREATE VIEW active_orders AS
    SELECT * FROM orders WHERE status != 'cancelled';
  ```
  All report routes query `active_orders` instead of `orders`.

### 10. POS Terminal is a 1,600-line monolithic component
- **File:** `customer-web/app/pos/POSTerminal.tsx`
- **Problem:** 30+ `useState` hooks, offline queue logic, payment modal, cash drawer, discount, form state — all in one component. When something breaks during service this is extremely hard to debug.
- **Fix:** Extract into custom hooks (`useOrderForm`, `useSessionOrders`, `useOfflineQueue`) and sub-components (`POSCart`, `PaymentModal`, `SessionPanel`, `DiscountRow`).

### 11. Offline queue uses localStorage instead of IndexedDB
- **File:** `customer-web/app/pos/POSTerminal.tsx` (offline queue section)
- **Problem:** `localStorage` is synchronous, size-limited (~5 MB), and can be lost on a hard browser crash. For a POS system handling real money, this is not reliable enough.
- **Fix:** Replace with IndexedDB (or the `idb` library) which is async, handles larger payloads, and survives browser crashes properly.

### 12. Both polling AND Realtime subscriptions running simultaneously
- **File:** `customer-web/app/admin/orders/AdminOrdersClient.tsx:51`
- **Problem:** Every Supabase Realtime event triggers a full orders fetch, and then 30 seconds later another fetch fires from the poll interval. Every order change causes two network requests.
- **Fix:** Remove the `setInterval` poll. Rely only on Realtime. Add a manual REFRESH button as backup.

---

## 🟡 MEDIUM — Fix within first month of operation

### 13. Unbounded query results — no pagination
- **File:** `customer-web/app/api/orders/route.ts:137`, `customer-web/app/api/admin/reports/route.ts`
- **Problem:** `GET /api/orders` fetches every order including all nested `order_items` with no `.limit()`. On a busy day with 500+ orders this will time out or return multi-MB responses.
- **Fix:** Add `limit=100` default, support `cursor`-based pagination via `created_at` or `id`.

### 14. N+1 query in dashboard staff stats
- **File:** `customer-web/app/api/admin/dashboard/route.ts:39`
- **Problem:** Staff stats loop iterates over staff IDs but the `.in('id', staffIds)` query is called for each member individually instead of once for all.
- **Fix:** Collect all `staffIds` first, fire one `.in()` query, then map results.

### 15. Timezone is manually calculated
- **File:** `customer-web/app/api/checkin/route.ts:26`
- **Problem:** `Date.now() + 5 * 60 * 60 * 1000` is hardcoded UTC+5. Doesn't handle any edge cases and is invisible to future maintainers.
- **Fix:** Use `Intl.DateTimeFormat` with `Asia/Karachi` timezone, or a lightweight library like `date-fns-tz`.

### 16. No environment variable validation at startup
- **File:** `customer-web/lib/supabase/service.ts`
- **Problem:** `process.env.SUPABASE_SERVICE_KEY!` — the `!` silences TypeScript but if the var is missing at runtime, you get a confusing crash deep inside a request handler instead of a clear startup error.
- **Fix:**
  ```ts
  function requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`Missing required env var: ${key}`);
    return v;
  }
  ```

### 17. Admin email check is hardcoded single-user
- **File:** `customer-web/lib/admin-auth.ts`
- **Problem:** Single `ADMIN_EMAIL` env var check. No role-based access. Can't have multiple admins or managers with different permissions.
- **Fix (short-term):** Add `admin_role` column to `profiles` table (`owner` / `manager` / `cashier`). Check role instead of email.

### 18. No error boundary on POS Terminal
- **File:** `customer-web/app/pos/POSTerminal.tsx`
- **Problem:** If any render error occurs during service (e.g. a null order in `sessionOrders`), React crashes the entire POS screen with no recovery path.
- **Fix:** Wrap in an `ErrorBoundary` component with a "Reload POS" fallback button.

### 19. Inconsistent API error response format
- **File:** Various routes — some return `{ detail: '...' }`, some return `{ error: '...' }`, some return raw strings.
- **Problem:** Client-side error handling has to guess which shape it'll get.
- **Fix:** Standardise to `{ detail: string }` (already the majority pattern) across all routes.

### 20. Magic numbers scattered through codebase
- **File:** `customer-web/app/pos/POSTerminal.tsx:296`, various
- **Problem:** `1.015`, `[500, 1000, 2000, 5000]`, `30_000` (poll interval) — no explanation of where they come from.
- **Fix:** Extract to named constants at the top of each file:
  ```ts
  const CARD_SURCHARGE_RATE = 0.015; // 1.5% per bank agreement
  const QUICK_CASH_NOTES = [500, 1000, 2000, 5000]; // PKR denominations
  ```

---

## 🔵 LOW — Polish when time allows

### 21. Admin email exposed to browser
- **File:** `customer-web/app/login/page.tsx:34`
- **Problem:** `NEXT_PUBLIC_ADMIN_EMAIL` is visible in DevTools to anyone.
- **Fix:** Replace with a server action or `/api/admin/verify` route that checks against server-only `ADMIN_EMAIL`.

### 22. Unavailable pizza size removes entire card
- **File:** `customer-web/lib/menu.ts:55`
- **Problem:** `.eq('available', true)` filters at DB level. If one size SKU is marked unavailable, the whole pizza card disappears.
- **Fix:** Fetch all SKUs, filter per-size on the frontend and disable unavailable size buttons instead of hiding the card.

### 23. Kitchen display — no READY tray
- **File:** `customer-web/app/kitchen/KitchenDisplay.tsx:70`
- **Problem:** When kitchen marks an order "ready" the card vanishes. No visual that food is sitting waiting for pickup.
- **Fix:** Add a READY column or bottom tray showing ready orders until front-of-house marks them completed.

### 24. My Orders uses 30s polling instead of Realtime
- **File:** `customer-web/app/my-orders/MyOrdersClient.tsx:33`
- **Problem:** Status updates lag up to 30 seconds.
- **Fix:** Replace interval with Supabase Realtime subscription filtered by `user_id`.

### 25. Menu category filter not synced to URL
- **File:** `customer-web/components/MenuBrowser.tsx:15`
- **Problem:** Selecting "Burgers" then refreshing reverts to "All".
- **Fix:** Use `router.push(?category=Burgers)` and read `searchParams` as initial state.

### 26. Kitchen display doesn't show order type
- **File:** `customer-web/app/kitchen/KitchenDisplay.tsx:254`
- **Problem:** Kitchen sees items but not DINE-IN / TAKEAWAY / DELIVERY.
- **Fix:** Add order type badge on each card (data already in `order.order_type`).

### 27. Custom tip has no max guard
- **File:** `customer-web/app/checkout/page.tsx:31`
- **Problem:** `parseInt(customTip)` silently drops decimals. No maximum — user could type 9999999.
- **Fix:** Use `Math.round(parseFloat(customTip) || 0)` and add `max="10000"` on the input.

### 28. No soft deletes or audit trail
- **Problem:** When an order or staff record is deleted it's gone permanently. No log of who changed what or when.
- **Fix:** Add `deleted_at TIMESTAMPTZ` columns (soft delete). Create an `audit_logs` table tracking all INSERT/UPDATE/DELETE with user and timestamp.

### 29. No health check endpoint
- **Problem:** No way for Vercel or an uptime monitor to verify the app and database are responding.
- **Fix:**
  ```ts
  // /app/api/health/route.ts
  export async function GET() {
    await db.from('orders').select('id').limit(1);
    return NextResponse.json({ status: 'ok' });
  }
  ```

### 30. No refund / return mechanism
- **Problem:** Once an order is paid there is no way to issue a refund or return items from the system.
- **Fix (Phase 2):** Create a `refunds` table. Add a REFUND button on admin order detail for completed cash orders.

---

## Immediate Priority (First Sprint)

| # | Issue | Est. Time |
|---|---|---|
| 1 | Auth on `POST /api/orders` | 2 hrs |
| 2 | Remove `override_total`, calculate server-side | 3 hrs |
| 3 | Atomic stock deduction | 2 hrs |
| 4 | Auth on customer-lookup | 1 hr |
| 5 | Rate limiting (Upstash or Vercel KV) | 4 hrs |
| 6 | DB transaction via Supabase RPC | 4 hrs |
| 7 | Idempotency key on orders | 2 hrs |
| 8 | Photo URL expiry | 30 min |
| 9 | `active_orders` Postgres view | 30 min |
| 10 | Env var validation at startup | 1 hr |

**Total: ~20 hours** of focused engineering work. After this the system is genuinely production-safe.

---

*Generated: 2026-06-22 | Reviewed by: Claude Sonnet 4.6*
