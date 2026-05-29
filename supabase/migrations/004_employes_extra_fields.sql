-- ═══════════════════════════════════════════════════════════════
-- NVM Finance — Migration 004 : Champs supplémentaires employes
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

alter table public.employes
  add column if not exists dispo    jsonb not null default '{}',
  add column if not exists conges   jsonb not null default '[]',
  add column if not exists notepref text  not null default '';
