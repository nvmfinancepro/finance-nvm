-- ═══════════════════════════════════════════════════════════════
-- Migration 031 — Un CLIENT peut importer ses propres données
-- ═══════════════════════════════════════════════════════════════
-- Le tableau de bord gratuit est en libre-service : le client importe lui-même
-- ses fichiers (ventes, charges, salaires) depuis « Importer mes données ».
-- Jusqu'ici il n'avait que la lecture (migration 008). On ajoute l'écriture,
-- strictement limitée à son propre client_id. La lecture reste inchangée.

create policy "imports_csv: client own insert" on public.imports_csv
  for insert
  with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "imports_csv: client own update" on public.imports_csv
  for update
  using      (public.my_role() = 'CLIENT' and client_id = public.my_client_id())
  with check (public.my_role() = 'CLIENT' and client_id = public.my_client_id());

create policy "imports_csv: client own delete" on public.imports_csv
  for delete
  using (public.my_role() = 'CLIENT' and client_id = public.my_client_id());
