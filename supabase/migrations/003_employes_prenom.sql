-- ═══════════════════════════════════════════════════════════════
-- NVM Finance — Migration 003 : Ajout prenom dans employes
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

alter table public.employes
  add column if not exists prenom text not null default '';

-- Mettre à jour les lignes existantes : extraire le premier mot de nom comme prenom
-- (optionnel, à ajuster manuellement si besoin)
-- update public.employes set prenom = split_part(nom, ' ', 1), nom = trim(substring(nom from position(' ' in nom))) where prenom = '';
