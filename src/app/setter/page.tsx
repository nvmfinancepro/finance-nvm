import type { Metadata } from "next";
import SetterApp from "./SetterApp";

export const metadata: Metadata = {
  title: "Espace setter | NVM Finance",
  robots: { index: false, follow: false },
};

export default function SetterPage() {
  return <SetterApp />;
}
