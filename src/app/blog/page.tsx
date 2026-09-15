import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog";
import BlogClient from "./BlogClient";

export const revalidate = 60;

const title = "Blog | Gestion et pilotage financier PME — NVM Finance";
const description =
  "Trésorerie, comptabilité, pilotage financier et automatisation de la gestion : conseils pratiques pour dirigeants de TPE/PME.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/blog",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function Page() {
  const posts = await getPublishedPosts();
  return <BlogClient posts={posts} />;
}
