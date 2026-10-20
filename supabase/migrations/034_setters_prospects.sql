-- ═══════════════════════════════════════════════════════════════
-- Migration 034 — Outil des setters, étape 1 : rôle SETTER et prospects
--
-- Les setters importent leurs prospects (export Google Maps) sur /setter.
-- Chaque prospect appartient à un setter (setter_id). Règles d'accès :
--   - ADMIN voit et écrit tout ;
--   - SETTER lit et met à jour uniquement ses propres prospects ;
--   - aucun INSERT direct depuis le navigateur : l'import passe par
--     /api/setter/import (clé service role), qui vérifie les doublons sur
--     toute la base, tous setters confondus, sans révéler à qui ils sont.
-- Les policies existantes comparent toutes my_role() à 'ADMIN', 'CLIENT' ou
-- 'CABINET' : elles ne donnent rien au rôle SETTER.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Rôle SETTER ─────────────────────────────────────────────
-- Retire la contrainte qui limite les rôles (son nom peut varier selon
-- l'historique de la base), puis la recrée avec SETTER en plus.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles add constraint profiles_role_check
  check (role in ('ADMIN','CLIENT','CABINET','SETTER'));

-- ─── 2. Prospects des setters ───────────────────────────────────
create table if not exists public.setter_prospects (
  id               bigint generated always as identity primary key,
  -- null si le compte du setter est supprimé : le prospect reste dans la base
  -- (toujours compté comme doublon, visible par l'admin).
  setter_id        uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Fiche Google Maps
  nom              text not null,         -- nom nettoyé (sans la ville)
  nom_maps         text,                  -- nom tel qu'affiché sur Google Maps
  categorie        text,
  telephone        text not null,         -- format +33…
  site_web         text,
  maps_url         text,
  latitude         double precision,
  longitude        double precision,

  -- Base officielle (recherche-entreprises.api.gouv.fr), quand l'entreprise
  -- est retrouvée avec certitude
  siren            text,
  raison_sociale   text,
  nature_juridique text,
  date_creation    date,
  ca               bigint,                -- dernier CA publié, en euros
  ca_annee         integer,
  dirigeant_prenom text,
  dirigeant_nom    text,

  -- Vérification à l'import
  verification     text not null check (verification in ('qualifie','a_verifier','rejete')),
  raison_rejet     text,
  -- « À vérifier » : entreprise la plus probable, montrée au setter pour l'aider
  -- à trancher (indicative, jamais rattachée au prospect).
  proposition      jsonb,

  -- Anti-doublon sur toute la base : par téléphone, puis par SIREN.
  constraint setter_prospects_telephone_key unique (telephone),
  constraint setter_prospects_siren_key unique (siren)
);

create index if not exists setter_prospects_setter_idx
  on public.setter_prospects (setter_id, verification);

drop trigger if exists setter_prospects_updated_at on public.setter_prospects;
create trigger setter_prospects_updated_at
  before update on public.setter_prospects
  for each row execute procedure public.handle_updated_at();

-- ─── 3. RLS ─────────────────────────────────────────────────────
alter table public.setter_prospects enable row level security;

drop policy if exists "setter_prospects: admin all" on public.setter_prospects;
create policy "setter_prospects: admin all" on public.setter_prospects
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "setter_prospects: setter own read" on public.setter_prospects;
create policy "setter_prospects: setter own read" on public.setter_prospects
for select
using (public.my_role() = 'SETTER' and setter_id = auth.uid());

drop policy if exists "setter_prospects: setter own update" on public.setter_prospects;
create policy "setter_prospects: setter own update" on public.setter_prospects
for update
using      (public.my_role() = 'SETTER' and setter_id = auth.uid())
with check (public.my_role() = 'SETTER' and setter_id = auth.uid());
