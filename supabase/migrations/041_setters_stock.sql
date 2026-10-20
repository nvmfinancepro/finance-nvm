-- ═══════════════════════════════════════════════════════════════
-- Migration 041 — Outil des setters : stock de leads prêts à appeler
--
-- Les entreprises du bâtiment certifiées RGE (liste ouverte de l'ADEME, qui
-- publie leur téléphone) déjà dans la cible, rangées par département. Un clic
-- sur « Sortir des leads » en donne un paquet au setter, directement dans sa
-- file d'appels :
--   - chaque lead n'est donné qu'une fois (statut 'sorti', avec le setter et la
--     date) : deux setters ne reçoivent jamais la même entreprise ;
--   - un lead déjà dans l'outil (import Google Maps…) est marqué 'deja_pris' ;
--   - ce qui reste à sortir = les lignes 'libre'.
-- La liste d'un département est préparée par le navigateur du premier setter
-- qui la demande, puis refaite tous les 30 jours (nouvelles entreprises, CA
-- publiés) par /api/setter/stock, qui recalcule la cible lui-même.
-- Les setters n'y accèdent que par /api/setter/stock et /api/setter/sortir
-- (service role) : ils ne voient jamais à qui un lead a été donné.
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_prospects drop constraint if exists setter_prospects_source_check;
alter table public.setter_prospects add constraint setter_prospects_source_check
  check (source in ('maps', 'base', 'manuel', 'stock'));

create table if not exists public.setter_stock (
  id               bigint generated always as identity primary key,
  origine          text not null default 'rge' check (origine in ('rge')),
  departement      text not null,
  siren            text not null,
  telephone        text not null,          -- format +33…
  nom              text not null,          -- enseigne, sinon raison sociale
  metier           text,                   -- « Bâtiment RGE · isolation, chauffage »
  email            text,
  site_web         text,
  commune          text,
  adresse          text,
  latitude         double precision,
  longitude        double precision,
  raison_sociale   text,
  nature_juridique text,
  date_creation    date,
  ca               bigint,
  ca_annee         integer,
  effectif         text,
  dirigeant_prenom text,
  dirigeant_nom    text,

  statut           text not null default 'libre' check (statut in ('libre', 'sorti', 'deja_pris')),
  setter_id        uuid references auth.users(id) on delete set null,
  sorti_le         timestamptz,
  vu_le            timestamptz not null default now(),   -- dernière liste où il figurait
  created_at       timestamptz not null default now(),

  constraint setter_stock_siren_key unique (siren)
);

create index if not exists setter_stock_departement_idx on public.setter_stock (departement, statut);

-- Quand la liste de chaque département a été préparée pour la dernière fois.
create table if not exists public.setter_stock_zones (
  departement text primary key,
  rempli_le   timestamptz not null default now(),
  total       integer not null default 0
);

alter table public.setter_stock enable row level security;
alter table public.setter_stock_zones enable row level security;

drop policy if exists "setter_stock: admin all" on public.setter_stock;
create policy "setter_stock: admin all" on public.setter_stock
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "setter_stock_zones: admin all" on public.setter_stock_zones;
create policy "setter_stock_zones: admin all" on public.setter_stock_zones
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

-- ─── Sortir des leads ───────────────────────────────────────────
-- Prend jusqu'à p_nombre leads libres du département (prénom du dirigeant connu
-- d'abord, puis au hasard) et les met dans la file du setter. « skip locked » :
-- deux setters qui cliquent en même temps reçoivent des leads différents.
create or replace function public.setter_sortir_leads(p_setter uuid, p_departement text, p_nombre integer, p_recherche text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.setter_stock;
  sortis integer := 0;
begin
  for s in
    select * from public.setter_stock
    where departement = p_departement and statut = 'libre'
    order by (dirigeant_prenom is null), random()
    for update skip locked
  loop
    exit when sortis >= p_nombre;
    insert into public.setter_prospects (
      setter_id, nom, categorie, telephone, site_web, latitude, longitude, siren, raison_sociale,
      nature_juridique, date_creation, ca, ca_annee, effectif, dirigeant_prenom, dirigeant_nom,
      email_dirigeant, verification, source, recherche
    ) values (
      p_setter, s.nom, s.metier, s.telephone, s.site_web, s.latitude, s.longitude, s.siren, s.raison_sociale,
      s.nature_juridique, s.date_creation, s.ca, s.ca_annee, s.effectif, s.dirigeant_prenom, s.dirigeant_nom,
      s.email, 'qualifie', 'stock', p_recherche
    )
    on conflict do nothing;   -- même téléphone ou même SIREN déjà dans l'outil
    if found then
      update public.setter_stock set statut = 'sorti', setter_id = p_setter, sorti_le = now() where id = s.id;
      sortis := sortis + 1;
    else
      update public.setter_stock set statut = 'deja_pris' where id = s.id;
    end if;
  end loop;

  return jsonb_build_object(
    'sortis', sortis,
    'libres', (select count(*) from public.setter_stock where departement = p_departement and statut = 'libre')
  );
end;
$$;

revoke all on function public.setter_sortir_leads(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.setter_sortir_leads(uuid, text, integer, text) to service_role;
