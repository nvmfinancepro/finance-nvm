# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server → http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint (eslint . with eslint-config-next); many pre-existing errors in NVMFinance.jsx
```

No test suite is configured.

## Architecture

**NVM Finance** is a multi-client financial dashboard SaaS, sold both directly to businesses and, since the CABINET role was added, to accounting firms who manage a portfolio of their own clients on the platform. Built with Next.js 15 App Router + TypeScript/JS + Supabase.

### The app is (mostly) one component — read this before touching routing

`src/app/admin/**`, `src/app/client/**`, and `src/store/index.ts` (Zustand) are **dead scaffolding** — empty directories / unused code, never rendered, never imported. Do not build on them without first checking they're actually wired up.

The real, live app — admin, client, and cabinet spaces alike — is a single ~5600-line client component: **`src/app/NVMFinance.jsx`**, mounted at the one route `src/app/dashboard/page.tsx`. It is `"use client"` and switches between sections via a local `view` string in `useState`, not Next.js routing. Three roles share this same render tree:
- ADMIN (the platform owner) and CABINET (a paying accounting firm) both render the same admin-style UI (`AdminClients`, `AdminSaisie`, `AdminFinancier`, `AlertesView`, `RapportIA`, `PlanningView`) — a CABINET session is scoped to its own clients by RLS (see below) plus a `cabinet_id` check, not by separate components.
- CLIENT renders `ClientSpace` and its per-module subcomponents (ventes, achats, charges, salaires, trésorerie, résultat, IS, emprunts, investissements, créances, dettes, catalogue, comparaison, alertes, prévisionnel, planning).

Pieces split out of it (all imported by `NVMFinance.jsx`, not routes):
- `src/app/charte.jsx` — the brand palette `C`, `fmt`/`pct`, and base components (`Btn`, `Pill`, `KpiCard`, `Card`, `SectionHead`, `Th`/`Td`/`Tr`, `FormRow`). Reuse these; don't redefine colors.
- `src/app/pilotage/` — every financial client view: `synthese.jsx` (the client home, `view="dashboard"`: health check, KPIs vs last month / last year / budget, year-to-date, charts; for paid clients the top text is the advisor's monthly note, for free clients an automatic plain-language reading), `vues.jsx` (compte de résultat/SIG, bilan & BFR, trésorerie with cash-flow bridge, créances/dettes by age, ventes/achats/charges/salaires with product, channel, employee and supplier detail, TVA, IS), `vues-plus.jsx` (budget vs réel + atterrissage, comparaison with the causes of the gap, simulations « et si », rentabilité par produit, emprunts, investissements, trésorerie estimée, points d'attention), `import-fec.jsx` (FEC import UI), `graphiques.jsx` (SVG charts + `VIZ` palette, validated for color-blindness).
- `ClientSpaceContent` in `NVMFinance.jsx` is now only a router to these views (plus the team tools). All views work for every client: bilan and trésorerie réelle need a FEC, everything else also runs on simplified imports.

`src/app/NVMFinance_backup.jsx` and `NVMFinance.jsx.bak` are dead, unimported backups — ignore them; don't edit them "just in case."

`/site/*` — public marketing site (landing, services, CGV, mentions légales, confidentialité). `/demo` — standalone demo page (no auth required).

### Auth & roles

Supabase Auth (email/password). `public.profiles` (keyed on `auth.uid()`) is the source of truth for `role` (`ADMIN` | `CLIENT` | `CABINET`), `client_id`, and `cabinet_id`. New accounts always get `role='CLIENT'` with no attachment at signup time (the `handle_new_user` trigger never trusts client-supplied metadata — see migration 016) — only the server-side `/api/invite` and `/api/create-cabinet` routes (already authorized) may elevate a profile to CLIENT-with-client_id or CABINET-with-cabinet_id, via an explicit `UPDATE` after inviting.

There is also a **legacy, untracked-in-migrations** pair of tables, `admin_users` and `client_users`, still used by `NVMFinance.jsx`'s login/session-restore code to distinguish ADMIN and CLIENT (checked *before* falling through to `profiles` for CABINET). Their schema isn't in any migration file — treat changes to them cautiously and confirm the live schema in Supabase before assuming column names.

### Data model & Supabase

All data access from `NVMFinance.jsx` is direct-to-Supabase from the browser (anon key) — there is no CRUD API layer. The authenticated server API routes are `/api/invite`, `/api/delete-user`, `/api/create-cabinet`, `/api/ai`, `/api/planning/generate` — all require a `Authorization: Bearer <access_token>` header and verify the caller server-side (see any of these files for the pattern). `/api/free-dashboard` is the one deliberately public route: self-serve signup to the free dashboard (creates the client with `plan='dashboard'` and an already-confirmed auth user with the password typed in the `/services` form, WhatsApps Nathan via CallMeBot; the form then signs in on both the cookie client and the plain localStorage client so `/dashboard` opens straight into the client space). Clients import their own CSVs from the "Importer mes données" view (`ClientImport` in `NVMFinance.jsx`), writing directly to `imports_csv` under the client-write RLS of migration 031. Free clients (`clients.plan='dashboard'`) get the accountant-style views (dashboard, ventes, achats, charges, salaires, résultat, TVA, IS) unlocked; every view listed in `FREE_LOCKED_VIEWS` renders blurred behind `LockedFeature`, whose "Demander à mon conseiller" button calls `/api/advisor-request` (any CLIENT, WhatsApps Nathan via `src/lib/whatsapp.ts`). The admin unlocks a client by unchecking "Tableau de bord gratuit" in the client edit form (sets `plan` to null); it is guarded only by a honeypot field and a best-effort per-IP rate limit.

Supabase tables (see `supabase/migrations/`, currently up to `033`):
- `profiles` — role + client/cabinet binding, RLS: own row readable, ADMIN full access
- `cabinets` — accounting firms; `clients.cabinet_id` (nullable — null means managed directly by the platform owner) links a client to one
- `clients` — client records; `kpis`, `emprunts`, `investissements`, `tresorerie`, `is_data`, `previsionnel` stored as JSONB columns; `planning_enabled` toggles the Planning module per client
- `imports_csv` — one row per (client_id, type, mois), JSONB `rows[]`, unique key added in migration 033 (all writes are upserts on it). Types: the CSV modules below, plus `budget` (mois = the year, e.g. "2026": 12 monthly values per line ca/achats/externes/personnel/autres, editable by the client — any plan — and the advisor), `fec` (one row per month: monthly movements per account `{k:"a",c,l,d,cr,ad,ac}`, sales per client `{k:"c"}`, purchases per supplier `{k:"f"}`, meta `{k:"m",ex,fin,fichier,siren,an}`), `fec_tiers` (open client/supplier items at the FEC's last date, aged FIFO) and `note` (the advisor's monthly note shown on the client's Synthèse)
- `employes`, `plannings`, `planning_regles`, `planning_contraintes` — team planning module
- `admin_users`, `client_users` — legacy, see above (`client_users` no longer stores a password — auth is 100% Supabase Auth)
- `reset_requests` — currently unused by the app (password resets go through `supabase.auth.resetPasswordForEmail` directly)

RLS is enabled on every table above. Pattern: ADMIN sees/writes everything; CLIENT is restricted to its own `client_id`; CABINET is restricted to clients where `clients.cabinet_id` matches its own `cabinet_id` (via helper SQL functions `my_role()`/`my_client_id()`/`my_cabinet_id()`, migration 007). When adding a new table that hangs off `clients`, follow the same three-policy pattern rather than inventing a new one.

Supabase clients:
- `src/lib/supabase/client.ts` / `server.ts` — the "proper" wrappers (`@supabase/ssr`), used by `/set-password`, `/auth/login`, and the API routes
- `NVMFinance.jsx` instantiates its **own** plain `@supabase/supabase-js` client at the top of the file instead of importing the one above — its session is therefore not cookie-synced, which is why the API routes it calls take the access token via `Authorization` header rather than reading a cookie server-side. Keep this in mind if you add a new authenticated route.

### Finance calculations

`src/lib/finance.ts` is **dead code** (never imported). The live logic:
- `src/lib/donnees.js` — **the single data source**: `dataIndex(client)` merges FEC months with simplified-import months translated into PCG accounts (sales 706/708, cost of sales 607, charges by nature via keyword rules on supplier/label, payroll 641/645, estimated depreciation 681 and loan interest 661, VAT 4457/4456). `lireVente` reads every sector template (ca_ht, ca_ht_periode, loyer, pvht × quantité; marge_ht, marge_brute or CA − costs). `monthKpis` feeds `calcMonthKpis` in `NVMFinance.jsx` (falls back to `client.kpis` base values with `hasData:false` when nothing is imported).
- `src/lib/budget.js` — budget storage, réalisé split like the budget, proposal from last year's months, annual-total spreading.
- `calcTresoEstimee` / `fluxTresoEstime` — real cash (banks + caisse − overdrafts) from the FEC when available; otherwise solde de départ + monthly (résultat + amortissements − capital d'emprunt remboursé + ajustements saisis).
- `calcAlertes` — threshold checks + `fecAlertes` (old client invoices, DSO, margin drop, external charges rise, activity decline vs last year) + generic tax reminders (`isFiscal:true`, excluded from badges).
- `src/lib/fec.js` — FEC parsing (tab/pipe/semicolon, Debit/Credit or Montant/Sens, UTF-8/Windows-1252) and monthly summarizing; opening entries (à-nouveaux) are kept apart, closing entries (6/7 vs 12 in one écriture) are dropped. Everything runs in the browser; the raw file is never stored.
- `src/lib/pilotage.js` — PCG mapping to P&L postes, SIG, bilan at any month end (balances from the latest à-nouveaux), BFR/FR/trésorerie nette, ratios (DSO/DPO/DIO, autonomie, endettement, capacité de remboursement, point mort), `fluxTresorerie` (cash-flow bridge whose lines sum exactly to the cash variation), IS estimate (15 % up to 42 500 €, then 25 %).
- `src/lib/estimations.js` — loans (rate stored monthly in `emprunts[].taux`, `tauxAnnuel` kept for display; 0 % loans handled; capital restant, intérêts, capital remboursé du mois) and investments (depreciation from the in-service date, VNC).

### AI features

Both `src/app/api/ai/route.ts` (financial report generation, `RapportIA` component) and `src/app/api/planning/generate/route.ts` (AI-assisted team planning) proxy to **Groq** (`llama-3.3-70b-versatile`), not Anthropic — despite several unused API keys sitting in `.env.local` (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`), only `GROQ_API_KEY` is actually read by the code. Both routes require a Bearer token (any authenticated user) — see either file for the auth-check pattern to copy if you add a new AI route. `RapportIA`'s prompt does not attribute itself to any specific company (it used to hardcode "NVM Finance" — removed for white-labeling; see `client.advisorLabel` below).

### White-labeling for cabinets

A client's dashboard should never hardcode "NVM Finance" in user-facing text, since the client may belong to a paying accounting-firm cabinet instead. The pattern: wherever `ClientSpace` is rendered, the `client` object passed in is enriched with `advisorLabel` (the owning cabinet's name, or `"NVM Finance"` if `cabinet_id` is null) — components under `ClientSpace` read `client.advisorLabel` instead of hardcoding a company name. Follow this pattern for any new client-facing copy that names the service provider.

### Shared components

- `src/components/ui/index.tsx`, `src/components/charts/index.tsx`, `src/components/layout/*` exist but are **not** used by the live app (`NVMFinance.jsx` defines its own local primitives — `Card`, `KpiCard`, `Btn`, `AdminSidebar`, `ClientSidebar`, etc.). Confirm a component is actually imported before assuming it's live.

### Imports

The recommended source is the **FEC** (fichier des écritures comptables), imported monthly ("Importer mes données" → "Ma comptabilité (FEC)" for free clients; admin/cabinet via "Imports (FEC, CSV)" or "Voir comme client"). Each month of the file is upserted, so re-importing the current-year FEC each month just updates it; importing the previous year's FEC enables N-1 comparisons. Only free clients import themselves; for paid clients the advisor imports (client preview, menu "Imports (conseiller)", or admin "Imports (FEC, CSV)"). The admin also publishes the monthly note from the client preview or from "Rapports IA" ("Publier comme note du mois"); it is the commentary paid clients see at the top of their Synthèse.

`NVMFinance.jsx` has its own local `parseCSV`/CSV handling — `src/lib/csv.ts` (`parseCSV`, `validateRows`, `getTemplate`) is unused dead code, not the live implementation. Module types: `ventes_produits`, `autres_ventes`, `charges`, `salaires`, `catalogue`, `creances_clients`, `dettes_fournisseurs`.

Clients can also import a raw bank statement (CSV or OFX) from "Importer mes données" → "Mon relevé bancaire" (`BankImport` in `NVMFinance.jsx`, parsing/categorisation in `src/lib/bank-statement.js`, all client-side). Transactions are auto-categorised (keyword rules + categories the client already validated on earlier statements), converted TTC→HT with the client's VAT rate, and saved as `ventes_produits` / `charges` / `salaires` rows tagged `source:"banque"`. "Achat de marchandises" is stored as a `ventes_produits` row with `ca_ht=0` and a negative `marge_ht` so it lowers the margin without touching revenue. A new statement only replaces bank rows inside the date range it covers (`mergeWithExisting`), so overlapping statements never double-count.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-only — used by /api/invite, /api/delete-user, /api/create-cabinet
GROQ_API_KEY                # server-only — used by /api/ai, /api/planning/generate
CALLMEBOT_PHONE             # server-only — WhatsApp notification target for /api/free-dashboard
CALLMEBOT_APIKEY            # server-only — CallMeBot key for that notification
NEXT_PUBLIC_SITE_URL
```

Copy `.env.local.example` to `.env.local` to get started.

### Known gaps (as of the last full audit)

- `npm run lint` runs, but `NVMFinance.jsx` carries many pre-existing errors (components defined inside render, setState in effects, unescaped apostrophes); new code in `src/app/pilotage/` and `src/lib/` should stay free of undefined/unused variables.
- The app loads every `imports_csv` row visible to the user at startup; with FEC data that's ~100 KB per client per year (more for `fec_tiers` snapshots). Fine for tens of clients; past that, load imports per client on demand.
- No billing/subscription infrastructure exists yet for the cabinet model (no Stripe, no plan/quota on the `cabinets` table) — a real product decision to make before selling cabinet seats at scale.
- Data writes from `NVMFinance.jsx` mostly check for Supabase errors and roll back optimistically-updated local state on failure (see `updateClient`) — if you add a new write path, follow that pattern rather than firing-and-forgetting.
