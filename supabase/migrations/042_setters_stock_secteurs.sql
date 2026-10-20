-- ═══════════════════════════════════════════════════════════════
-- Migration 042 — Stock de leads : tous les métiers
--
-- Le stock de la migration 041 ne contenait que le bâtiment RGE. Il prend
-- maintenant chaque métier conseillé aux setters, par département :
--   - secteur : btp_rge, pharmacies, btp, restaurants, transport… ;
--   - le numéro n'est connu que pour le bâtiment RGE (liste ADEME) et les
--     pharmacies (fichier FINESS). Pour les autres métiers, le lead sort sans
--     numéro : il est réservé au setter (statut 'sorti', telephone vide), qui
--     trouve le numéro et le colle (il passe alors dans sa file d'appels), ou
--     l'écarte (statut 'sans_numero', jamais reproposé) ;
--   - recherche : le libellé gardé sur le prospect (« Restaurants · Ain »).
-- La liste d'un métier se charge par lots (page suivante de la base
-- officielle) quand il reste peu de leads libres ; setter_stock_zones garde
-- la page atteinte et si la liste est complète, puis la reprend du début
-- après 30 jours.
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_stock add column if not exists secteur   text not null default 'btp_rge';
alter table public.setter_stock add column if not exists recherche text;
alter table public.setter_stock alter column telephone drop not null;

alter table public.setter_stock drop constraint if exists setter_stock_origine_check;
alter table public.setter_stock add constraint setter_stock_origine_check
  check (origine in ('rge', 'finess', 'base'));
alter table public.setter_stock drop constraint if exists setter_stock_statut_check;
alter table public.setter_stock add constraint setter_stock_statut_check
  check (statut in ('libre', 'sorti', 'deja_pris', 'sans_numero'));

create index if not exists setter_stock_secteur_idx on public.setter_stock (departement, secteur, statut);
create index if not exists setter_stock_a_trouver_idx on public.setter_stock (setter_id) where statut = 'sorti' and telephone is null;

-- Une ligne par département ET par métier. La liste RGE déjà préparée était complète.
alter table public.setter_stock_zones add column if not exists secteur text not null default 'btp_rge';
alter table public.setter_stock_zones add column if not exists page    integer not null default 0;
alter table public.setter_stock_zones add column if not exists fin     boolean not null default true;
alter table public.setter_stock_zones alter column fin set default false;
alter table public.setter_stock_zones drop constraint if exists setter_stock_zones_pkey;
alter table public.setter_stock_zones add primary key (departement, secteur);

-- ─── Où en est le stock d'un département ────────────────────────
create or replace function public.setter_stock_etat(p_departement text, p_setter uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'secteurs', coalesce((
      select jsonb_object_agg(secteur, jsonb_build_object('libres', libres, 'avecNumero', avec))
      from (
        select secteur,
               count(*) filter (where statut = 'libre') as libres,
               count(*) filter (where statut = 'libre' and telephone is not null) as avec
        from public.setter_stock where departement = p_departement group by secteur
      ) t), '{}'::jsonb),
    'sortis', (select count(*) from public.setter_stock where departement = p_departement and statut in ('sorti', 'sans_numero')),
    'mesSortis', (select count(*) from public.setter_stock where departement = p_departement and statut in ('sorti', 'sans_numero') and setter_id = p_setter)
  );
$$;

revoke all on function public.setter_stock_etat(text, uuid) from public, anon, authenticated;
grant execute on function public.setter_stock_etat(text, uuid) to service_role;

-- ─── Sortir des leads ───────────────────────────────────────────
-- Jusqu'à p_nombre leads libres des métiers demandés (prénom du dirigeant
-- connu d'abord, puis au hasard). Avec numéro : directement dans la file
-- d'appels. Sans numéro : réservé au setter, à compléter. Une entreprise déjà
-- dans l'outil (même SIREN ou même numéro) est marquée 'deja_pris'.
drop function if exists public.setter_sortir_leads(uuid, text, integer, text);

create or replace function public.setter_sortir_leads(p_setter uuid, p_departement text, p_secteurs text[], p_nombre integer, p_zone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.setter_stock;
  avec integer := 0;
  sans integer := 0;
  r text;
begin
  for s in
    select * from public.setter_stock
    where departement = p_departement and secteur = any(p_secteurs) and statut = 'libre'
    order by (dirigeant_prenom is null), random()
    for update skip locked
  loop
    exit when avec + sans >= p_nombre;
    r := coalesce(s.recherche, 'Bâtiment RGE · ' || p_zone);
    if exists (select 1 from public.setter_prospects where siren = s.siren) then
      update public.setter_stock set statut = 'deja_pris' where id = s.id;
      continue;
    end if;
    if s.telephone is null then
      update public.setter_stock set statut = 'sorti', setter_id = p_setter, sorti_le = now(), recherche = r where id = s.id;
      sans := sans + 1;
      continue;
    end if;
    insert into public.setter_prospects (
      setter_id, nom, categorie, telephone, site_web, latitude, longitude, siren, raison_sociale,
      nature_juridique, date_creation, ca, ca_annee, effectif, dirigeant_prenom, dirigeant_nom,
      email_dirigeant, verification, source, recherche
    ) values (
      p_setter, s.nom, s.metier, s.telephone, s.site_web, s.latitude, s.longitude, s.siren, s.raison_sociale,
      s.nature_juridique, s.date_creation, s.ca, s.ca_annee, s.effectif, s.dirigeant_prenom, s.dirigeant_nom,
      s.email, 'qualifie', 'stock', r
    )
    on conflict do nothing;   -- même numéro déjà dans l'outil
    if found then
      update public.setter_stock set statut = 'sorti', setter_id = p_setter, sorti_le = now(), recherche = r where id = s.id;
      avec := avec + 1;
    else
      update public.setter_stock set statut = 'deja_pris' where id = s.id;
    end if;
  end loop;

  return jsonb_build_object('sortis', avec + sans, 'avecNumero', avec, 'aTrouver', sans);
end;
$$;

revoke all on function public.setter_sortir_leads(uuid, text, text[], integer, text) from public, anon, authenticated;
grant execute on function public.setter_sortir_leads(uuid, text, text[], integer, text) to service_role;
