import type { Metadata } from "next";
import FreeDashboardClient from "./FreeDashboardClient";

// Page d'atterrissage des publicités Meta (Facebook / Instagram) : un seul objectif,
// l'inscription au tableau de bord gratuit. Pas de menu pour ne pas disperser le
// visiteur, et pas d'indexation (doublon de /services pour Google).
const title = "Tableau de bord financier gratuit | NVM Finance";
const description =
  "Votre tableau de bord financier gratuit en quelques minutes : vous importez votre relevé bancaire, ventes, charges, marge, résultat et TVA sont classés automatiquement. Sans carte bancaire.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/tableau-de-bord-gratuit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return <FreeDashboardClient />;
}
