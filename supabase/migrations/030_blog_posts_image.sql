-- Cover image for blog posts (shown above the title on the article page and
-- as a thumbnail on the /blog listing). Nullable: older posts have none.
alter table public.blog_posts
  add column if not exists image_url text;
