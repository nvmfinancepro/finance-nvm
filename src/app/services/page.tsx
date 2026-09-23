import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";

const title = "Offres DAF externalisé & contrôle de gestion | NVM Finance";
const description =
  "DAF externalisé dès 200€ HT/mois : tableau de bord, conseiller dédié en option, module gestion (planning, tâches, stock) et outils sur mesure.";

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
