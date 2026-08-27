import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.nvm-finance.fr";

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
  ];
}
