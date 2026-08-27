import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nvm-finance.fr"),
  title: "NVM Finance",
  description:
    "Pilotage financier externalisé et outils de gestion pour PME françaises : analyse mensuelle, trésorerie, planning et bien plus.",
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
