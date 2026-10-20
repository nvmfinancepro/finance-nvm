-- ═══════════════════════════════════════════════════════════════
-- Migration 044 — Désactiver un setter sans perdre son historique
--
-- L'admin peut couper l'accès d'un setter (départ, pause) : son rôle passe
-- à SETTER_INACTIF. Toutes les règles d'accès et les fonctions des setters
-- exigent le rôle SETTER, l'accès est donc coupé immédiatement, alors que
-- ses prospects, appels, RDV et commissions restent visibles pour l'admin.
-- /api/setter-access bloque aussi sa connexion côté Supabase Auth.
-- Réactiver remet le rôle SETTER.
-- ═══════════════════════════════════════════════════════════════

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles add constraint profiles_role_check
  check (role in ('ADMIN','CLIENT','CABINET','SETTER','SETTER_INACTIF'));

alter table public.profiles add column if not exists desactive_le timestamptz;
