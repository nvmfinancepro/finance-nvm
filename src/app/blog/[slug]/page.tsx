import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog";
import BlogPostClient from "./BlogPostClient";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const url = `https://www.nvm-finance.fr/blog/${post.slug}`;
  const canonical = post.canonical_url || url;
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
    author: { "@type": "Organization", name: "NVM Finance", url: "https://www.nvm-finance.fr" },
    publisher: { "@type": "Organization", name: "NVM Finance", url: "https://www.nvm-finance.fr" },
    mainEntityOfPage: post.canonical_url || `https://www.nvm-finance.fr/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogPostClient post={post} />
    </>
  );
}
