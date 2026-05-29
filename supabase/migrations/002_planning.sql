-- ═══════════════════════════════════════════════════════════════
-- NVM Finance — Migration 002 : Planning RH
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Employés d'un client ──────────────────────────────────────
create table if not exists public.employes (
  id             serial primary key,
  client_id      integer references public.clients(id) on delete cascade,
  nom            text not null,
  poste          text not null default '',
  heures_semaine integer not null default 35,
  created_at     timestamptz default now()
);

-- ─── Règles de planning (une ligne par client) ─────────────────
create table if not exists public.planning_regles (
  id                serial primary key,
  client_id         integer unique references public.clients(id) on delete cascade,
  horaire_ouverture jsonb not null default '{"debut":"09:00","fin":"19:00"}',
  couverture_min    integer not null default 1,
  creneaux_speciaux jsonb not null default '[]',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── Demandes/contraintes par mois ─────────────────────────────
create table if not exists public.planning_contraintes (
  id          serial primary key,
  client_id   integer references public.clients(id) on delete cascade,
  mois        text not null,          -- "YYYY-MM"
  employe_id  integer references public.employes(id) on delete cascade,
  type        text not null check (type in ('conge','repos','indispo')),
  dates       text not null,          -- ex: "5, 6, 7" ou "12-18"
  heures      text,                   -- ex: "08:00-12:00" (indispo partielle)
  created_at  timestamptz default now()
);

-- ─── Plannings générés (un par client × mois) ──────────────────
create table if not exists public.plannings (
  id          serial primary key,
  client_id   integer references public.clients(id) on delete cascade,
  mois        text not null,          -- "YYYY-MM"
  data        jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (client_id, mois)
);

-- ─── Trigger updated_at ────────────────────────────────────────
create trigger planning_regles_updated_at
  before update on public.planning_regles
  for each row execute procedure public.handle_updated_at();

create trigger plannings_updated_at
  before update on public.plannings
  for each row execute procedure public.handle_updated_at();

-- ─── Row Level Security ────────────────────────────────────────
alter table public.employes             enable row level security;
alter table public.planning_regles      enable row level security;
alter table public.planning_contraintes enable row level security;
alter table public.plannings            enable row level security;

-- Admin : accès total
create policy "employes: admin all" on public.employes
  for all using (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

create policy "planning_regles: admin all" on public.planning_regles
  for all using (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

create policy "planning_contraintes: admin all" on public.planning_contraintes
  for all using (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

create policy "plannings: admin all" on public.plannings
  for all using (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

-- Client : accès à ses propres données uniquement
create policy "employes: client own" on public.employes
  for all using (
    exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=employes.client_id)
  );

create policy "planning_regles: client own" on public.planning_regles
  for all using (
    exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=planning_regles.client_id)
  );

create policy "planning_contraintes: client own" on public.planning_contraintes
  for all using (
    exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=planning_contraintes.client_id)
  );

create policy "plannings: client own" on public.plannings
  for all using (
    exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=plannings.client_id)
  );
