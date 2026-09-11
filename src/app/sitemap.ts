import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.nvm-finance.fr";
  const posts = await getPublishedPosts();

  return [
    {
      url: `${base}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/services`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/on-vous-montre`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/pilotage-financier-pme`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/automatisation-gestion-pme`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.published_at ? new Date(p.published_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
