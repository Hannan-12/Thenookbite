# TNB (The Nook Bite) — Restaurant POS

Monorepo for The Nook Bite ordering system. See [CLAUDE.md](CLAUDE.md) for the full
spec and [MILESTONES.md](MILESTONES.md) for the build plan.

## Monorepo layout

```
/Thenookbite
  /customer-web      → Next.js 14 customer ordering site   (built)
  /kitchen-display   → React + Vite kitchen screen          (planned)
  /backend           → FastAPI Python API                   (planned)
  /admin             → owner panel (in customer-web/app/admin) (planned)
  /db                → schema.sql + seed.sql (shared)
  CLAUDE.md  MILESTONES.md  README.md
```

Each app is **self-contained**: its own dependencies and its own `.env`. No global
package manager / workspace tool — keep installs per-app.

## Database setup (Supabase)

1. Create a Supabase project.
2. In the SQL editor, run [db/schema.sql](db/schema.sql).
3. Then run [db/seed.sql](db/seed.sql) to load a sample menu.

## customer-web — run locally

```bash
cd customer-web
cp .env.example .env.local      # fill in Supabase URL + anon key
npm install
npm run dev                     # http://localhost:3000
```

## Deploy — Hostinger (Node.js hosting)

`customer-web` is a standard self-hosted Next.js app (`next build` + `next start`).

1. **Build locally or on the server:**
   ```bash
   cd customer-web
   npm install
   npm run build
   ```
2. **Set the Node app on Hostinger (hPanel → Node.js):**
   - **Application root:** `customer-web`
   - **Startup file / command:** `npm run start` (runs `next start`)
   - **Node version:** 18 or 20
   - **App port:** Hostinger injects `PORT`; Next reads it automatically. If needed,
     set the start script to `next start -p $PORT`.
3. **Environment variables** (hPanel → Node.js → Environment):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_API_URL=https://your-backend-url
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
   ADMIN_EMAIL=owner@thenookbite.com
   ```
   > `NEXT_PUBLIC_*` vars are inlined at **build** time — rebuild after changing them.
4. **Restart** the app from hPanel.

> Note: this replaces the Vercel target in CLAUDE.md. The backend (FastAPI) can run on
> Hostinger VPS or a separate host; shared Hostinger Node hosting only serves Node apps.
```
