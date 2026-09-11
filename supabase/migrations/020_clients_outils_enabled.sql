-- ═══════════════════════════════════════════════════════════════
-- Migration 020 — Active/désactive Congés, Pointage et Notes de frais
-- par client (même pattern que planning_enabled, migration 015).
-- Défaut à true : ces outils sont disponibles pour tous les clients
-- dès leur mise en ligne, l'admin peut désactiver au cas par cas.
-- ═══════════════════════════════════════════════════════════════

alter table public.clients add column if not exists conges_enabled boolean not null default true;
alter table public.clients add column if not exists pointage_enabled boolean not null default true;
alter table public.clients add column if not exists notes_frais_enabled boolean not null default true;
