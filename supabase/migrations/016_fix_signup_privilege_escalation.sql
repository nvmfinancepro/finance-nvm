-- ═══════════════════════════════════════════════════════════════
-- Migration 016 — Corrige une escalade de privilèges critique.
--
-- Le trigger handle_new_user (créé en 006) faisait confiance à
-- raw_user_meta_data — un champ entièrement contrôlé par l'appelant
-- de supabase.auth.signUp()/inviteUserByEmail() — pour attribuer le
-- rôle, le client_id et le cabinet_id d'un nouveau compte. N'importe
-- qui possédant la clé anonyme (publique) aurait pu s'auto-déclarer
-- role:"ADMIN" et contourner tout le cloisonnement RLS des
-- migrations 007-013.
--
-- Le trigger n'attribue désormais plus jamais de privilège depuis
-- les métadonnées d'inscription : tout nouveau compte est CLIENT
-- sans rattachement, quoi qu'on lui envoie. Les seules routes
-- capables d'élever un compte vers CLIENT (avec client_id) ou
-- CABINET (avec cabinet_id) sont /api/invite et /api/create-cabinet,
-- qui tournent côté serveur avec la clé service-role et sont déjà
-- protégées par une vérification d'appelant.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, name, client_id, cabinet_id)
  values (new.id, new.email, 'CLIENT', new.email, null, null)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
