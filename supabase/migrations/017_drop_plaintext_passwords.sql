-- ═══════════════════════════════════════════════════════════════
-- Migration 017 — Supprime le stockage de mots de passe en clair.
--
-- client_users.password contenait les mots de passe des clients en
-- texte brut, lus/affichés par le code applicatif (corrigé dans le
-- même lot que cette migration). L'authentification passe désormais
-- entièrement par Supabase Auth (mot de passe hashé, géré par
-- Supabase) — cette colonne n'a plus aucun usage.
-- ═══════════════════════════════════════════════════════════════

alter table public.client_users drop column if exists password;
