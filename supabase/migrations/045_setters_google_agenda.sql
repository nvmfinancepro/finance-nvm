-- ═══════════════════════════════════════════════════════════════
-- Migration 045 — Rappels des setters dans leur Google Agenda
--
-- Un setter connecte une fois son Google Agenda (/api/setter/google/*) :
-- chaque rappel daté devient un événement d'un agenda « Rappels NVM »
-- créé par l'outil, déplacé ou supprimé quand le rappel change.
-- - setter_google : la connexion Google de chaque setter (jeton de
--   renouvellement). Aucune policy : seules les routes serveur (service
--   role) y accèdent, le navigateur ne voit jamais le jeton ;
-- - setter_prospects.google_event_id : l'événement du rappel en cours.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.setter_google (
  setter_id      uuid primary key references auth.users(id) on delete cascade,
  email          text,                    -- compte Google connecté (affiché au setter)
  refresh_token  text not null,
  calendrier_id  text,                    -- agenda « Rappels NVM » créé par l'outil
  connecte_le    timestamptz not null default now()
);

alter table public.setter_google enable row level security;

alter table public.setter_prospects add column if not exists google_event_id text;
