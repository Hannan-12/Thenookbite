# TNB (The Nook Bite) — Milestones Plan

Detailed, actionable breakdown of the 12-day sprint defined in [CLAUDE.md](CLAUDE.md).
Each milestone has **tasks**, an **acceptance criteria** checklist (Definition of Done), and **dependencies**.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## M0 — Foundations (Day 1)
**Goal:** Repo, services, and schema in place so all later work has a home.

### Tasks
- [ ] Init git repo + `.gitignore` (node, python, `.env*`, `.next`, `dist`, `__pycache__`)
- [ ] Create monorepo folders: `customer-web/`, `kitchen-display/`, `backend/`, `admin/` (or `customer-web/app/admin`)
- [ ] Create Supabase project; grab URL + anon key + service key
- [ ] Write `schema.sql` (profiles, menu_items, orders, order_items) + run it in Supabase
- [ ] Enable Row Level Security policies (read menu public; orders insert public; profiles owner-only)
- [ ] Create Stripe account (test mode); grab publishable + secret keys
- [ ] Create `.env` / `.env.local` files per CLAUDE.md for all three apps
- [ ] Seed `menu_items` with all 139 items (CSV → Supabase import or seed script)

### Acceptance Criteria
- [ ] `schema.sql` runs clean on a fresh Supabase DB
- [ ] All 139 menu items queryable via Supabase dashboard
- [ ] Pizza SKUs grouped correctly (4 sizes per pizza) and burger cheese variants present
- [ ] All env files exist and are git-ignored
- [ ] Repo pushes to remote

### Dependencies
None. **Blocks everything.**

---

## M1 — Backend API (Day 2)
**Goal:** All FastAPI endpoints live and tested.

### Tasks
- [ ] FastAPI app scaffold + CORS (`ALLOWED_ORIGINS`) + health check `GET /`
- [ ] Supabase client (service key) wired into backend
- [ ] Pydantic models: `MenuItem`, `OrderCreate`, `OrderItem`, `Order`, `StatusUpdate`
- [ ] **Menu:** `GET /menu`, `GET /menu?category=`, `PATCH /menu/{id}/availability`
- [ ] **Orders:** `POST /orders`, `GET /orders`, `GET /orders?status=`, `GET /orders?user_id=`, `GET /orders/{id}`, `PATCH /orders/{id}/status`
- [ ] **Auth helper:** `GET /me` (decode Supabase JWT)
- [ ] Order total computed/validated server-side (don't trust client total)
- [ ] Status transition validation (pending→preparing→ready→completed only)

### Acceptance Criteria
- [ ] Every endpoint returns correct shape, tested in Postman/curl
- [ ] `POST /orders` writes order + order_items atomically
- [ ] Invalid status transitions rejected with 4xx
- [ ] `GET /orders?status=pending,preparing` supports comma list (kitchen needs it)
- [ ] Bad payloads return 422 with clear errors

### Dependencies
M0 (schema + Supabase).

---

## M2 — Auth (Day 3)
**Goal:** Customers can sign up / log in; routes protected.

### Tasks
- [ ] `@supabase/ssr` client + server helpers in `customer-web`
- [ ] `/signup` page → create auth user + insert `profiles` row
- [ ] `/login` page (email + password)
- [ ] Logout action
- [ ] Middleware protecting `/profile`, `/my-orders`
- [ ] Guest checkout path preserved (user_id null)
- [ ] Admin email gate helper (`email === ADMIN_EMAIL`)

### Acceptance Criteria
- [ ] Sign up creates both auth user and profiles row
- [ ] Session persists across refresh (cookies)
- [ ] Protected routes redirect to `/login` when logged out
- [ ] Admin email check works for owner account
- [ ] Guest can still reach `/checkout`

### Dependencies
M0 (profiles table). Soft dep on M1 (`/me`).

---

## M3 — Menu UI (Day 4)
**Goal:** Customer can browse the full menu the way the brand intends.

### Tasks
- [ ] Tailwind theme tokens: red `#E4002B`, black `#1A1A1A`, gold `#FFD700`, backgrounds
- [ ] Fonts: Barlow Condensed (headings) + DM Sans (body)
- [ ] Homepage `/`: hero, featured deals, category nav
- [ ] `/menu` + `/menu/{category}`: category filter + search
- [ ] **Pizza card:** ONE card + S/M/L/XL size picker (not per-SKU)
- [ ] **Burger card:** ONE card + cheese toggle (+price delta)
- [ ] MenuItem card component (image, name, price, badge, add-to-cart)
- [ ] Loading + empty + error states

### Acceptance Criteria
- [ ] All 7 categories render with correct item counts
- [ ] Pizza size picker updates price (Regular/Special/Food Bank tables correct)
- [ ] Burger cheese toggle adjusts price
- [ ] Mobile responsive
- [ ] Sold-out (unavailable) items visibly disabled

### Dependencies
M1 (`GET /menu`). M0 (seed data).

---

## M4 — Cart + Checkout (Day 5)
**Goal:** Items go into a cart and through a checkout form.

### Tasks
- [ ] Zustand cart store (add/remove/qty/clear, persist to localStorage)
- [ ] Cart drawer/page `/cart` with line items + totals (PKR ints)
- [ ] `/checkout`: name, table number, special notes, payment method selector
- [ ] Client-side validation + running total
- [ ] Wire "Cash on Delivery" → `POST /orders`

### Acceptance Criteria
- [ ] Cart survives refresh
- [ ] Variant selections (size/cheese) tracked as distinct cart lines
- [ ] Totals match server calc
- [ ] COD order creates DB order with `payment_method=cash`, `payment_status=pending`
- [ ] Empty-cart state handled

### Dependencies
M3 (menu cards), M1 (`POST /orders`).

---

## M5 — Payments (Day 6)
**Goal:** Card payments via Stripe + confirmation page.

### Tasks
- [ ] `POST /payments/create-session` (Stripe Checkout session, success/cancel URLs)
- [ ] `POST /payments/webhook` with signature verification
- [ ] On `checkout.session.completed` → create order, `payment_status=paid`
- [ ] Frontend "Pay by Card" → redirect to Stripe → return to `/order-confirmation?id=`
- [ ] `/order-confirmation` page (order id + live status)
- [ ] `stripe listen` documented for local webhook testing

### Acceptance Criteria
- [ ] Test card completes and order appears as `paid`
- [ ] Webhook rejects unsigned/invalid events
- [ ] Cancel returns to checkout without orphan order
- [ ] Confirmation shows correct order + items
- [ ] No order created until payment confirmed (card path)

### Dependencies
M4 (checkout), M1 (orders). Stripe keys from M0.

---

## M6 — Kitchen Display (Day 7)
**Goal:** Kitchen screen shows live orders, survives power cuts.

### Tasks
- [ ] Vite + React app, dark theme, large readable text
- [ ] On load: `GET /orders?status=pending,preparing`
- [ ] Supabase Realtime subscription on orders → live inserts/updates
- [ ] Order card: last-6 id, items+qty, time placed, status
- [ ] Buttons: Start Preparing (pending→preparing), Mark Ready (preparing→ready)
- [ ] Reconnect banner ("Reconnected — syncing orders…") + re-fetch

### Acceptance Criteria
- [ ] New order appears within ~1s without refresh
- [ ] Status buttons update DB and reflect on other screens
- [ ] After reload (simulated power cut), all open orders re-render
- [ ] Realtime drop → reconnect banner → state re-syncs

### Dependencies
M1 (orders + status), Supabase Realtime (M0).

---

## M7 — Admin Panel (Day 8)
**Goal:** Owner manages orders + menu.

### Tasks
- [ ] Dark sidebar layout (red/white brand)
- [ ] `/admin/login` + owner email gate
- [ ] `/admin` dashboard: live counts by status + today's orders/revenue
- [ ] `/admin/orders` (realtime, filter by status) + `/admin/orders/{id}` (update status)
- [ ] `/admin/menu` list + availability toggle; `/admin/menu/{id}` edit name/price/desc/image
- [ ] Color-coded status badges

### Acceptance Criteria
- [ ] Non-owner redirected from all `/admin/*`
- [ ] Status updates reflect live on kitchen + admin
- [ ] Availability toggle hides item from customer menu
- [ ] Daily stats accurate for "today"

### Dependencies
M2 (admin gate), M1 (orders/menu), M6 patterns (realtime).

---

## M8 — Integration (Day 9)
**Goal:** Whole flow proven end-to-end.

### Tasks
- [ ] Full happy path: browse → cart → checkout → pay/COD → kitchen → admin complete
- [ ] Stripe webhook end-to-end test (paid order flows through)
- [ ] Auth edge cases: expired session, guest→login, double submit
- [ ] Concurrent orders / race on status updates
- [ ] CORS verified across all origins

### Acceptance Criteria
- [ ] Card and COD paths both complete cleanly
- [ ] Order visible to kitchen and admin in real time
- [ ] No duplicate orders on webhook retries (idempotent)
- [ ] Known edge cases documented

### Dependencies
M1–M7.

---

## M9 — Polish (Day 10)
**Goal:** Production-feel UX.

### Tasks
- [ ] Loading skeletons everywhere data loads
- [ ] Toasts (add to cart, order placed, errors)
- [ ] Empty states (empty cart, no orders, no menu results)
- [ ] Mobile responsive pass on every customer page
- [ ] Accessibility basics (focus, alt text, contrast)
- [ ] 404 / error boundaries

### Acceptance Criteria
- [ ] No raw spinners-of-nothing; every async state covered
- [ ] Works well on a phone viewport
- [ ] Errors never leave a dead-end screen

### Dependencies
M3–M7.

---

## M10 — Deploy (Day 11)
**Goal:** Everything live in production.

### Tasks
- [ ] Vercel: deploy `customer-web` (+ admin if same app) with env vars
- [ ] Vercel: deploy `kitchen-display` (or host on kitchen PC)
- [ ] Railway: deploy `backend` with env vars
- [ ] Point Stripe webhook to production URL + set live `STRIPE_WEBHOOK_SECRET`
- [ ] Update `ALLOWED_ORIGINS` + `NEXT_PUBLIC_API_URL` to prod
- [ ] Production smoke test of full flow

### Acceptance Criteria
- [ ] Customer site, kitchen, admin, backend all reachable on prod URLs
- [ ] Prod Stripe webhook receives + verifies events
- [ ] Real (test-mode) order completes in prod
- [ ] No secrets committed; all via env

### Dependencies
M8 (working system).

---

## M11 — Buffer & Handover (Day 12)
**Goal:** Fix prod bugs, demo, hand over.

### Tasks
- [ ] Fix bugs surfaced by prod smoke test
- [ ] Client demo run-through
- [ ] `README.md`: setup, run, deploy, env, admin account creation
- [ ] Handover notes (Supabase dashboard, Stripe dashboard, how to add menu items)

### Acceptance Criteria
- [ ] No known blocker bugs
- [ ] README lets a new dev run all apps locally
- [ ] Owner knows how to manage menu + view orders

### Dependencies
M10.

---

## Critical Path
`M0 → M1 → {M2, M3} → M4 → M5 → M6/M7 → M8 → M9 → M10 → M11`

## Out of Scope (Phase 2)
JazzCash/Easypaisa · sales charts · menu image-upload CRUD · saved addresses ·
push notifications · multi-branch · mobile app.
