import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NVM Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, fontFamily: "Nunito, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
