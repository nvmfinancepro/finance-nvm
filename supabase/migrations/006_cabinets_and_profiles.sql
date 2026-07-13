-- ═══════════════════════════════════════════════════════════════
-- Migration 006 — Reconstruit `profiles` comme vraie source de
-- vérité des rôles, ajoute le rôle CABINET.
-- Additive uniquement : ne modifie aucune donnée existante dans
-- admin_users/client_users/clients, ne touche à aucune policy.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Table cabinets ──────────────────────────────────────────
create table if not exists public.cabinets (
  id         serial primary key,
  name       text not null,
  created_at timestamptz default now()
);

-- ─── 2. Colonnes manquantes sur profiles ────────────────────────
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists client_id integer;
alter table public.profiles add column if not exists cabinet_id integer references public.cabinets(id);

-- ─── 3. cabinet_id sur clients (null = géré directement par toi) ─
alter table public.clients add column if not exists cabinet_id integer references public.cabinets(id);

-- ─── 4. Contrainte sur profiles.role (aucune n'existe aujourd'hui) ─
alter table public.profiles add constraint profiles_role_check
  check (role in ('ADMIN','CLIENT','CABINET'));

-- ─── 5. Fonction + trigger de création de profil à l'inscription ─
-- (aucun trigger n'existe aujourd'hui sur auth.users — création nette)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, name, client_id, cabinet_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'CLIENT'),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    nullif(new.raw_user_meta_data->>'clientId','')::int,
    nullif(new.raw_user_meta_data->>'cabinetId','')::int
  )
  on conflict (id) do update set
    role       = excluded.role,
    name       = excluded.name,
    client_id  = excluded.client_id,
    cabinet_id = excluded.cabinet_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 6. Backfill : une ligne profiles par compte existant ───────
-- (idempotent — rejouable sans dupliquer ni écraser autre chose)
insert into public.profiles (id, email, role, name, client_id)
select u.id, u.email, 'ADMIN', a.name, null
from public.admin_users a
join auth.users u on u.email = a.email
on conflict (id) do update set role = excluded.role, name = excluded.name;

insert into public.profiles (id, email, role, client_id)
select u.id, u.email, 'CLIENT', c.client_id
from public.client_users c
join auth.users u on u.email = c.email
on conflict (id) do update set role = excluded.role, client_id = excluded.client_id;
