"use client";
import { useState } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", text: "#002e2c", mid: "#2d6b68", border: "#c8e8e5" };

const Logo = ({ width = 120 }) => <LogoSVG width={width} showLabel={true} fillColor="#005552" brightGreen="#21C45D" labelColor="#005653" />;
const NAV_LINKS = [{ h: "/", l: "Accueil" }, { h: "/services", l: "Nos offres" }, { h: "/on-vous-montre", l: "On vous montre" }, { h: "/diagnostic", l: "Simulateur" }, { h: "/blog", l: "Blog" }];

export default function DemoVideoClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#f0f9f7", minHeight: "100vh", color: C.text }}>
      <style>{`
        .drawer{display:none!important;}
        .mobile-ham{display:none;}
        .nav-link:hover{color:#005653!important;background:#f0faf8;}
        @media(max-width:768px){
          .desktop-links{display:none!important;}
          .desktop-actions{display:none!important;}
          .mobile-ham{display:flex!important;}
          .nav-inner{padding:14px 20px!important;}
          .drawer{display:flex!important;flex-direction:column!important;}
        }
        @media(max-width:640px){
          .demo-wrap{justify-content:flex-start!important;padding:24px 0 32px!important;gap:20px!important;}
          .demo-video-box{width:100%!important;border-radius:0!important;box-shadow:none!important;}
          .demo-hint{display:block!important;}
        }
      `}</style>

      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div className="nav-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 48px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center" }}><Logo width={80} /></a>
          <div className="desktop-links" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {NAV_LINKS.map((lk, i) => (
              <a key={i} href={lk.h} className="nav-link" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none", padding: "7px 14px", borderRadius: 8, transition: "all .2s" }}>{lk.l}</a>
            ))}
          </div>
          <div className="desktop-actions" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/auth/login" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none", padding: "7px 14px", borderRadius: 8 }}>Espace client</a>
            <a href="https://calendly.com/nvmfinance-pro/30min" target="_blank" rel="noopener noreferrer" style={{ background: C.primary, color: "#fff", padding: "9px 22px", borderRadius: 100, fontSize: 13, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,86,83,.2)" }}>Prendre RDV</a>
          </div>
          <button className="mobile-ham" onClick={() => setMenuOpen(true)} style={{ display: "none", flexDirection: "column", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <span style={{ display: "block", width: 22, height: 2, background: C.primary, borderRadius: 2 }} />
            <span style={{ display: "block", width: 22, height: 2, background: C.primary, borderRadius: 2 }} />
            <span style={{ display: "block", width: 22, height: 2, background: C.primary, borderRadius: 2 }} />
          </button>
        </div>
        {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 199, backdropFilter: "blur(2px)" }} />}
        <div className="drawer" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "75%", maxWidth: 300, background: "#fff", zIndex: 200, transform: menuOpen ? "translateX(0)" : "translateX(100%)", transition: "transform .3s ease", boxShadow: "-8px 0 32px rgba(0,0,0,.1)", display: "flex", flexDirection: "column", padding: "24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
            <LogoSVG width={70} showLabel={true} fillColor="#005552" brightGreen="#21C45D" labelColor="#005653" />
            <button onClick={() => setMenuOpen(false)} style={{ fontSize: 20, cursor: "pointer", color: "#6aaca8", background: "none", border: "none", padding: 4 }}>✕</button>
          </div>
          {[...NAV_LINKS, { h: "/auth/login", l: "Espace client", ext: true }].map((lk, i) => (
            <a key={i} href={lk.h} target={lk.ext ? "_blank" : undefined} rel={lk.ext ? "noopener noreferrer" : undefined} onClick={() => setMenuOpen(false)}
              style={{ display: "block", padding: "16px 24px", fontSize: 15, fontWeight: 700, color: C.text, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              {lk.l}
            </a>
          ))}
          <div style={{ padding: "20px 24px", marginTop: "auto" }}>
            <a href="https://calendly.com/nvmfinance-pro/30min" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
              style={{ display: "block", background: C.primary, color: "#fff", padding: "14px", borderRadius: 100, fontSize: 14, fontWeight: 900, textDecoration: "none", textAlign: "center" }}>
              Prendre RDV
            </a>
          </div>
        </div>
      </header>

      <div className="demo-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 16px 40px", gap: 28 }}>
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

        <p className="demo-hint" style={{ display: "none", fontSize: 11.5, fontWeight: 700, color: C.mid,
          opacity: .6, textAlign: "center", padding: "0 24px", margin: 0 }}>
          Astuce : passez la vidéo en plein écran (icône ⛶) pour mieux lire les détails.
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 16px" }}>
          <a href="https://calendly.com/nvmfinance-pro/30min" target="_blank" rel="noopener noreferrer"
            style={{ background: C.green, color: "#fff", padding: "13px 30px", borderRadius: 100,
              fontSize: 14, fontWeight: 900, textDecoration: "none",
              boxShadow: "0 8px 26px rgba(33,196,93,.35)" }}>
            Demander une analyse gratuite →
          </a>
          <a href="/services" style={{ color: C.mid, fontSize: 11.5, fontWeight: 700,
            textDecoration: "none", opacity: .6 }}>
            Voir nos offres
          </a>
        </div>
      </div>
    </div>
  );
}
