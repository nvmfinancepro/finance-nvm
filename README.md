# NVM Finance — SaaS de conseil financier

Tableau de bord financier multi-clients pour cabinets de conseil.

## Stack

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Front | **Next.js 15** + TypeScript | SSR, routing, API routes |
| Style | **Tailwind CSS** | Classes utilitaires |
| State | **Zustand** | Store global persisté |
| BDD | **Supabase** (PostgreSQL) | Données clients, imports CSV |
| Auth | **Supabase Auth** | Email/password, reset MP, RLS |
| IA | **Anthropic Claude** | Rapports financiers automatiques |
| Déploiement | **Vercel** | CI/CD automatique depuis GitHub |

## Arborescence

```
nvm-finance/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Layout racine (fonts, metadata)
│   │   ├── auth/login/page.tsx     # Page de connexion
│   │   ├── api/ai/route.ts         # API route Anthropic (clé serveur)
│   │   ├── dashboard/              # Redirect selon rôle
│   │   ├── admin/                  # Espace admin
│   │   │   ├── clients/            # Gestion portefeuille
│   │   │   ├── acces/              # Mots de passe clients
│   │   │   ├── saisie/             # Import CSV
│   │   │   ├── financier/          # Données financières
│   │   │   ├── alertes/            # Centre d'alertes
│   │   │   └── rapports/           # Rapports IA
│   │   └── client/                 # Espace client
│   │       ├── dashboard/          # Tableau de bord + graphiques
│   │       ├── ventes/             # CA et marge
│   │       ├── achats/             # Coûts d'achat
│   │       ├── charges/            # Charges externes
│   │       ├── salaires/           # Masse salariale + décalages
│   │       ├── tresorerie/         # Flux détaillés
│   │       ├── resultat/           # Compte de résultat
│   │       ├── is/                 # Impôt sur les sociétés
│   │       ├── emprunts/           # Tableau d'amortissement
│   │       ├── investissements/    # VNC et amortissement
│   │       ├── creances/           # Balance âgée 411
│   │       ├── dettes/             # Balance âgée 401
│   │       ├── catalogue/          # Références produits
│   │       ├── comparaison/        # Comparaison de périodes
│   │       └── alertes/            # Mes alertes
│   │
│   ├── components/
│   │   ├── ui/                     # Composants réutilisables
│   │   │   ├── index.tsx           # Card, KpiCard, Btn, Th, Td, Pill…
│   │   │   └── Logo.tsx            # LogoSVG (fillColor prop)
│   │   ├── charts/
│   │   │   └── index.tsx           # BarChart2, LineAreaChart, SaisonnaliteChart
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx    # Sidebar admin
│   │   │   └── ClientSidebar.tsx   # Sidebar client (sections)
│   │   ├── admin/                  # Composants admin spécifiques
│   │   └── client/                 # Composants client spécifiques
│   │
│   ├── lib/
│   │   ├── finance.ts              # calcMonthKpis, calcAlertes, fmt, pct
│   │   ├── csv.ts                  # parseCSV, validateRows, getTemplate
│   │   └── supabase/
│   │       ├── client.ts           # Client navigateur
│   │       └── server.ts           # Client serveur (SSR)
│   │
│   ├── store/
│   │   └── index.ts                # Zustand store (clients, moisCourant, user)
│   │
│   ├── types/
│   │   └── index.ts                # Tous les types TypeScript
│   │
│   └── styles/
│       └── globals.css             # Tailwind base + variables CSS
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql         # Schéma complet + RLS policies
│
├── public/                         # Assets statiques
├── .env.local.example              # Variables d'environnement (modèle)
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Installation

### 1. Cloner et installer

```bash
git clone https://github.com/VOTRE_USER/nvm-finance.git
cd nvm-finance
npm install
```

### 2. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier l'URL et la clé anon : **Settings > API**
3. Exécuter le SQL : **SQL Editor > Coller le contenu de `supabase/migrations/001_initial.sql`**

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

### 4. Lancer en dev

```bash
npm run dev
# → http://localhost:3000
```

### 5. Logo

Ouvrir `src/components/ui/Logo.tsx` et coller les paths SVG de votre logo
(disponibles dans le fichier `NVMFinance.jsx` original, composant `LogoSVG`).

## Déploiement Vercel

```bash
# 1. Pousser sur GitHub
git add . && git commit -m "init" && git push

# 2. Importer le repo dans vercel.com
# 3. Ajouter les variables d'environnement dans Vercel > Settings > Environment Variables
# 4. Deploy → URL automatique
```

## Fonctionnalités à implémenter en priorité

- [ ] **Middleware auth** — rediriger `/dashboard` selon le rôle (admin/client)
- [ ] **Première connexion** — popup changement de mot de passe (logique Supabase Auth)
- [ ] **Import CSV** — sauvegarder dans la table `imports_csv`
- [ ] **Rapport IA** — appeler `/api/ai` côté client avec fetch
- [ ] **Email reset MP** — Supabase gère l'envoi automatiquement via `resetPasswordForEmail`

## Migration depuis NVMFinance.jsx

Le fichier `NVMFinance.jsx` (artifact Claude) contient toute la logique métier.
Voici comment la migrer composant par composant :

1. `calcMonthKpis` → `src/lib/finance.ts` ✅ (déjà migré)
2. `calcAlertes` → `src/lib/finance.ts` ✅ (déjà migré)
3. `ClientDashboard` → `src/app/client/dashboard/page.tsx`
4. `AdminClients` → `src/app/admin/clients/page.tsx`
5. `AdminSaisie` → `src/app/admin/saisie/page.tsx`
6. Chaque vue client → son propre `page.tsx` dans `src/app/client/`

Les styles inline React (ex: `style={{color:C.primary}}`) se remplacent par des classes Tailwind.
