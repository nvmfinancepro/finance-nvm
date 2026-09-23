import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const title = "DAF externalisé PME — Contrôle de gestion | NVM Finance";
const description =
  "DAF externalisé pour PME : un conseiller dédié pilote votre rentabilité et votre trésorerie chaque mois, alertes automatiques et outils sur mesure inclus.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: "NVM Finance",
            description:
              "DAF externalisé et contrôle de gestion pour PME françaises : pilotage financier, trésorerie, alertes automatiques et développement business.",
            serviceType: "DAF externalisé / Contrôle de gestion externalisé",
            url: "https://www.nvm-finance.fr",
            email: "nathan@nvm-finance.fr",
            telephone: "+33783657639",
            areaServed: "FR",
            priceRange: "€€",
          }),
        }}
      />
      <HomeClient />
    </>
  );
}
