import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nvm-finance.fr"),
  title: "NVM Finance | DAF externalisé & contrôle de gestion pour PME",
  description:
    "DAF externalisé pour PME françaises : contrôle de gestion, pilotage de la trésorerie, alertes automatiques et développement business (outils sur mesure).",
  verification: {
    google: "BiGXExOnRDbNP0e1Nc9X4T6drt9toOMRpyWn_G8g2Hk",
  },
  openGraph: {
    siteName: "NVM Finance",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/videos/demo-poster.png",
        width: 1920,
        height: 1078,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Nunito, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
