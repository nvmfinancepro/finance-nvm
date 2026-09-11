-- ═══════════════════════════════════════════════════════════════
-- Migration 028 — canonical_url sur blog_posts
-- Permet à un article du blog de déclarer une autre URL comme
-- canonique (ex: un guide déjà publié en page dédiée dont le contenu
-- a été repris dans le blog) pour éviter le contenu dupliqué aux yeux
-- de Google. NULL = l'article est canonique sur sa propre URL /blog/slug.
-- ═══════════════════════════════════════════════════════════════

alter table public.blog_posts add column if not exists canonical_url text;
