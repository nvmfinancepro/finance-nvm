-- ═══════════════════════════════════════════════════════════════
-- Migration 026 — Stock (suivi de quantités et seuils d'alerte)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.stock (
  id            serial primary key,
  client_id     integer references public.clients(id) on delete cascade,
  produit       text not null,
  categorie     text not null default 'Autre',
  quantite      numeric(10,2) not null default 0,
  unite         text not null default 'unité',
  seuil_alerte  numeric(10,2) not null default 0,
  fournisseur   text not null default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger stock_updated_at
  before update on public.stock
  for each row execute procedure public.handle_updated_at();

alter table public.stock enable row level security;

create policy "stock: admin all" on public.stock
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "stock: client own" on public.stock
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "stock: cabinet own" on public.stock
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = stock.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = stock.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

alter table public.clients add column if not exists stock_enabled boolean not null default true;
