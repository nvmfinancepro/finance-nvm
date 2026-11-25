import type { Metadata } from "next";
import TvaApp from "./TvaApp";

export const metadata: Metadata = {
  title: "Rapprochement CA / CA3 | NVM Finance",
  robots: { index: false, follow: false },
};

export default function TvaPage() {
  return <TvaApp />;
}
