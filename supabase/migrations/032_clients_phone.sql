-- ═══════════════════════════════════════════════════════════════
-- Migration 032 — Téléphone du client
-- ═══════════════════════════════════════════════════════════════
-- Saisi à l'inscription au tableau de bord gratuit (/api/free-dashboard) et
-- affiché sur la carte du client dans l'admin pour le rappeler en un clic.
-- Mêmes policies RLS que le reste de la ligne clients (aucune à ajouter).

alter table public.clients add column if not exists phone text;

-- Récupère le téléphone des inscrits d'avant cette migration (stocké jusqu'ici
-- dans les métadonnées du compte).
update public.clients c
set phone = u.raw_user_meta_data->>'phone'
from public.profiles p
join auth.users u on u.id = p.id
where p.client_id = c.id
  and c.phone is null
  and u.raw_user_meta_data->>'phone' is not null;
