-- ═══════════════════════════════════════════════════════════════
-- Migration 043 — Stock de leads : recherche automatique des numéros
--
-- Quand un lead sort sans numéro, le serveur le cherche lui-même : TomTom
-- d'abord (2 500 recherches gratuites par jour), Google Maps ensuite si
-- TomTom n'a rien (plafonné pour rester dans la partie gratuite). Le numéro
-- n'est gardé que si la fiche trouvée est bien l'entreprise (même nom, même
-- adresse). On note ici quand la recherche a eu lieu, ce qui l'a trouvé, et
-- quand Google a été interrogé (pour compter les appels du mois).
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_stock add column if not exists numero_cherche_le timestamptz;
alter table public.setter_stock add column if not exists numero_source     text check (numero_source in ('tomtom', 'google'));
alter table public.setter_stock add column if not exists google_le         timestamptz;

create index if not exists setter_stock_numero_cherche_idx on public.setter_stock (numero_cherche_le) where numero_cherche_le is not null;
create index if not exists setter_stock_google_idx on public.setter_stock (google_le) where google_le is not null;
