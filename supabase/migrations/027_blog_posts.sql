-- ═══════════════════════════════════════════════════════════════
-- Migration 027 — Blog (articles SEO publics + génération IA)
-- Table plateforme (non liée à un client) : l'admin rédige ou génère
-- un brouillon, le publie quand il est prêt. Seuls les articles
-- status='published' sont lisibles publiquement (page /blog).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.blog_posts (
  id            serial primary key,
  slug          text not null unique,
  title         text not null,
  excerpt       text not null default '',
  body          text not null default '',
  theme         text not null default '',
  status        text not null default 'draft' check (status in ('draft','published')),
  author        text not null default 'NVM Finance',
  published_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute procedure public.handle_updated_at();

alter table public.blog_posts enable row level security;

create policy "blog_posts: admin all" on public.blog_posts
for all
using (public.my_role() = 'ADMIN')
with check (public.my_role() = 'ADMIN');

-- Lecture publique : uniquement les articles publiés (page /blog, non authentifiée)
create policy "blog_posts: public read published" on public.blog_posts
for select
to anon, authenticated
using (status = 'published');
