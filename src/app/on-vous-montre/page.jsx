import DemoVideoClient from "./DemoVideoClient";

const title = "Démo : découvrez NVM Finance en vidéo | Pilotage financier PME";
const description =
  "Regardez en 2 minutes comment NVM Finance centralise vos finances, votre analyse mensuelle et vos outils de gestion dans un seul tableau de bord.";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/on-vous-montre",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/on-vous-montre",
    type: "website",
    images: ["/videos/demo-poster.png"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function DemoPage() {
  return <DemoVideoClient />;
}
