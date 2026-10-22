import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog";
import BlogPostClient from "./BlogPostClient";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

// canonical_url vient de la base (blog_posts) : on retire un éventuel www pour que
// la canonique désigne toujours le domaine officiel https://nvm-finance.fr.
const sansWww = (url: string | null) => url?.replace("://www.nvm-finance.fr", "://nvm-finance.fr") || null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const url = `https://nvm-finance.fr/blog/${post.slug}`;
  const canonical = sansWww(post.canonical_url) || url;
  return {
    title: `${post.title} | Blog NVM Finance`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: { title: post.title, description: post.excerpt, url: canonical, type: "article" },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.image_url || undefined,
    datePublished: post.published_at,
    author: { "@type": "Organization", name: "NVM Finance", url: "https://nvm-finance.fr" },
    publisher: { "@type": "Organization", name: "NVM Finance", url: "https://nvm-finance.fr" },
    mainEntityOfPage: sansWww(post.canonical_url) || `https://nvm-finance.fr/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogPostClient post={post} />
    </>
  );
}
