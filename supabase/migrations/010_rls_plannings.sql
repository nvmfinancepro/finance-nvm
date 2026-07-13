-- ═══════════════════════════════════════════════════════════════
-- Migration 010 — Vrai cloisonnement RLS sur plannings,
-- planning_regles, planning_contraintes (même pattern que employes)
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "plannings: allow_all_authenticated" on public.plannings;
drop policy if exists "plannings: admin all" on public.plannings;
drop policy if exists "plannings: client own" on public.plannings;

create policy "plannings: admin all" on public.plannings
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "plannings: client own" on public.plannings
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "plannings: cabinet own" on public.plannings
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = plannings.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = plannings.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

drop policy if exists "planning_regles: allow_all_authenticated" on public.planning_regles;
drop policy if exists "planning_regles: admin all" on public.planning_regles;
drop policy if exists "planning_regles: client own" on public.planning_regles;

create policy "planning_regles: admin all" on public.planning_regles
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "planning_regles: client own" on public.planning_regles
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "planning_regles: cabinet own" on public.planning_regles
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = planning_regles.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = planning_regles.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

drop policy if exists "planning_contraintes: allow_all_authenticated" on public.planning_contraintes;
drop policy if exists "planning_contraintes: admin all" on public.planning_contraintes;
drop policy if exists "planning_contraintes: client own" on public.planning_contraintes;

create policy "planning_contraintes: admin all" on public.planning_contraintes
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "planning_contraintes: client own" on public.planning_contraintes
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "planning_contraintes: cabinet own" on public.planning_contraintes
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = planning_contraintes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = planning_contraintes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);
