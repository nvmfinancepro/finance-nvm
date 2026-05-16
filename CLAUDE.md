# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server → http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite is configured.

## Architecture

**NVM Finance** is a multi-client financial dashboard SaaS for accounting/consulting firms, built with Next.js 15 App Router + TypeScript + Tailwind CSS.

### Two user spaces, one app

The app has two distinct spaces separated by route prefix:
- `/admin/*` — firm-side: client portfolio management, CSV imports, access control, alerts, AI reports
- `/client/*` — client-side: read-only dashboards for ventes, achats, charges, salaires, trésorerie, résultat, IS, emprunts, investissements, créances, dettes, catalogue, comparaison, alertes
- `/site/*` — public marketing site (landing, services, CGV, mentions légales, confidentialité)
- `/demo` — standalone demo page (no auth required)

Auth is Supabase Auth (email/password). Role (`ADMIN` | `CLIENT`) is stored in `public.profiles` linked to `auth.users`. The `clientId` on a `CLIENT` profile binds them to a single client record.

### State management

`src/store/index.ts` — a single Zustand store (`useAppStore`) persisted to `localStorage` under key `nvm-finance-store`. Holds `clients[]`, `moisCourant` (selected month as `"YYYY-MM"`), and `resetRequests[]`. The `user` field is intentionally **not** persisted (Supabase Auth owns session state).

### Data model & Supabase

All types live in `src/types/index.ts`. Key types: `Client`, `ImportCSV`, `Emprunt`, `Investissement`, `Tresorerie`, `MonthKpis`, `Alerte`.

Supabase tables (see `supabase/migrations/001_initial.sql`):
- `profiles` — user role + client binding
- `clients` — client records; `kpis`, `emprunts`, `investissements`, `tresorerie`, `is_data` are stored as JSONB columns
- `imports_csv` — CSV import rows stored as JSONB `rows[]`
- `reset_requests` — password reset queue (admin-only)

RLS is enabled on all tables. Admins have full access; clients are row-restricted to their own `client_id`.

Supabase clients:
- `src/lib/supabase/client.ts` — browser client (use in client components)
- `src/lib/supabase/server.ts` — server client (use in Server Components and API routes)

### Finance calculations

`src/lib/finance.ts` contains the core business logic:
- `calcMonthKpis(client, moisIdx, year)` — derives monthly KPIs from `ImportCSV` rows, falling back to `client.kpis` base values when no CSV data exists for that month
- `calcAlertes(client, moisIdx, year)` — runs threshold checks (résultat, EBE, masse salariale, taux de marge, trésorerie) and returns `Alerte[]`
- `fmt(n)` / `pct(n)` — French locale currency and percentage formatters

### AI reports

`src/app/api/ai/route.ts` — server-side POST route that proxies to Anthropic API (`claude-sonnet-4-20250514`). The `ANTHROPIC_API_KEY` must never be exposed to the client; always call `/api/ai` via fetch from client components.

### Shared components

- `src/components/ui/index.tsx` — `Card`, `KpiCard`, `Btn`, `Th`, `Td`, `Pill` and other primitives
- `src/components/charts/index.tsx` — `BarChart2`, `LineAreaChart`, `SaisonnaliteChart`
- `src/components/layout/AdminSidebar.tsx` and `ClientSidebar.tsx`

### CSV imports

`src/lib/csv.ts` — `parseCSV`, `validateRows`, `getTemplate`. Module types defined by `CSVModuleType` in `src/types/index.ts`: `ventes_produits`, `autres_ventes`, `charges`, `salaires`, `catalogue`, `creances_clients`, `dettes_fournisseurs`.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY          # server-only
NEXT_PUBLIC_SITE_URL
```

Copy `.env.local.example` to `.env.local` to get started.

### Migration note

`src/app/NVMFinance.jsx` is the original monolithic prototype (source of truth for business logic not yet migrated). When implementing new pages, check this file for the reference implementation before writing from scratch. `src/app/NVMFinance_backup.jsx` is an older backup — prefer the non-backup version.
