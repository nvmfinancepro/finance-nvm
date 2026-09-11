-- Toggle to show/hide the "Valeur créée" widget on a client's dashboard.
-- Defaults to false: unlike the other *_enabled feature flags (which default
-- true, i.e. "on unless turned off"), this one is opt-in per client since most
-- clients won't have an impact_journal populated — the admin turns it on
-- explicitly for the clients where it's relevant (e.g. a showcase client).
alter table public.clients
  add column if not exists impact_journal_enabled boolean not null default false;
