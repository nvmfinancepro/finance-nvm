-- ═══════════════════════════════════════════════════════════════
-- Migration 039 — Outil des setters, étape 3 : issue des RDV et commissions
--
-- Après la visio, l'admin marque le RDV signé (avec la formule et la date de
-- signature) ou perdu ; plus tard, « client parti » avec une date de fin.
-- Les commissions (20 %) se calculent à partir de ces champs :
--   - tableau de bord gratuit : 0 € ;
--   - pilotage mensuel (490 € HT/mois) : 98 € chaque mois civil où le client
--     est actif, du mois de signature au mois du départ inclus ;
--   - audit one-shot (3 000 € HT) : 600 € une fois, le mois de signature.
-- Seul l'admin modifie un RDV (policy « setter_rdv: admin all », migration 035) ;
-- le setter le lit pour voir ses gains.
-- ═══════════════════════════════════════════════════════════════

alter table public.setter_rdv
  add column if not exists issue    text not null default 'en_attente',
  add column if not exists formule  text,
  add column if not exists signe_le date,
  add column if not exists parti_le date,
  add column if not exists issue_le timestamptz;

alter table public.setter_rdv drop constraint if exists setter_rdv_issue_check;
alter table public.setter_rdv add constraint setter_rdv_issue_check check (
  issue in ('en_attente', 'signe', 'perdu')
  and (formule is null or formule in ('dashboard', 'mensuel', 'audit'))
  and (issue <> 'signe' or (formule is not null and signe_le is not null))
  and (parti_le is null or (issue = 'signe' and parti_le >= signe_le))
);

create index if not exists setter_rdv_issue_idx on public.setter_rdv (issue, signe_le);
