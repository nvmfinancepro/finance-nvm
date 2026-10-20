-- ═══════════════════════════════════════════════════════════════
-- Migration 040 — Outil des setters : historique des recherches Google Maps
--
-- Chaque import d'un export Google Maps est noté ici (recherche, date, combien
-- de lignes, de nouveaux prospects, de qualifiés, de doublons), même quand il
-- n'a rien apporté de nouveau. L'outil s'en sert pour :
--   - cocher les recherches déjà faites, par n'importe quel setter (sans dire
--     lequel) : personne ne refait une recherche qu'un collègue vient de faire ;
--   - la reproposer 90 jours après (nouvelles entreprises, sociétés qui passent
--     le cap des 3 ans) ;
--   - choisir la prochaine recherche conseillée.
-- Les setters écrivent et lisent cet historique par /api/setter/recherches
-- (service role) ; ils ne lisent directement que leurs propres lignes.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.setter_recherches (
  id          bigint generated always as identity primary key,
  setter_id   uuid references auth.users(id) on delete set null,
  recherche   text not null,                 -- « plombier Polliat »
  cle         text not null,                 -- la même, en minuscules et espaces simples
  source      text not null default 'maps' check (source in ('maps')),
  faite_le    timestamptz not null default now(),
  lignes      integer not null default 0,    -- lignes du fichier
  nouveaux    integer not null default 0,    -- prospects ajoutés à l'outil (qualifiés, à vérifier, hors cible)
  qualifies   integer not null default 0,
  a_verifier  integer not null default 0,
  doublons    integer not null default 0     -- déjà dans l'outil
);

create index if not exists setter_recherches_cle_idx on public.setter_recherches (cle, faite_le desc);

alter table public.setter_recherches enable row level security;

drop policy if exists "setter_recherches: admin all" on public.setter_recherches;
create policy "setter_recherches: admin all" on public.setter_recherches
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "setter_recherches: setter own read" on public.setter_recherches;
create policy "setter_recherches: setter own read" on public.setter_recherches
for select
using (public.my_role() = 'SETTER' and setter_id = auth.uid());

-- Reprise des recherches déjà faites avant cette migration, à partir des prospects importés.
insert into public.setter_recherches (setter_id, recherche, cle, faite_le, lignes, nouveaux, qualifies, a_verifier)
select p.setter_id,
       min(p.recherche),
       lower(regexp_replace(trim(p.recherche), '\s+', ' ', 'g')),
       max(p.created_at),
       count(*), count(*),
       count(*) filter (where p.verification = 'qualifie'),
       count(*) filter (where p.verification = 'a_verifier')
from public.setter_prospects p
where p.source = 'maps' and p.recherche is not null and trim(p.recherche) <> ''
  and not exists (select 1 from public.setter_recherches r where r.setter_id = p.setter_id
                  and r.cle = lower(regexp_replace(trim(p.recherche), '\s+', ' ', 'g')))
group by p.setter_id, lower(regexp_replace(trim(p.recherche), '\s+', ' ', 'g'));
