-- ═══════════════════════════════════════════════════════════════
-- Migration 037 — Outil des setters : d'où vient chaque prospect
--
-- - source : import Google Maps, recherche dans la base officielle, ou
--   ajout à la main ;
-- - recherche : la recherche qui l'a trouvé (« plombier Bourg-en-Bresse »,
--   « BTP · Ain »…), pour montrer au setter quelles recherches donnent le
--   plus de prospects qualifiés et lui conseiller les suivantes.
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_prospects
  add column if not exists source    text not null default 'maps',
  add column if not exists recherche text;

alter table public.setter_prospects drop constraint if exists setter_prospects_source_check;
alter table public.setter_prospects add constraint setter_prospects_source_check
  check (source in ('maps', 'base', 'manuel'));

create index if not exists setter_prospects_recherche_idx
  on public.setter_prospects (setter_id, recherche);
