-- ═══════════════════════════════════════════════════════════════
-- Migration 035 — Outil des setters, étape 2 : appels et RDV
--
-- - setter_prospects : où en est chaque prospect (à appeler, rappel,
--   pas de réponse, RDV posé…) et quand le rappeler ;
-- - setter_appels : journal de tous les appels (prêt à recevoir plus tard
--   la durée et l'enregistrement d'une téléphonie type Ringover/Aircall) ;
-- - setter_rdv : les RDV posés et la fiche de suivi remplie par le setter ;
-- - setter_noter_appel() : enregistre le résultat d'un appel en une seule
--   transaction et applique les règles (3 appels sans réponse = injoignable,
--   raison obligatoire…). C'est le seul moyen pour un setter d'écrire dans le
--   journal et les RDV : il ne peut ni inventer un RDV, ni modifier un RDV
--   (l'admin le marquera signé ou perdu à l'étape 3).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Suivi d'appel sur chaque prospect ───────────────────────
alter table public.setter_prospects
  add column if not exists statut          text not null default 'a_appeler',
  add column if not exists prochain_appel  timestamptz,  -- rappel daté ou nouvel essai automatique
  add column if not exists nb_sans_reponse integer not null default 0,  -- appels sans réponse d'affilée
  add column if not exists dernier_appel   timestamptz,
  add column if not exists email_dirigeant text;

alter table public.setter_prospects drop constraint if exists setter_prospects_statut_check;
alter table public.setter_prospects add constraint setter_prospects_statut_check
  check (statut in ('a_appeler','pas_de_reponse','rappel','rdv','pas_interesse','pas_la_cible','faux_numero','injoignable'));

create index if not exists setter_prospects_file_idx
  on public.setter_prospects (setter_id, statut, prochain_appel);

-- ─── 2. Journal des appels ──────────────────────────────────────
create table if not exists public.setter_appels (
  id                 bigint generated always as identity primary key,
  prospect_id        bigint not null references public.setter_prospects(id) on delete cascade,
  setter_id          uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),   -- date de l'appel
  resultat           text not null check (resultat in ('pas_de_reponse','rappel','rdv','pas_interesse','pas_la_cible','faux_numero')),
  raison             text,
  note               text,
  rappel_le          timestamptz,                          -- rappel daté ou nouvel essai prévu
  -- Téléphonie (plus tard) : rien ne remplit ces colonnes aujourd'hui.
  duree_secondes     integer,
  enregistrement_url text,
  telephonie_id      text
);

create index if not exists setter_appels_prospect_idx on public.setter_appels (prospect_id, created_at desc);
create index if not exists setter_appels_setter_idx on public.setter_appels (setter_id, created_at desc);

-- ─── 3. RDV posés ───────────────────────────────────────────────
create table if not exists public.setter_rdv (
  id              bigint generated always as identity primary key,
  prospect_id     bigint not null references public.setter_prospects(id) on delete cascade,
  setter_id       uuid references auth.users(id) on delete set null,
  appel_id        bigint references public.setter_appels(id) on delete set null,
  created_at      timestamptz not null default now(),
  rdv_le          timestamptz not null,   -- date et heure de la visio réservée sur Calendly
  email_dirigeant text,
  ca_approximatif text,
  enjeux          text                    -- ce que le dirigeant a partagé (enjeux, questions)
);

create index if not exists setter_rdv_setter_idx on public.setter_rdv (setter_id, rdv_le);

-- ─── 4. RLS ─────────────────────────────────────────────────────
-- ADMIN voit et écrit tout ; SETTER lit uniquement les siens. Aucune policy
-- d'écriture pour le setter : il passe par setter_noter_appel().
alter table public.setter_appels enable row level security;
alter table public.setter_rdv enable row level security;

drop policy if exists "setter_appels: admin all" on public.setter_appels;
create policy "setter_appels: admin all" on public.setter_appels
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "setter_appels: setter own read" on public.setter_appels;
create policy "setter_appels: setter own read" on public.setter_appels
for select
using (public.my_role() = 'SETTER' and setter_id = auth.uid());

drop policy if exists "setter_rdv: admin all" on public.setter_rdv;
create policy "setter_rdv: admin all" on public.setter_rdv
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "setter_rdv: setter own read" on public.setter_rdv;
create policy "setter_rdv: setter own read" on public.setter_rdv
for select
using (public.my_role() = 'SETTER' and setter_id = auth.uid());

-- ─── 5. Noter le résultat d'un appel ────────────────────────────
-- Le navigateur calcule la date du nouvel essai (« pas de réponse » : jour
-- ouvré suivant, en alternant matin et après-midi) ; la fonction applique
-- la règle des 3 appels sans réponse et vérifie que le prospect est au setter.
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
    when 'faux_numero' then
      v_statut := 'faux_numero';
    else
      raise exception 'Résultat inconnu' using errcode = '22023';
  end case;

  insert into public.setter_appels (prospect_id, setter_id, resultat, raison, note, rappel_le)
  values (p.id, auth.uid(), p_resultat, p_raison, p_note, v_prochain)
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

revoke all on function public.setter_noter_appel(bigint, text, text, text, timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.setter_noter_appel(bigint, text, text, text, timestamptz, timestamptz, text, text, text) to authenticated;
