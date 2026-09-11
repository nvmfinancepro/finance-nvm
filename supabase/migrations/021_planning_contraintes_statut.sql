-- ═══════════════════════════════════════════════════════════════
-- Migration 021 — Workflow demande/validation sur planning_contraintes.
-- Permet au module Congés & absences de distinguer une demande en
-- attente d'une demande validée/refusée par le dirigeant, sur le même
-- principe que notes_frais.statut. Défaut 'validee' pour ne rien
-- changer aux lignes existantes (repos/indispo internes à Planning).
-- ═══════════════════════════════════════════════════════════════

alter table public.planning_contraintes add column if not exists statut text not null default 'validee' check (statut in ('en_attente','validee','refusee'));
