-- ═══════════════════════════════════════════════════════════════
-- Migration 008 — Vrai cloisonnement RLS sur `imports_csv`
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "allow_all" on public.imports_csv;

create policy "imports_csv: admin all" on public.imports_csv
  for all
  using      (public.my_role() = 'ADMIN')
  with check (public.my_role() = 'ADMIN');

create policy "imports_csv: client own read" on public.imports_csv
  for select
  using (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "imports_csv: cabinet own" on public.imports_csv
  for all
  using (
    public.my_role() = 'CABINET' and exists (
      select 1 from public.clients c
      where c.id = imports_csv.client_id and c.cabinet_id = public.my_cabinet_id()
    )
  )
  with check (
    public.my_role() = 'CABINET' and exists (
      select 1 from public.clients c
      where c.id = imports_csv.client_id and c.cabinet_id = public.my_cabinet_id()
    )
  );
