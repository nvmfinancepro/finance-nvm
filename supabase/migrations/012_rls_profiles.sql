-- ═══════════════════════════════════════════════════════════════
-- Migration 012 — Active enfin RLS sur `profiles`, jamais fait
-- depuis la création de la table. Repéré en testant l'accès
-- anonyme après avoir sécurisé toutes les autres tables.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;

create policy "profiles: own read" on public.profiles
for select
using (id = auth.uid());

create policy "profiles: admin all" on public.profiles
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');
