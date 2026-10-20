-- ═══════════════════════════════════════════════════════════════
-- Migration 038 — Outil des setters : effectif de chaque prospect
--
-- Tranche d'effectif salarié INSEE (« 03 » = 6 à 9 salariés…). Quand le CA
-- n'est pas publié, c'est le meilleur indicateur de taille : affiché sur la
-- fiche, et une structure de 50 salariés et plus est écartée de la cible.
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_prospects add column if not exists effectif text;
