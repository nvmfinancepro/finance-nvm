import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";

const title = "Offres de contrôle de gestion externalisé | NVM Finance";
const description =
  "Contrôle de gestion externalisé : tableau de bord gratuit, pilotage mensuel avec conseiller dédié à 490€ HT/mois sans engagement, ou audit complet one shot.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/services",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/services",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return <ServicesClient />;
}
