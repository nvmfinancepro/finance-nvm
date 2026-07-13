-- ═══════════════════════════════════════════════════════════════
-- Migration 007 — Vrai cloisonnement RLS sur `clients`
-- Remplace la policy "allow_all" (tout utilisateur connecté voit
-- tout) par : ADMIN voit tout, CLIENT voit uniquement le sien,
-- CABINET voit uniquement les siens.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_client_id() returns integer
language sql stable security definer set search_path = public
as $$ select client_id from public.profiles where id = auth.uid() $$;

create or replace function public.my_cabinet_id() returns integer
language sql stable security definer set search_path = public
as $$ select cabinet_id from public.profiles where id = auth.uid() $$;

drop policy if exists "allow_all" on public.clients;

create policy "clients: admin all" on public.clients
  for all
  using      (public.my_role() = 'ADMIN')
  with check (public.my_role() = 'ADMIN');

create policy "clients: client own read" on public.clients
  for select
  using (public.my_role() = 'CLIENT' and id = public.my_client_id());

create policy "clients: cabinet own" on public.clients
  for all
  using      (public.my_role() = 'CABINET' and cabinet_id = public.my_cabinet_id())
  with check (public.my_role() = 'CABINET' and cabinet_id = public.my_cabinet_id());
