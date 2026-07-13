-- ═══════════════════════════════════════════════════════════════
-- Migration 014 — Ajoute l'email de contact sur cabinets (absent
-- jusqu'ici, donc invisible dans l'interface après création).
-- ═══════════════════════════════════════════════════════════════

alter table public.cabinets add column if not exists email text;
