-- ═══════════════════════════════════════════════════════════════
-- Migration 033 — Clé unique (client, type, mois) sur imports_csv
-- ═══════════════════════════════════════════════════════════════
-- Tous les imports (modèles CSV, relevé bancaire, comptabilité FEC mois par mois,
-- soldes clients/fournisseurs « fec_tiers », note mensuelle du conseiller « note »)
-- sont enregistrés par upsert onConflict (client_id, type, mois) : réimporter un
-- mois remplace l'import précédent au lieu de le dupliquer.
-- L'upsert exige cette contrainte ; elle n'était décrite dans aucune migration.
-- Le script ne fait rien si elle existe déjà. S'il échoue sur des doublons, les
-- supprimer à la main (garder l'id le plus récent de chaque client/type/mois) puis relancer.

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'imports_csv'
      and indexdef ilike 'create unique index%'
      and replace(indexdef, ' ', '') ilike '%(client_id,type,mois)%'
  ) then
    create unique index imports_csv_client_type_mois_key on public.imports_csv (client_id, type, mois);
  end if;
end $$;
