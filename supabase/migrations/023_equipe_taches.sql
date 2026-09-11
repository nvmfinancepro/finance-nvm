-- ═══════════════════════════════════════════════════════════════
-- Migration 023 — Gestion d'équipe & Tâches (sites multi-emplacements,
-- tâches récurrentes, suivi d'exécution)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sites (
  id           serial primary key,
  client_id    integer references public.clients(id) on delete cascade,
  nom          text not null,
  adresse      text not null default '',
  type         text not null default 'bureau' check (type in ('bureau','site_industriel','autre')),
  frequence    text not null default 'hebdomadaire' check (frequence in ('quotidienne','hebdomadaire','mensuelle')),
  actif        boolean not null default true,
  created_at   timestamptz default now()
);

create table if not exists public.employe_sites (
  id           serial primary key,
  client_id    integer references public.clients(id) on delete cascade,
  employe_id   integer references public.employes(id) on delete cascade,
  site_id      integer references public.sites(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(employe_id, site_id)
);

create table if not exists public.taches_recurrentes (
  id            serial primary key,
  client_id     integer references public.clients(id) on delete cascade,
  site_id       integer references public.sites(id) on delete cascade,
  titre         text not null,
  frequence     text not null default 'quotidienne' check (frequence in ('quotidienne','hebdomadaire','mensuelle')),
  jour_semaine  integer check (jour_semaine between 0 and 6),
  jour_mois     integer check (jour_mois between 1 and 31),
  heure_prevue  time,
  actif         boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger taches_recurrentes_updated_at
  before update on public.taches_recurrentes
  for each row execute procedure public.handle_updated_at();

create table if not exists public.taches_recurrentes_employes (
  id                   serial primary key,
  client_id            integer references public.clients(id) on delete cascade,
  tache_recurrente_id  integer references public.taches_recurrentes(id) on delete cascade,
  employe_id           integer references public.employes(id) on delete cascade,
  created_at           timestamptz default now(),
  unique(tache_recurrente_id, employe_id)
);

create table if not exists public.executions_taches (
  id                   serial primary key,
  client_id            integer references public.clients(id) on delete cascade,
  tache_recurrente_id  integer references public.taches_recurrentes(id) on delete cascade,
  site_id              integer references public.sites(id) on delete cascade,
  employe_id           integer references public.employes(id) on delete set null,
  date_prevue          date not null,
  date_validation      timestamptz default now(),
  note                 text not null default '',
  created_at           timestamptz default now(),
  unique(tache_recurrente_id, date_prevue)
);

alter table public.clients add column if not exists equipe_taches_enabled boolean not null default true;

-- RLS — sites
alter table public.sites enable row level security;

create policy "sites: admin all" on public.sites
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "sites: client own" on public.sites
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "sites: cabinet own" on public.sites
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = sites.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = sites.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

-- RLS — employe_sites
alter table public.employe_sites enable row level security;

create policy "employe_sites: admin all" on public.employe_sites
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "employe_sites: client own" on public.employe_sites
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "employe_sites: cabinet own" on public.employe_sites
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = employe_sites.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = employe_sites.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

-- RLS — taches_recurrentes
alter table public.taches_recurrentes enable row level security;

create policy "taches_recurrentes: admin all" on public.taches_recurrentes
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "taches_recurrentes: client own" on public.taches_recurrentes
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "taches_recurrentes: cabinet own" on public.taches_recurrentes
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches_recurrentes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches_recurrentes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

-- RLS — taches_recurrentes_employes
alter table public.taches_recurrentes_employes enable row level security;

create policy "taches_recurrentes_employes: admin all" on public.taches_recurrentes_employes
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "taches_recurrentes_employes: client own" on public.taches_recurrentes_employes
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "taches_recurrentes_employes: cabinet own" on public.taches_recurrentes_employes
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches_recurrentes_employes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = taches_recurrentes_employes.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

-- RLS — executions_taches
alter table public.executions_taches enable row level security;

create policy "executions_taches: admin all" on public.executions_taches
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "executions_taches: client own" on public.executions_taches
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "executions_taches: cabinet own" on public.executions_taches
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = executions_taches.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = executions_taches.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);
