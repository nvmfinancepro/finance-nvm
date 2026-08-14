const P = "#005653", G = "#21C45D", MID = "#2d6b68";

export const metadata = {
  title: "Démo — NVM Finance",
};

export default function DemoPage() {
  return (
    <div className="demo-wrap" style={{ background: "#f0f9f7", minHeight: "100vh", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "80px 16px 40px", gap: 28 }}>

      <style>{`
        @media(max-width:640px){
          .demo-wrap{justify-content:flex-start!important;padding:64px 0 32px!important;gap:20px!important;}
          .demo-video-box{width:100%!important;border-radius:0!important;box-shadow:none!important;}
          .demo-hint{display:block!important;}
        }
      `}</style>

      <a href="/" style={{ position: "fixed", top: 14, left: 18, zIndex: 10,
        fontSize: 11, fontWeight: 700, color: MID, textDecoration: "none",
        letterSpacing: ".05em", opacity: .55 }}>← Retour</a>

      <div className="demo-video-box" style={{ width: "min(1100px,92vw)", borderRadius: 22, overflow: "hidden",
        boxShadow: "0 2px 0 1px rgba(0,86,83,.08),0 40px 100px rgba(0,86,83,.2)" }}>
        <video
          src="/videos/demo.mp4"
          poster="/videos/demo-poster.png"
          controls
          playsInline
          preload="metadata"
          style={{ display: "block", width: "100%", height: "auto", background: "#000" }}
        />
      </div>

      <p className="demo-hint" style={{ display: "none", fontSize: 11.5, fontWeight: 700, color: MID,
        opacity: .6, textAlign: "center", padding: "0 24px", margin: 0 }}>
        Astuce : passez la vidéo en plein écran (icône ⛶) pour mieux lire les détails.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 16px" }}>
        <a href="https://calendly.com/nvmfinance-pro/30min" target="_blank" rel="noopener noreferrer"
          style={{ background: G, color: "#fff", padding: "13px 30px", borderRadius: 100,
            fontSize: 14, fontWeight: 900, textDecoration: "none",
            boxShadow: "0 8px 26px rgba(33,196,93,.35)" }}>
          Demander une analyse gratuite →
        </a>
        <a href="/services" style={{ color: MID, fontSize: 11.5, fontWeight: 700,
          textDecoration: "none", opacity: .6 }}>
          Voir nos offres
        </a>
      </div>
    </div>
  );
}
