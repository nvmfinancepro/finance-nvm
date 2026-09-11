-- ═══════════════════════════════════════════════════════════════
-- Migration 019 — Pointage (badgeage arrivée/départ)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.pointages (
  id            serial primary key,
  client_id     integer references public.clients(id) on delete cascade,
  employe_id    integer references public.employes(id) on delete cascade,
  date          date not null,
  heure_arrivee text,
  heure_depart  text,
  note          text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (employe_id, date)
);

create trigger pointages_updated_at
  before update on public.pointages
  for each row execute procedure public.handle_updated_at();

alter table public.pointages enable row level security;

create policy "pointages: admin all" on public.pointages
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "pointages: client own" on public.pointages
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "pointages: cabinet own" on public.pointages
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = pointages.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = pointages.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);
