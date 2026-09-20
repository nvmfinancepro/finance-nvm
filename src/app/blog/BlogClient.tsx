"use client";

import { useState } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import type { BlogPost } from "@/lib/blog";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const Logo = ({ width = 120 }: { width?: number }) => (
  <LogoSVG width={width} showLabel={true} fillColor="#005552" brightGreen="#21C45D" labelColor="#005653" />
);

const NAV_LINKS = [{ h: "/", l: "Accueil" }, { h: "/services", l: "Nos offres" }, { h: "/on-vous-montre", l: "On vous montre" }, { h: "/diagnostic", l: "Simulateur" }, { h: "/blog", l: "Blog" }] as const;

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
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
          {[...NAV_LINKS, { h: "/auth/login", l: "Espace client", ext: true }].map((lk: any, i) => (
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

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Blog</p>
        <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
          Gestion et pilotage financier des PME
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 44 }}>
          Trésorerie, comptabilité, pilotage financier, automatisation : des articles pratiques pour dirigeants de
          TPE/PME, sans jargon.
        </p>

        {posts.length === 0 ? (
          <p style={{ fontSize: 15, color: C.mid }}>Aucun article publié pour l&apos;instant. Revenez bientôt.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {posts.map((p) => (
              <a
                key={p.id}
                href={`/blog/${p.slug}`}
                style={{ display: "block", padding: "24px 26px", background: C.bg, borderRadius: 16, textDecoration: "none", color: "inherit" }}
              >
                {p.theme && (
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    {p.theme}
                  </div>
                )}
                <div style={{ fontSize: 21, fontWeight: 900, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{p.title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.mid, marginBottom: 10 }}>{p.excerpt}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.light }}>{formatDate(p.published_at)}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>
          © 2026 NVM Finance · <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>Accueil</a> · <a href="/services" style={{ color: "rgba(255,255,255,.4)" }}>Nos offres</a>
        </p>
      </footer>
    </div>
  );
}
