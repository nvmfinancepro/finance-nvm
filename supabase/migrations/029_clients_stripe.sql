-- Stripe subscription tracking for self-serve signups via /api/checkout +
-- the /api/webhooks/stripe handler. Nullable: clients created manually by an
-- admin (the common path today) have no Stripe subscription attached, and
-- plan is only set once a checkout actually completes.
alter table public.clients
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text check (plan in ('dashboard','finance','gestion'));
