-- ═══════════════════════════════════════════════════════════════
-- Migration 013 — Policy d'accès sur `cabinets` (créée sans policy
-- à l'étape 2 par précaution). ADMIN gère tout ; un cabinet peut
-- lire sa propre ligne (nom affiché dans son interface).
-- ═══════════════════════════════════════════════════════════════

create policy "cabinets: admin all" on public.cabinets
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

create policy "cabinets: own read" on public.cabinets
for select
using (public.my_role() = 'CABINET' and id = public.my_cabinet_id());
