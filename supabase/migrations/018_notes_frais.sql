-- ═══════════════════════════════════════════════════════════════
-- Migration 018 — Notes de frais
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.notes_frais (
  id           serial primary key,
  client_id    integer references public.clients(id) on delete cascade,
  employe_id   integer references public.employes(id) on delete set null,
  employe_nom  text not null default '',
  date         date not null,
  montant      numeric(10,2) not null check (montant > 0),
  categorie    text not null default 'autre',
  description  text not null default '',
  statut       text not null default 'en_attente' check (statut in ('en_attente','validee','refusee')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger notes_frais_updated_at
  before update on public.notes_frais
  for each row execute procedure public.handle_updated_at();

alter table public.notes_frais enable row level security;

create policy "notes_frais: admin all" on public.notes_frais
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "notes_frais: client own" on public.notes_frais
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "notes_frais: cabinet own" on public.notes_frais
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = notes_frais.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = notes_frais.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);
