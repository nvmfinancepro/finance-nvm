import type { Metadata } from "next";
import DiagnosticClient from "./DiagnosticClient";

const title = "Diagnostic financier gratuit en 30 secondes | NVM Finance";
const description =
  "Testez la santé financière de votre entreprise gratuitement, sans compte ni mot de passe. 3 chiffres, une note sur 100, instantané.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://www.nvm-finance.fr/diagnostic",
  },
  openGraph: {
    title,
    description,
    url: "https://www.nvm-finance.fr/diagnostic",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return <DiagnosticClient />;
}
