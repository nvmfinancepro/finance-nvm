-- ═══════════════════════════════════════════════════════════════
-- Migration 022 — Tâches (module MON ÉQUIPE, tableau kanban)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.taches (
  id           serial primary key,
  client_id    integer references public.clients(id) on delete cascade,
  employe_id   integer references public.employes(id) on delete set null,
  employe_nom  text not null default '',
  titre        text not null,
  description  text not null default '',
  echeance     date,
  statut       text not null default 'a_faire' check (statut in ('a_faire','en_cours','termine')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger taches_updated_at
  before update on public.taches
  for each row execute procedure public.handle_updated_at();

alter table public.taches enable row level security;

create policy "taches: admin all" on public.taches
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "taches: client own" on public.taches
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "taches: cabinet own" on public.taches
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

alter table public.clients add column if not exists taches_enabled boolean not null default true;
