# TNB (The Nook Bite) Restaurant POS System

## Project Overview
Full-stack fast food restaurant system for **TNB (The Nook Bite)** — a local Pakistani restaurant.
12-day sprint. Built by one developer using Claude Code.

## Monorepo Structure
```
/restaurant-app
  /customer-web       → Next.js 14 (customer ordering + auth)
  /kitchen-display    → React + Vite (kitchen screen)
  /backend            → FastAPI Python
  /admin              → Next.js 14 (owner admin panel) OR /customer-web/app/admin route
  CLAUDE.md
  schema.sql
```

## Tech Stack
| Layer | Tech |
|---|---|
| Customer Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Kitchen Display | React + Vite, TypeScript |
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email + password) |
| Realtime | Supabase Realtime WebSocket |
| Payments | Stripe (cards) + Cash on Delivery |
| Deployment | Vercel (frontends) + Railway (backend) |

## Brand & Design
- **Brand name:** TNB / The Nook Bite
- **Primary:** #E4002B (bold red)
- **Secondary:** #1A1A1A (near black)
- **Accent/CTA:** #FFD700 (gold yellow)
- **Background:** Dark hero #0A0A0A, light sections #F5F5F5
- **Font heading:** Barlow Condensed (bold, condensed — import from Google Fonts)
- **Font body:** DM Sans
- **Style:** Bold, high-contrast, food photography heavy, dark heroes, red category badges

---

## Menu Categories (7 total, 139 items)
1. **Appetizers** — Wings, Nuggets, Fries, Loaded Fries, Broast (12 items)
2. **Burgers** — Zinger, Petti, Grill, Tower, Double Decker, Pizza Burger, Lawa, etc. (19 items)
3. **Food Bank** — Specialty pizzas: Kabab Bite, Crown Star, Crown Crust, Cheese Crust, etc. (27 items)
4. **Pastas** — The Nook Bite Special, Regular, Creamy, Lasagna, Crunchy (10 items)
5. **Pizza Regular v1** — Chicken Tikka, Fajita, Supreme, Tandoori, Sicilian, Pery Pery (24 items)
6. **Pizza Special** — Cheese Lover, Chicken Lover, Mushroom, Corn, Donut, Star, Lasagna, Malai Boti (36 items)
7. **Rolls & Wraps** — Hunger Wrap, Spin Behari, Shawarma, Zinger Roll, Paratha Roll (11 items)

### Pizza Size System
Pizzas have 4 sizes stored as separate SKUs. On frontend: ONE card + size picker.
| Size | Regular | Special | Food Bank |
|---|---|---|---|
| Small | 500 | 550 | — |
| Medium | 1000 | 1100 | 1300 |
| Large | 1250 | 1350 | 1500 |
| X-Large | 1900 | 2000 | 2200 |

### Burger Cheese Variants
Burgers come as No Cheese / Cheese (+30–50 PKR). ONE card + cheese toggle on frontend.

---

## Database Schema

### profiles (extends Supabase auth.users)
```sql
id          uuid primary key references auth.users(id)
full_name   text
phone       text
created_at  timestamptz default now()
```

### menu_items
```sql
id, sku (unique), name, category, price (int PKR),
image_url, description, available (bool), sort_order, created_at
```

### orders
```sql
id, user_id (uuid, nullable → references profiles),
customer_name, table_number,
status (pending|preparing|ready|completed),
payment_method (cash|card),
payment_status (pending|paid|failed),
stripe_session_id (text, nullable),
total (int PKR), special_notes,
created_at, updated_at
```

### order_items
```sql
id, order_id → orders, menu_item_id → menu_items (nullable),
item_name (denorm), item_price (denorm), quantity, created_at
```

---

## API Endpoints (FastAPI)

### Menu
| Method | Route | Description |
|---|---|---|
| GET | /menu | All available items |
| GET | /menu?category=Burgers | Filter by category |
| PATCH | /menu/{id}/availability | Toggle available (admin) |

### Orders
| Method | Route | Description |
|---|---|---|
| POST | /orders | Create order |
| GET | /orders | All orders (admin/kitchen) |
| GET | /orders?status=pending | Filter by status |
| GET | /orders?user_id={id} | Customer order history |
| PATCH | /orders/{id}/status | Update status (kitchen/admin) |
| GET | /orders/{id} | Single order detail |

### Payments (Stripe)
| Method | Route | Description |
|---|---|---|
| POST | /payments/create-session | Create Stripe Checkout session |
| POST | /payments/webhook | Stripe webhook → confirm payment + create order |

### Auth helpers
| Method | Route | Description |
|---|---|---|
| GET | /me | Get current user profile (from Supabase JWT) |

---

## Auth Flow (Supabase Auth)

### Customer
- Sign up / login: email + password via Supabase Auth
- On signup → insert row into `profiles` table
- Session stored in cookies via `@supabase/ssr`
- Middleware protects `/profile`, `/orders` routes
- Guest checkout allowed (user_id = null on order)

### Admin / Owner
- Single owner account created manually in Supabase Auth dashboard
- Owner email stored in env: `ADMIN_EMAIL=owner@thenookbite.com`
- `/admin` route: check session + verify email === ADMIN_EMAIL
- No self-registration for admin — hardcoded check is fine for single owner

### Kitchen Display
- No auth — runs on local network only (internal kitchen PC)
- Accessed via local IP or private URL

---

## Payment Flow (Stripe)

### Card Payment
```
1. Customer fills checkout → clicks "Pay by Card"
2. Frontend calls POST /payments/create-session with order details
3. Backend creates Stripe Checkout session, returns session URL
4. Frontend redirects to Stripe hosted page
5. Customer pays on Stripe
6. Stripe sends webhook to POST /payments/webhook
7. Backend verifies webhook signature
8. Backend creates order in DB with payment_status: paid
9. Customer redirected to /order-confirmation?id={order_id}
```

### Cash on Delivery
```
1. Customer fills checkout → clicks "Cash on Delivery"
2. Frontend calls POST /orders directly
3. Order created with payment_method: cash, payment_status: pending
4. Customer sees confirmation page immediately
```

### Stripe Setup Notes
- Use `stripe listen --forward-to localhost:8000/payments/webhook` for local testing
- Store: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in backend .env
- Store: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in frontend .env
- Always verify webhook signature — never trust unverified Stripe events
- Set success_url and cancel_url in session creation

---

## Admin Panel (/admin)

### Pages
| Route | Description |
|---|---|
| /admin | Dashboard: live order counts by status |
| /admin/orders | All orders, filterable by status, real-time |
| /admin/orders/{id} | Order detail, update status |
| /admin/menu | List all menu items, toggle available/unavailable |
| /admin/menu/{id} | Edit item name, price, description, image |

### Features
- Live order board (Supabase Realtime)
- Update order status (pending → preparing → ready → completed)
- Toggle menu items on/off (sold out)
- Basic daily stats: total orders today, total revenue today
- Protected: redirect to /admin/login if not authenticated as owner

### Admin Panel Design
- Dark sidebar layout
- Red + white color scheme matching TNB brand
- Order cards with color-coded status badges
- Simple table for menu management

---

## Kitchen Display App (/kitchen-display)

### Behavior
- Dark theme, large text (readable from 2m away)
- On startup: fetch all orders where status IN ('pending', 'preparing')
- Connect Supabase Realtime — new orders appear instantly
- Order card shows: Order ID (last 6 chars), items + qty, time placed, status
- Buttons: "Start Preparing" (pending→preparing), "Mark Ready" (preparing→ready)
- On WebSocket reconnect: show "Reconnected — syncing orders..." banner + re-fetch

### Power Cut Recovery
```
Kitchen PC boots → app loads → calls GET /orders?status=pending,preparing
→ all missed orders rendered → Realtime connects → normal operation resumes
```
No IndexedDB. Supabase is source of truth.

---

## Customer Website Pages

| Route | Description |
|---|---|
| / | Homepage: hero, featured deals, category nav |
| /menu | Full menu, filter by category, search |
| /menu/{category} | Category-specific menu page |
| /cart | Cart review page (or sidebar drawer) |
| /checkout | Name, table, notes, payment method |
| /order-confirmation | Success page with order ID + status |
| /login | Email + password login |
| /signup | Registration form |
| /profile | Customer profile (name, phone) |
| /my-orders | Order history (logged in only) |

---

## Order Status Flow
```
pending → preparing → ready → completed
```
- **pending** — order placed, kitchen hasn't started
- **preparing** — kitchen started
- **ready** — food ready for pickup/serving
- **completed** — delivered to table

---

## Environment Variables

### customer-web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ADMIN_EMAIL=owner@thenookbite.com
```

### kitchen-display (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:8000
```

### backend (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_EMAIL=owner@thenookbite.com
ALLOWED_ORIGINS=http://localhost:3000,https://your-vercel-url.vercel.app
```

---

## 12-Day Sprint Schedule

| Day | Focus | Deliverable |
|---|---|---|
| 1 | Setup | Monorepo, Supabase project, schema.sql run, Stripe account, env vars |
| 2 | Backend | All FastAPI endpoints working, tested in Postman |
| 3 | Auth | Supabase Auth in Next.js, login/signup pages, middleware |
| 4 | Menu UI | Homepage, menu page, pizza size picker, burger cheese toggle |
| 5 | Cart + Checkout | Cart state, checkout form, payment method selector |
| 6 | Payments | Stripe session, webhook, cash flow, order confirmation |
| 7 | Kitchen Display | Vite app, realtime orders, power cut recovery |
| 8 | Admin Panel | /admin routes, live orders, status updates, menu toggle |
| 9 | Integration | Full flow test, Stripe webhook test, auth edge cases |
| 10 | Polish | Loading states, toasts, empty states, mobile responsive |
| 11 | Deploy | Vercel + Railway, all env vars live, production test |
| 12 | Buffer | Fix prod bugs, client demo, handover, README |

---

## Coding Rules
- TypeScript everywhere in frontend
- Tailwind only — no CSS files or modules
- Next.js App Router (`/app` directory)
- Pydantic models on all FastAPI request/response
- Small single-purpose components
- async/await — no .then chains
- Always handle loading + error states
- Use Supabase client from `@supabase/ssr` in Next.js (not `@supabase/supabase-js` directly)

## Frontend UI Rules
- Pizza sizes → ONE card with size picker (S/M/L/XL tabs)
- Burger cheese → ONE card with cheese toggle
- Don't render each SKU as a separate card
- Cart uses Zustand for state management
- All monetary values in PKR integers (no decimals)

## What's Out of Scope (Phase 2)
- JazzCash / Easypaisa integration
- Sales charts / revenue analytics
- Menu CRUD with image upload (use Supabase dashboard)
- Saved delivery addresses
- Push notifications
- Multi-branch support
- Mobile app
