-- ═══════════════════════════════════════════════════════════════
-- NVM Finance — Migration initiale
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ─── Profils utilisateurs (liés à auth.users) ──────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('ADMIN', 'CLIENT')),
  name        text not null,
  client_id   integer,              -- null pour les admins
  first_login boolean default true,
  created_at  timestamptz default now()
);

-- ─── Clients (dossiers) ────────────────────────────────────────
create table public.clients (
  id          serial primary key,
  name        text not null,
  sector      text not null,
  color       text default '#005653',
  manager     text not null,
  since       text not null,
  status      text default 'healthy' check (status in ('healthy','warning','critical')),
  email       text,
  kpis        jsonb not null default '{"ca":0,"marge":0,"charges":0,"salaires":0,"ebe":0,"result":0,"tresorerie":0}',
  emprunts    jsonb not null default '[]',
  investissements jsonb not null default '[]',
  tresorerie  jsonb not null default '{"soldeInitial":0,"ajustements":[]}',
  is_data     jsonb not null default '{"totalPrecedent":0,"taux":15}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Imports CSV ───────────────────────────────────────────────
create table public.imports_csv (
  id          serial primary key,
  client_id   integer references public.clients(id) on delete cascade,
  type        text not null,
  label       text not null,
  mois        text not null,   -- "YYYY-MM"
  rows        jsonb not null default '[]',
  count       integer default 0,
  imported_at text not null,
  created_at  timestamptz default now()
);

-- ─── Demandes reset mot de passe ───────────────────────────────
create table public.reset_requests (
  id          serial primary key,
  email       text not null,
  name        text not null,
  status      text default 'pending' check (status in ('pending','done')),
  created_at  timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.clients          enable row level security;
alter table public.imports_csv      enable row level security;
alter table public.reset_requests   enable row level security;

-- Policies profiles : chacun voit son propre profil
create policy "profiles: own" on public.profiles
  for all using (auth.uid() = id);

-- Policies clients : admin voit tout, client voit seulement le sien
create policy "clients: admin all" on public.clients
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
  );

create policy "clients: client own" on public.clients
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'CLIENT' and client_id = clients.id
    )
  );

-- Policies imports_csv
create policy "imports: admin all" on public.imports_csv
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
  );

create policy "imports: client read" on public.imports_csv
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'CLIENT' and client_id = imports_csv.client_id
    )
  );

-- Policies reset_requests : admin seulement
create policy "reset: admin only" on public.reset_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
  );

-- ─── Trigger updated_at ────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

-- ─── Trigger : créer profile après signup ──────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (new.id, 'CLIENT', coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
