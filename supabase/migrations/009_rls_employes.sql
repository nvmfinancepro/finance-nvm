-- ═══════════════════════════════════════════════════════════════
-- Migration 009 — Vrai cloisonnement RLS sur `employes`
-- Remplace la policy temporaire "allow_all_authenticated" (posée
-- en urgence quand on a découvert que RLS était désactivée) par le
-- vrai cloisonnement ADMIN / CLIENT / CABINET. Supprime aussi les
-- anciennes policies "admin all"/"client own" héritées des
-- migrations 002/005, qui référençaient déjà profiles.role mais
-- avec l'ancienne syntaxe (remplacées par les fonctions my_role()
-- etc. pour rester cohérent avec clients/imports_csv).
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "employes: allow_all_authenticated" on public.employes;
drop policy if exists "employes: admin all" on public.employes;
drop policy if exists "employes: client own" on public.employes;

create policy "employes: admin all" on public.employes
  for all
  using      (public.my_role() = 'ADMIN')
  with check (public.my_role() = 'ADMIN');

create policy "employes: client own" on public.employes
  for all
  using      (public.my_role() = 'CLIENT'  and client_id = public.my_client_id())
  with check (public.my_role() = 'CLIENT'  and client_id = public.my_client_id());

create policy "employes: cabinet own" on public.employes
  for all
  using (
    public.my_role() = 'CABINET' and exists (
      select 1 from public.clients c
      where c.id = employes.client_id and c.cabinet_id = public.my_cabinet_id()
    )
  )
  with check (
    public.my_role() = 'CABINET' and exists (
      select 1 from public.clients c
      where c.id = employes.client_id and c.cabinet_id = public.my_cabinet_id()
    )
  );
