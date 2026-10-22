import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import WhatsAppWidget from "@/components/WhatsAppWidget";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5", red: "#dc2626", redBg: "#fef2f2", amber: "#d97706", amberBg: "#fffbeb" };

const title = "Nos partenaires | NVM Finance";
const description =
  "Notre service pour vos clients : de la visibilité financière et une analyse mensuelle pour gagner en performance, sécuriser et développer leur entreprise, sous votre marque.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: "https://nvm-finance.fr/partenaires" },
};

const sectionStyle: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 24px" };
const h2Style: CSSProperties = { fontSize: 26, fontWeight: 900, color: C.text, marginTop: 56, marginBottom: 14 };
const pStyle: CSSProperties = { fontSize: 16, lineHeight: 1.75, color: C.mid, marginBottom: 16 };
const captionStyle: CSSProperties = { fontSize: 13.5, fontWeight: 700, color: C.primary, textAlign: "center", marginTop: 14 };

function Frame({ urlLabel, children }: { urlLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.08)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: C.mid, background: C.bg, padding: "4px 12px", borderRadius: 100 }}>{urlLabel}</span>
      </div>
      <div style={{ padding: "20px 22px 22px" }}>{children}</div>
    </div>
  );
}

function Tag({ children, color = C.mid, bg = C.bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color, background: bg, padding: "4px 10px", borderRadius: 100 }}>{children}</span>;
}

const statTiles = [
  { l: "Trésorerie", v: "18 240 €", status: "ok", trend: "up" },
  { l: "Marge brute", v: "34,2 %", status: "ok", trend: "up" },
  { l: "Résultat", v: "2 380 €", status: "ok", trend: "up" },
  { l: "TVA à venir", v: "3 100 €", status: "watch", trend: "flat" },
  { l: "IS provisionné", v: "1 640 €", status: "watch", trend: "flat" },
  { l: "Emprunts", v: "2 contrats", status: "ok", trend: "flat" },
  { l: "Investissements", v: "1 en cours", status: "ok", trend: "flat" },
  { l: "Créances clients", v: "6 400 €", status: "watch", trend: "up" },
  { l: "Dettes fournisseurs", v: "4 100 €", status: "ok", trend: "down" },
] as const;

const statusColor = { ok: C.green, watch: C.amber, alert: C.red } as const;
const trendArrow = { up: "▲", down: "▼", flat: "•" } as const;
const trendColor = { up: C.green, down: C.red, flat: C.light } as const;

export default function Page() {
  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
      <WhatsAppWidget/>
      <style>{`
        .pf-grid9{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        @media(max-width:640px){
          .pf-grid9{ grid-template-columns:repeat(2,1fr); }
        }
      `}</style>

      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoSVG width={36} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.primary }}>NVM Finance</span>
          </a>
          <nav style={{ display: "flex", gap: 18 }}>
            <a href="/services" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Nos offres</a>
            <a href="/on-vous-montre" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>On vous montre</a>
            <a href="/diagnostic" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Simulateur</a>
          </nav>
        </div>
      </header>

      <article style={{ padding: "56px 0 96px" }}>
        <div style={sectionStyle}>
          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Nos partenaires</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 20 }}>
            Une vente complémentaire qui vous crée une source de revenu stable.
          </h1>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Vous recommandez notre service à un client. Chaque mois, tant qu&apos;il reste client, vous touchez une
            commission sur son chiffre d&apos;affaires avec nous. Pas un bonus ponctuel à la signature : un revenu
            qui continue tant que le contrat existe.
          </p>
          <p style={{ ...pStyle, fontSize: 18 }}>
            Plus vos clients restent, plus ce revenu grandit. Un vrai investissement sur le long terme, que{" "}
            <strong style={{ color: C.green, fontWeight: 900 }}>+15 partenaires</strong> ont déjà compris.
          </p>

          <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 380px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.08)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Votre revenu cumulé grandit avec votre portefeuille</span>
                <Tag color={C.mid} bg={C.bg}>Exemple illustratif</Tag>
              </div>
              <p style={{ fontSize: 12.5, color: C.light, fontWeight: 600, marginBottom: 4 }}>Comme des cercles de croissance : chaque client s&apos;ajoute aux précédents, rien ne se perd.</p>
              <svg viewBox="0 0 400 140" width="100%" style={{ display: "block", overflow: "visible" }}>
                <circle cx="110" cy="70" r="58" fill={C.green} opacity="0.16" />
                <circle cx="110" cy="70" r="58" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.4" />
                <circle cx="110" cy="70" r="40" fill={C.green} opacity="0.32" />
                <circle cx="110" cy="70" r="40" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.55" />
                <circle cx="110" cy="70" r="20" fill={C.green} />
                {[
                  { r: 58, y: 12, t: "10 clients" },
                  { r: 40, y: 30, t: "5 clients" },
                  { r: 20, y: 54, t: "1 client" },
                ].map((ring, i) => (
                  <g key={i}>
                    <circle cx="110" cy={70 - ring.r} r="3" fill={C.green} />
                    <path d={`M110,${70 - ring.r} L240,${ring.y}`} stroke={C.border} strokeWidth="1.5" strokeDasharray="2 4" />
                    <text x="248" y={ring.y + 4} fontSize="13" fontWeight="800" fill={C.text}>{ring.t}</text>
                  </g>
                ))}
              </svg>
            </div>

            <div style={{ flex: "1 1 180px", background: C.primary, borderRadius: 18, boxShadow: "0 16px 36px rgba(0,86,83,.18)", padding: "22px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
                  <path d="M24 5v6h-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M2 21v-6h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M4.51 10a9 9 0 0114.13-3.36L24 11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M21.49 16a9 9 0 01-14.13 3.36L2 15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <text x="13" y="17.3" textAnchor="middle" fontFamily="'Nunito',sans-serif" fontSize="12" fontWeight="800" fill={C.green}>€</text>
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>De l&apos;argent qui travaille pour vous</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}>Généré automatiquement, chaque mois, sans action de votre part</div>
            </div>
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 56, marginBottom: 8 }}>Notre service</p>
          <h2 style={{ ...h2Style, marginTop: 0 }}>Pilotage financier</h2>
          <p style={pStyle}>
            Nous sommes une entreprise de contrôle de gestion externalisé. On regroupe tout le visuel financier de l&apos;entreprise,
            au même endroit.
          </p>

          <Frame urlLabel="app.nvm-finance.fr · tableau de bord">
            <Tag color={C.primary} bg={C.bg}>Exemple : vue d&apos;ensemble</Tag>
            <div className="pf-grid9" style={{ marginTop: 12 }}>
              {statTiles.map((t, i) => (
                <div key={i} style={{ position: "relative", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", background: C.bg }}>
                  <div style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: statusColor[t.status] }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: C.light, paddingRight: 12 }}>{t.l}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.v}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: trendColor[t.trend] }}>{trendArrow[t.trend]}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: C.light, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trésorerie</span>
                  <span style={{ fontSize: 8.5, fontWeight: 800, color: C.green, background: C.bg, padding: "2px 6px", borderRadius: 100 }}>Prévisionnel</span>
                </div>
                <svg viewBox="0 0 220 54" width="100%" style={{ display: "block" }}>
                  <path d="M4,42 C28,38 38,26 62,28 C86,30 92,15 118,14" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M118,14 C142,13 152,4 176,3" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
                  <circle cx="118" cy="14" r="3" fill={C.primary} />
                  <line x1="118" y1="2" x2="118" y2="48" stroke={C.border} strokeWidth="1" strokeDasharray="2 3" />
                  <text x="118" y="52" fontSize="7.5" fontWeight="800" fill={C.light} textAnchor="middle">aujourd&apos;hui</text>
                </svg>
              </div>
              <div style={{ flex: "1 1 180px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: C.light, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comparatif</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 19, fontWeight: 900, color: C.text }}>24 800 €</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.green }}>+12 % vs mois dernier</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.mid }}>Chiffre d&apos;affaires, ce mois</span>
              </div>
            </div>
          </Frame>
          <p style={captionStyle}>Chiffres, courbes, comparatifs, prévisionnel et alertes : tout le pilotage financier, au même endroit.</p>

          <p style={{ ...pStyle, marginTop: 40 }}>
            Ensuite, le conseiller analyse la situation chaque mois, que tout aille bien ou non. L&apos;objectif :
            aller chercher plus de performance, sécuriser l&apos;entreprise en anticipant les situations critiques
            avant qu&apos;elles n&apos;arrivent, et la développer avec des solutions concrètes.
          </p>

          <Frame urlLabel="app.nvm-finance.fr · alertes">
            <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, borderLeft: `4px solid ${C.red}`, background: C.redBg }}>
              <span style={{ fontSize: 17 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>Trésorerie prévisionnelle en baisse</div>
                <div style={{ fontSize: 12.5, color: C.mid, marginTop: 2 }}>Le résultat net continue de se dégrader si rien ne change</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "14px 16px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.light }}>Solutions proposées par le conseiller</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {["Négociation fournisseurs", "Ajustement des prix", "Relance des factures impayées", "Suppression d'un abonnement inutile"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.text }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: C.green, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
                    {s}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.green }}>Valeur créée estimée : 9 800 €</div>
            </div>
          </Frame>
          <p style={captionStyle}>Le conseiller cherche la meilleure performance en continu, pas seulement quand un problème apparaît.</p>

          <h2 style={h2Style}>Comment démarre une collaboration</h2>
          <p style={pStyle}>
            On regarde ensemble votre portefeuille de clients et les besoins prioritaires de chacun. Chaque dossier
            est opérationnel en 48h, sous votre marque et sans engagement de durée. Le client reçoit son analyse
            chaque mois ; vous gardez la même vision pour vos propres échanges avec lui.
          </p>

          <div style={{ marginTop: 48, padding: "32px 28px", background: C.bg, borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>
              Discutons de votre portefeuille
            </p>
            <a
              href="https://calendly.com/nvmfinance-pro/30min"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 800, textDecoration: "none", display: "inline-block", boxShadow: "0 4px 24px rgba(0,86,83,.25)" }}
            >
              Prendre rendez-vous →
            </a>
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
