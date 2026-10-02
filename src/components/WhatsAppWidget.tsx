"use client";

// Numéro repris du JSON-LD du site (src/app/page.tsx) — à confirmer.
const WHATSAPP_NUMBER = "33783657639";
const MESSAGE = "Bonjour, je souhaite en savoir plus sur NVM Finance.";

export default function WhatsAppWidget() {
  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .nvm-wa-btn { padding: 14px !important; }
          .nvm-wa-text { display: none; }
        }
      `}</style>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Nous contacter sur WhatsApp"
        className="nvm-wa-btn"
        style={{
          position: "fixed",
          left: 20,
          bottom: 20,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#25D366",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 100,
          padding: "12px 18px 12px 12px",
          boxShadow: "0 8px 28px rgba(0,0,0,.28)",
          fontFamily: "'Nunito',sans-serif",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.46 3.44 1.32 4.95L2 22l5.27-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.07c-.24.68-1.41 1.3-1.95 1.37-.5.07-1.13.1-1.82-.12-.42-.13-.96-.3-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.65.5.24.58.81 2 .88 2.14.07.14.12.3.02.49-.1.2-.15.32-.3.49-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.68-.17 1.36Z"/>
        </svg>
        <span className="nvm-wa-text" style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>Réponse rapide</span>
      </a>
    </>
  );
}
