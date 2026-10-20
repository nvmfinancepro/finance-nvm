-- ═══════════════════════════════════════════════════════════════
-- Migration 036 — Outil des setters : compléments de suivi
--
-- - fiche modifiable par le setter : ligne directe et note permanente
--   (le prénom, le nom et l'email du dirigeant existent déjà) ;
-- - « Ne plus m'appeler » : nouveau résultat d'appel, le contact est bloqué
--   définitivement (il reste en base, donc personne ne peut le ré-importer) ;
-- - annuler un résultat cliqué par erreur : chaque appel garde l'état du
--   prospect d'avant, et setter_annuler_appel() le rétablit (2 minutes max,
--   seulement le dernier appel du prospect).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Fiche modifiable ────────────────────────────────────────
alter table public.setter_prospects
  add column if not exists ligne_directe text,   -- format +33…
  add column if not exists note          text;   -- note permanente du setter sur ce contact

-- ─── 2. « Ne plus m'appeler » ───────────────────────────────────
alter table public.setter_prospects drop constraint if exists setter_prospects_statut_check;
alter table public.setter_prospects add constraint setter_prospects_statut_check
  check (statut in ('a_appeler','pas_de_reponse','rappel','rdv','pas_interesse','pas_la_cible','faux_numero','injoignable','ne_plus_appeler'));

alter table public.setter_appels drop constraint if exists setter_appels_resultat_check;
alter table public.setter_appels add constraint setter_appels_resultat_check
  check (resultat in ('pas_de_reponse','rappel','rdv','pas_interesse','pas_la_cible','faux_numero','ne_plus_appeler'));

-- ─── 3. État d'avant, pour pouvoir annuler ──────────────────────
alter table public.setter_appels add column if not exists avant jsonb;

-- ─── 4. Noter un appel (remplace la version de la migration 035) ─
create or replace function public.setter_noter_appel(
  p_prospect       bigint,
  p_resultat       text,
  p_note           text default null,
  p_raison         text default null,
  p_prochain_appel timestamptz default null,
  p_rdv_le         timestamptz default null,
  p_email          text default null,
  p_ca             text default null,
  p_enjeux         text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p            public.setter_prospects;
  a            public.setter_appels;
  r            public.setter_rdv;
  v_statut     text;
  v_prochain   timestamptz := null;
  v_sans_rep   integer := 0;
begin
  if public.my_role() is distinct from 'SETTER' then
    raise exception 'Réservé aux setters' using errcode = '42501';
  end if;

  select * into p from public.setter_prospects
  where id = p_prospect and setter_id = auth.uid()
  for update;
  if not found then
    raise exception 'Prospect introuvable' using errcode = 'P0002';
  end if;
  if p.verification <> 'qualifie' then
    raise exception 'Ce prospect n''est pas qualifié' using errcode = '22023';
  end if;
  if p.statut = 'ne_plus_appeler' then
    raise exception 'Ce contact a demandé à ne plus être appelé' using errcode = '22023';
  end if;

  p_note   := nullif(left(btrim(coalesce(p_note, '')), 2000), '');
  p_raison := nullif(left(btrim(coalesce(p_raison, '')), 300), '');

  case p_resultat
    when 'pas_de_reponse' then
      v_sans_rep := p.nb_sans_reponse + 1;
      if v_sans_rep >= 3 then
        v_statut := 'injoignable';
      elsif p_prochain_appel is null then
        raise exception 'Date du nouvel essai manquante' using errcode = '22023';
      else
        v_statut := 'pas_de_reponse';
        v_prochain := p_prochain_appel;
      end if;
    when 'rappel' then
      if p_prochain_appel is null then
        raise exception 'Date du rappel manquante' using errcode = '22023';
      end if;
      v_statut := 'rappel';
      v_prochain := p_prochain_appel;
    when 'rdv' then
      if p_rdv_le is null then
        raise exception 'Date du RDV manquante' using errcode = '22023';
      end if;
      v_statut := 'rdv';
    when 'pas_interesse', 'pas_la_cible' then
      if p_raison is null then
        raise exception 'Raison obligatoire' using errcode = '22023';
      end if;
      v_statut := p_resultat;
    when 'faux_numero', 'ne_plus_appeler' then
      v_statut := p_resultat;
    else
      raise exception 'Résultat inconnu' using errcode = '22023';
  end case;

  insert into public.setter_appels (prospect_id, setter_id, resultat, raison, note, rappel_le, avant)
  values (p.id, auth.uid(), p_resultat, p_raison, p_note, v_prochain,
          jsonb_build_object('statut', p.statut, 'prochain_appel', p.prochain_appel, 'nb_sans_reponse', p.nb_sans_reponse,
                             'dernier_appel', p.dernier_appel, 'email_dirigeant', p.email_dirigeant))
  returning * into a;

  if p_resultat = 'rdv' then
    insert into public.setter_rdv (prospect_id, setter_id, appel_id, rdv_le, email_dirigeant, ca_approximatif, enjeux)
    values (p.id, auth.uid(), a.id, p_rdv_le,
            nullif(left(btrim(coalesce(p_email, '')), 200), ''),
            nullif(left(btrim(coalesce(p_ca, '')), 100), ''),
            nullif(left(btrim(coalesce(p_enjeux, '')), 4000), ''))
    returning * into r;
  end if;

  update public.setter_prospects set
    statut          = v_statut,
    prochain_appel  = v_prochain,
    nb_sans_reponse = v_sans_rep,
    dernier_appel   = a.created_at,
    email_dirigeant = coalesce(nullif(left(btrim(coalesce(p_email, '')), 200), ''), email_dirigeant)
  where id = p.id
  returning * into p;

  return jsonb_build_object('prospect', to_jsonb(p), 'appel', to_jsonb(a),
                            'rdv', case when r.id is null then null else to_jsonb(r) end);
end;
$$;

-- ─── 5. Annuler le dernier résultat (clic par erreur) ───────────
create or replace function public.setter_annuler_appel(p_appel bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.setter_appels;
  p public.setter_prospects;
begin
  if public.my_role() is distinct from 'SETTER' then
    raise exception 'Réservé aux setters' using errcode = '42501';
  end if;

  select * into a from public.setter_appels where id = p_appel and setter_id = auth.uid();
  if not found then
    raise exception 'Appel introuvable' using errcode = 'P0002';
  end if;
  if a.created_at < now() - interval '2 minutes' or a.avant is null then
    raise exception 'Trop tard pour annuler : notez plutôt un nouveau résultat' using errcode = '22023';
  end if;
  if exists (select 1 from public.setter_appels where prospect_id = a.prospect_id and id > a.id) then
    raise exception 'Un appel plus récent a été noté sur ce contact' using errcode = '22023';
  end if;

  perform 1 from public.setter_prospects where id = a.prospect_id for update;
  delete from public.setter_rdv where appel_id = a.id;
  delete from public.setter_appels where id = a.id;

  update public.setter_prospects set
    statut          = a.avant->>'statut',
    prochain_appel  = (a.avant->>'prochain_appel')::timestamptz,
    nb_sans_reponse = (a.avant->>'nb_sans_reponse')::integer,
    dernier_appel   = (a.avant->>'dernier_appel')::timestamptz,
    email_dirigeant = a.avant->>'email_dirigeant'
  where id = a.prospect_id
  returning * into p;

  return jsonb_build_object('prospect', to_jsonb(p), 'appel_id', a.id);
end;
$$;

revoke all on function public.setter_annuler_appel(bigint) from public, anon;
grant execute on function public.setter_annuler_appel(bigint) to authenticated;
