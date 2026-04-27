"use client";

interface LogoProps {
  width?: number;
  showLabel?: boolean;
  fillColor?: string;
  brightGreen?: string;
  labelColor?: string;
}

export function LogoSVG({
  width = 120,
  showLabel = false,
  fillColor = "#005552",
  brightGreen = "#21C45D",
  labelColor = "#005653",
}: LogoProps) {
  return (
    <div className="flex flex-col items-center" style={{ gap: Math.round(width * 0.07) }}>
      {/*
        Remplacer les paths ci-dessous par ceux de votre fichier logo_copie-2.svg
        Les chemins complets sont dans le fichier NVMFinance.jsx original (const LogoSVG)
        fillColor = parties sombres du logo (vert foncé ou blanc selon le contexte)
        brightGreen = accent vert vif (inchangé)
      */}
      <svg
        viewBox="138 71 730 519"
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        style={{ display: "block" }}>
        {/* COLLER ICI LES PATHS DU FICHIER logo_copie-2.svg */}
        {/* Remplacer fill="#005552" par fill={fillColor} */}
        {/* Remplacer fill="#21C45D" par fill={brightGreen} */}
        <text x="50%" y="50%" textAnchor="middle" fill={fillColor} fontSize="60" fontWeight="900">NVM</text>
      </svg>
      {showLabel && (
        <div style={{ fontSize: Math.max(9, Math.round(width * 0.12)), color: labelColor }}
          className="font-black uppercase tracking-widest text-center">
          NVM Finance
        </div>
      )}
    </div>
  );
}
