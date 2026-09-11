-- ═══════════════════════════════════════════════════════════════
-- Données de démo — module "Gestion d'équipe & Tâches"
-- Pas une migration : à exécuter à la main dans le SQL Editor Supabase,
-- une seule fois, sur le client de démo/prospect choisi.
--
-- >>> Changez la valeur ci-dessous pour cibler le bon client <<<
-- ═══════════════════════════════════════════════════════════════

with param as (
  select 20::integer as client_id  -- 20 = "Audit Finance Test" (client de test déjà utilisé)
),
new_sites as (
  insert into public.sites (client_id, nom, adresse, type, frequence, actif)
  select client_id, v.nom, v.adresse, v.type, v.frequence, true
  from param, (values
    ('Siège social',         '12 rue de la Paix, 75002 Paris',          'bureau',          'quotidienne'),
    ('Site industriel Nord', '45 avenue de l''Industrie, 59000 Lille',  'site_industriel', 'quotidienne'),
    ('Agence Lyon',          '8 place Bellecour, 69002 Lyon',           'bureau',          'hebdomadaire'),
    ('Entrepôt logistique',  '3 rue des Docks, 13002 Marseille',        'autre',           'hebdomadaire')
  ) as v(nom, adresse, type, frequence)
  returning id, nom
),
new_employes as (
  insert into public.employes (client_id, prenom, nom, poste, heures_semaine)
  select client_id, v.prenom, v.nom, v.poste, 35
  from param, (values
    ('Karim',   'Belhadj', 'Agent d''entretien'),
    ('Fatou',   'Diallo',  'Agent d''entretien'),
    ('Antoine', 'Lefevre', 'Agent d''entretien'),
    ('Sophie',  'Martin',  'Chef d''équipe'),
    ('Youssef', 'Amrani',  'Agent d''entretien'),
    ('Chloé',   'Bernard', 'Agent d''entretien')
  ) as v(prenom, nom, poste)
  returning id, prenom, nom
),
aff_sites as (
  insert into public.employe_sites (client_id, employe_id, site_id)
  select p.client_id, e.id, s.id
  from param p
  join new_employes e on true
  join new_sites s on true
  join (values
    ('Belhadj','Siège social'), ('Diallo','Siège social'), ('Martin','Siège social'),
    ('Lefevre','Site industriel Nord'), ('Amrani','Site industriel Nord'),
    ('Bernard','Agence Lyon'), ('Martin','Agence Lyon'),
    ('Amrani','Entrepôt logistique')
  ) as v(emp_nom, site_nom) on v.emp_nom = e.nom and v.site_nom = s.nom
  returning 1
),
new_taches as (
  insert into public.taches_recurrentes (client_id, site_id, titre, frequence, jour_semaine, jour_mois, heure_prevue, actif)
  select p.client_id, s.id, v.titre, v.frequence, v.jour_semaine, v.jour_mois, v.heure_prevue::time, true
  from param p
  join new_sites s on true
  join (values
    ('Siège social',         'Nettoyage sols',       'quotidienne',  null::int, null::int, '07:00'),
    ('Siège social',         'Vidage poubelles',     'quotidienne',  null::int, null::int, '07:30'),
    ('Siège social',         'Nettoyage sanitaires', 'quotidienne',  null::int, null::int, '08:00'),
    ('Site industriel Nord', 'Nettoyage sols',       'quotidienne',  null::int, null::int, '06:00'),
    ('Site industriel Nord', 'Contrôle sécurité',    'quotidienne',  null::int, null::int, '06:30'),
    ('Agence Lyon',          'Nettoyage complet',    'hebdomadaire', 1::int,    null::int, '18:00'),
    ('Agence Lyon',          'Vitres',               'hebdomadaire', 3::int,    null::int, '18:00'),
    ('Entrepôt logistique',  'Nettoyage sols',       'hebdomadaire', 5::int,    null::int, '16:00'),
    ('Entrepôt logistique',  'Inventaire mensuel',   'mensuelle',    null::int, 1::int,    '09:00')
  ) as v(site_nom, titre, frequence, jour_semaine, jour_mois, heure_prevue) on v.site_nom = s.nom
  returning id, titre, site_id
),
aff_taches as (
  insert into public.taches_recurrentes_employes (client_id, tache_recurrente_id, employe_id)
  select p.client_id, t.id, e.id
  from param p
  join new_taches t on true
  join new_sites s on s.id = t.site_id
  join (values
    ('Siège social','Nettoyage sols','Belhadj'),
    ('Siège social','Vidage poubelles','Belhadj'),
    ('Siège social','Nettoyage sanitaires','Diallo'),
    ('Site industriel Nord','Nettoyage sols','Lefevre'),
    ('Site industriel Nord','Contrôle sécurité','Lefevre'),
    ('Agence Lyon','Nettoyage complet','Bernard'),
    ('Agence Lyon','Vitres','Bernard'),
    ('Entrepôt logistique','Nettoyage sols','Amrani'),
    ('Entrepôt logistique','Inventaire mensuel','Amrani')
  ) as v(site_nom, titre, emp_nom) on v.site_nom = s.nom and v.titre = t.titre
  join new_employes e on e.nom = v.emp_nom
  returning tache_recurrente_id
),
-- Historique "fait" (vert) pour Nettoyage sols sur 2 sites — les autres tâches
-- quotidiennes/hebdo n'ont volontairement AUCUNE ligne pour les derniers jours,
-- donc elles s'affichent automatiquement "en retard" (rouge) sans rien insérer de plus.
new_executions as (
  insert into public.executions_taches (client_id, tache_recurrente_id, site_id, employe_id, date_prevue, date_validation)
  select p.client_id, t.id, t.site_id, e.id, v.date_prevue, v.date_prevue + (v.heure_offset || ' hours')::interval
  from param p
  join new_taches t on true
  join new_sites s on s.id = t.site_id
  join (values
    ('Siège social',         'Nettoyage sols', 'Belhadj', (current_date - 1), 8),
    ('Siège social',         'Nettoyage sols', 'Belhadj', (current_date - 2), 8),
    ('Site industriel Nord', 'Nettoyage sols', 'Lefevre', (current_date - 1), 7),
    ('Site industriel Nord', 'Nettoyage sols', 'Lefevre', (current_date - 2), 7),
    ('Site industriel Nord', 'Nettoyage sols', 'Lefevre', (current_date - 3), 7)
  ) as v(site_nom, titre, emp_nom, date_prevue, heure_offset) on v.site_nom = s.nom and v.titre = t.titre
  join new_employes e on e.nom = v.emp_nom
  returning id
)
select
  (select count(*) from new_sites)       as sites_crees,
  (select count(*) from new_employes)    as employes_crees,
  (select count(*) from aff_sites)       as affectations_sites,
  (select count(*) from new_taches)      as taches_creees,
  (select count(*) from aff_taches)      as affectations_taches,
  (select count(*) from new_executions)  as executions_creees;
