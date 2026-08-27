import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const title = "Pilotage financier & outils de gestion pour PME | NVM Finance";
const description =
  "Un conseiller dédié analyse vos finances chaque mois, identifie les leviers d'optimisation et automatise votre gestion. Mise en place en 48h, sans engagement.";

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
              "Pilotage financier externalisé et outils de gestion pour PME françaises",
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
