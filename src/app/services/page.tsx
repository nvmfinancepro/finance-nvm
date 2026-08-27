import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";

const title = "Offres : pilotage financier, module gestion & sur-mesure | NVM Finance";
const description =
  "Pilotage financier mensuel dès 490€ HT/mois, module gestion (planning, tâches, stock) et outils sur-mesure. Trouvez l'offre adaptée à votre PME.";

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
