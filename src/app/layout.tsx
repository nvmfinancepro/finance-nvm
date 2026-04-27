import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "@/styles/globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "NVM Finance — Tableau de bord",
  description: "Logiciel de conseil financier NVM Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={nunito.variable}>
      <body className="font-sans antialiased bg-nvm-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
