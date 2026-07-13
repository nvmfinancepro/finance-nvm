-- ═══════════════════════════════════════════════════════════════
-- Migration 015 — Active/désactive le module Planning par client.
-- Défaut à true pour ne rien changer au comportement actuel
-- (tous les clients y ont accès aujourd'hui sans distinction).
-- ═══════════════════════════════════════════════════════════════

alter table public.clients add column if not exists planning_enabled boolean not null default true;
