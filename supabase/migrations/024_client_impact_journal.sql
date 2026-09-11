-- Adds a JSONB column to store a "wins" journal for a client: a running total of
-- value created (cost savings / revenue gains identified by the advisor) plus the
-- itemized list behind it. Used to power the "Valeur créée" widget on the client
-- dashboard. Only populated for clients where we want to show this (e.g. a
-- dedicated showcase client used for marketing videos) — the widget itself only
-- renders when `items` is non-empty, so this is a no-op for every other client.
alter table public.clients
  add column if not exists impact_journal jsonb not null default '{
    "total": 0,
    "totalLabel": "Valeur créée",
    "periode": "Depuis le début de l''accompagnement",
    "items": []
  }'::jsonb;
