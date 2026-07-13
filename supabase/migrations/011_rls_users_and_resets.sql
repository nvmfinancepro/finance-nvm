-- ═══════════════════════════════════════════════════════════════
-- Migration 011 — Vrai cloisonnement RLS sur client_users, et
-- restriction admin_users/reset_requests à ADMIN uniquement
-- (pas de notion de cabinet pertinente pour ces deux dernières).
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "allow_all" on public.client_users;

create policy "client_users: admin all" on public.client_users
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

-- le client a besoin d'accéder à sa propre ligne (ex: mise à jour de first_login à la connexion)
create policy "client_users: client own" on public.client_users
for all
using (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "client_users: cabinet own" on public.client_users
for all
using (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = client_users.client_id and c.cabinet_id = public.my_cabinet_id()
  )
)
with check (
  public.my_role() = 'CABINET' and exists (
    select 1 from public.clients c
    where c.id = client_users.client_id and c.cabinet_id = public.my_cabinet_id()
  )
);

-- admin_users et reset_requests : pas de notion de cabinet, ADMIN uniquement
drop policy if exists "allow_all" on public.admin_users;

create policy "admin_users: admin all" on public.admin_users
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

drop policy if exists "allow_all" on public.reset_requests;

create policy "reset_requests: admin all" on public.reset_requests
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');
