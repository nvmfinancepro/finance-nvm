-- ═══════════════════════════════════════════════════════════════
-- NVM Finance — Migration 005 : Fix RLS WITH CHECK manquant
-- Les policies FOR ALL avec seulement USING ne couvrent pas INSERT.
-- On recrée chaque policy admin avec WITH CHECK explicite.
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── employes ──────────────────────────────────────────────────
drop policy if exists "employes: admin all" on public.employes;
create policy "employes: admin all" on public.employes
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

-- ─── plannings ─────────────────────────────────────────────────
drop policy if exists "plannings: admin all" on public.plannings;
create policy "plannings: admin all" on public.plannings
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

-- ─── planning_regles ───────────────────────────────────────────
drop policy if exists "planning_regles: admin all" on public.planning_regles;
create policy "planning_regles: admin all" on public.planning_regles
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

-- ─── planning_contraintes ──────────────────────────────────────
drop policy if exists "planning_contraintes: admin all" on public.planning_contraintes;
create policy "planning_contraintes: admin all" on public.planning_contraintes
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN'));

-- ─── employes: client own ──────────────────────────────────────
drop policy if exists "employes: client own" on public.employes;
create policy "employes: client own" on public.employes
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=employes.client_id))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=employes.client_id));

-- ─── plannings: client own ─────────────────────────────────────
drop policy if exists "plannings: client own" on public.plannings;
create policy "plannings: client own" on public.plannings
  for all
  using      (exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=plannings.client_id))
  with check (exists (select 1 from public.profiles where id=auth.uid() and role='CLIENT' and client_id=plannings.client_id));
