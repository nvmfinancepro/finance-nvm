"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import type { BlogPost } from "@/lib/blog";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const Logo = ({ width = 120 }: { width?: number }) => (
  <LogoSVG width={width} showLabel={true} fillColor="#005552" brightGreen="#21C45D" labelColor="#005653" />
);

const NAV_LINKS = [{ h: "/", l: "Accueil" }, { h: "/services", l: "Nos offres" }, { h: "/on-vous-montre", l: "On vous montre" }, { h: "/diagnostic", l: "Simulateur" }, { h: "/blog", l: "Blog" }] as const;

const sectionStyle = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const pStyle = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 16 };

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Convention de rédaction (voir /api/blog/generate) : "**Titre**" sur sa propre ligne = sous-titre,
// "- " en début de ligne = puce, ligne vide = saut de paragraphe.
function renderBody(body: string) {
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} style={{ paddingLeft: 20, margin: "0 0 16px" }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ ...pStyle, marginBottom: 8 }}>{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^\*\*.+\*\*$/.test(trimmed)) {
      flushList(`ul-${i}`);
      blocks.push(
        <h2 key={i} style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 40, marginBottom: 14 }}>
          {trimmed.replace(/\*\*/g, "")}
        </h2>
      );
    } else if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed) {
      flushList(`ul-${i}`);
      blocks.push(<p key={i} style={pStyle}>{trimmed}</p>);
    }
  });
  flushList("ul-end");
  return blocks;
}

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
      <WhatsAppWidget />
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

      <article style={{ padding: "0 0 96px" }}>
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block", marginBottom: 40 }}
          />
        )}
        <div style={sectionStyle}>
          {post.theme && (
            <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              {post.theme}
            </p>
          )}
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 14 }}>{post.title}</h1>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.light, marginBottom: 32 }}>
            {post.author} · {formatDate(post.published_at)}
          </div>

          {renderBody(post.body)}

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Envie de reprendre la main sur votre gestion ?
            </p>
            <a
              href="https://calendly.com/nvmfinance-pro/30min"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 800, textDecoration: "none", display: "inline-block", boxShadow: "0 4px 24px rgba(0,86,83,.25)" }}
            >
              Demander une analyse gratuite
            </a>
          </div>

          <div style={{ marginTop: 32 }}>
            <a href="/blog" style={{ fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: "none" }}>← Tous les articles</a>
          </div>
        </div>
      </article>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>
          © 2026 NVM Finance · <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>Accueil</a> · <a href="/services" style={{ color: "rgba(255,255,255,.4)" }}>Nos offres</a>
        </p>
      </footer>
    </div>
  );
}
