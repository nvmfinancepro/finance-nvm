import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth", "/set-password", "/api"],
    },
    sitemap: "https://www.nvm-finance.fr/sitemap.xml",
  };
}
