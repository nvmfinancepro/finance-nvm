import type { Metadata } from "next";

// page.tsx est un composant client (pas d'export metadata possible) : la canonique est déclarée ici.
export const metadata: Metadata = {
  alternates: { canonical: "https://nvm-finance.fr/cgv" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
