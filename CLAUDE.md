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

**NVM Finance** is a multi-client financial dashboard SaaS, sold both directly to businesses and, since the CABINET role was added, to accounting firms who manage a portfolio of their own clients on the platform. Built with Next.js 15 App Router + TypeScript/JS + Supabase.

### The entire app is one component — read this before touching routing

`src/app/admin/**`, `src/app/client/**`, and `src/store/index.ts` (Zustand) are **dead scaffolding** — empty directories / unused code, never rendered, never imported. Do not build on them without first checking they're actually wired up.

The real, live app — admin, client, and cabinet spaces alike — is a single ~7000-line client component: **`src/app/NVMFinance.jsx`**, mounted at the one route `src/app/dashboard/page.tsx`. It is `"use client"` and switches between sections via a local `view` string in `useState`, not Next.js routing. Three roles share this same render tree:
- ADMIN (the platform owner) and CABINET (a paying accounting firm) both render the same admin-style UI (`AdminClients`, `AdminSaisie`, `AdminFinancier`, `AlertesView`, `RapportIA`, `PlanningView`) — a CABINET session is scoped to its own clients by RLS (see below) plus a `cabinet_id` check, not by separate components.
- CLIENT renders `ClientSpace` and its per-module subcomponents (ventes, achats, charges, salaires, trésorerie, résultat, IS, emprunts, investissements, créances, dettes, catalogue, comparaison, alertes, prévisionnel, planning).

`src/app/NVMFinance_backup.jsx` and `NVMFinance.jsx.bak` are dead, unimported backups — ignore them; don't edit them "just in case."

`/site/*` — public marketing site (landing, services, CGV, mentions légales, confidentialité). `/demo` — standalone demo page (no auth required).

### Auth & roles

Supabase Auth (email/password). `public.profiles` (keyed on `auth.uid()`) is the source of truth for `role` (`ADMIN` | `CLIENT` | `CABINET`), `client_id`, and `cabinet_id`. New accounts always get `role='CLIENT'` with no attachment at signup time (the `handle_new_user` trigger never trusts client-supplied metadata — see migration 016) — only the server-side `/api/invite` and `/api/create-cabinet` routes (already authorized) may elevate a profile to CLIENT-with-client_id or CABINET-with-cabinet_id, via an explicit `UPDATE` after inviting.

There is also a **legacy, untracked-in-migrations** pair of tables, `admin_users` and `client_users`, still used by `NVMFinance.jsx`'s login/session-restore code to distinguish ADMIN and CLIENT (checked *before* falling through to `profiles` for CABINET). Their schema isn't in any migration file — treat changes to them cautiously and confirm the live schema in Supabase before assuming column names.

### Data model & Supabase

All data access from `NVMFinance.jsx` is direct-to-Supabase from the browser (anon key) — there is no CRUD API layer. The only server API routes are `/api/invite`, `/api/delete-user`, `/api/create-cabinet`, `/api/ai`, `/api/planning/generate` — all require a `Authorization: Bearer <access_token>` header and verify the caller server-side (see any of these files for the pattern).

Supabase tables (see `supabase/migrations/`, currently up to `017`):
- `profiles` — role + client/cabinet binding, RLS: own row readable, ADMIN full access
- `cabinets` — accounting firms; `clients.cabinet_id` (nullable — null means managed directly by the platform owner) links a client to one
- `clients` — client records; `kpis`, `emprunts`, `investissements`, `tresorerie`, `is_data`, `previsionnel` stored as JSONB columns; `planning_enabled` toggles the Planning module per client
- `imports_csv` — CSV import rows stored as JSONB `rows[]`
- `employes`, `plannings`, `planning_regles`, `planning_contraintes` — team planning module
- `admin_users`, `client_users` — legacy, see above (`client_users` no longer stores a password — auth is 100% Supabase Auth)
- `reset_requests` — currently unused by the app (password resets go through `supabase.auth.resetPasswordForEmail` directly)

RLS is enabled on every table above. Pattern: ADMIN sees/writes everything; CLIENT is restricted to its own `client_id`; CABINET is restricted to clients where `clients.cabinet_id` matches its own `cabinet_id` (via helper SQL functions `my_role()`/`my_client_id()`/`my_cabinet_id()`, migration 007). When adding a new table that hangs off `clients`, follow the same three-policy pattern rather than inventing a new one.

Supabase clients:
- `src/lib/supabase/client.ts` / `server.ts` — the "proper" wrappers (`@supabase/ssr`), used by `/set-password`, `/auth/login`, and the API routes
- `NVMFinance.jsx` instantiates its **own** plain `@supabase/supabase-js` client at the top of the file instead of importing the one above — its session is therefore not cookie-synced, which is why the API routes it calls take the access token via `Authorization` header rather than reading a cookie server-side. Keep this in mind if you add a new authenticated route.

### Finance calculations

`src/lib/finance.ts` contains the core business logic:
- `calcMonthKpis(client, moisIdx, year)` — derives monthly KPIs from `ImportCSV` rows, falling back to `client.kpis` base values when no CSV data exists for that month
- `calcAlertes(client, moisIdx, year)` — runs threshold checks (résultat, EBE, masse salariale, taux de marge, trésorerie) and returns `Alerte[]`
- `fmt(n)` / `pct(n)` — French locale currency and percentage formatters

### AI features

Both `src/app/api/ai/route.ts` (financial report generation, `RapportIA` component) and `src/app/api/planning/generate/route.ts` (AI-assisted team planning) proxy to **Groq** (`llama-3.3-70b-versatile`), not Anthropic — despite several unused API keys sitting in `.env.local` (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`), only `GROQ_API_KEY` is actually read by the code. Both routes require a Bearer token (any authenticated user) — see either file for the auth-check pattern to copy if you add a new AI route. `RapportIA`'s prompt does not attribute itself to any specific company (it used to hardcode "NVM Finance" — removed for white-labeling; see `client.advisorLabel` below).

### White-labeling for cabinets

A client's dashboard should never hardcode "NVM Finance" in user-facing text, since the client may belong to a paying accounting-firm cabinet instead. The pattern: wherever `ClientSpace` is rendered, the `client` object passed in is enriched with `advisorLabel` (the owning cabinet's name, or `"NVM Finance"` if `cabinet_id` is null) — components under `ClientSpace` read `client.advisorLabel` instead of hardcoding a company name. Follow this pattern for any new client-facing copy that names the service provider.

### Shared components

- `src/components/ui/index.tsx`, `src/components/charts/index.tsx`, `src/components/layout/*` exist but are **not** used by the live app (`NVMFinance.jsx` defines its own local primitives — `Card`, `KpiCard`, `Btn`, `AdminSidebar`, `ClientSidebar`, etc.). Confirm a component is actually imported before assuming it's live.

### CSV imports

`NVMFinance.jsx` has its own local `parseCSV`/CSV handling — `src/lib/csv.ts` (`parseCSV`, `validateRows`, `getTemplate`) is unused dead code, not the live implementation. Module types: `ventes_produits`, `autres_ventes`, `charges`, `salaires`, `catalogue`, `creances_clients`, `dettes_fournisseurs`.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only — used by /api/invite, /api/delete-user, /api/create-cabinet
GROQ_API_KEY                # server-only — used by /api/ai, /api/planning/generate
NEXT_PUBLIC_SITE_URL
```

Copy `.env.local.example` to `.env.local` to get started.

### Known gaps (as of the last full audit)

- `npm run lint` is broken (`next lint` was removed in Next 16; `eslint-config-next` is still pinned to 15) — no lint currently runs, on this repo or in CI.
- No billing/subscription infrastructure exists yet for the cabinet model (no Stripe, no plan/quota on the `cabinets` table) — a real product decision to make before selling cabinet seats at scale.
- Data writes from `NVMFinance.jsx` mostly check for Supabase errors and roll back optimistically-updated local state on failure (see `updateClient`) — if you add a new write path, follow that pattern rather than firing-and-forgetting.
