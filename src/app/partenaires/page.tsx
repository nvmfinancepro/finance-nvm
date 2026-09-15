import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5", red: "#dc2626", redBg: "#fef2f2", amber: "#d97706", amberBg: "#fffbeb" };

const title = "Nos partenaires | NVM Finance";
const description =
  "Nos deux services pour vos clients : pilotage financier mensuel et outils de gestion sur mesure, sous votre marque.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
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

function FlowStep({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 18px ${color}55`, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textAlign: "center", maxWidth: 140, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <svg width="16" height="30" viewBox="0 0 16 30" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 1v22M8 23l-5-5M8 23l5-5" stroke={C.border} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
      <style>{`
        .pf-grid9{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .pf-compare{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:640px){
          .pf-grid9{ grid-template-columns:repeat(2,1fr); }
          .pf-compare{ grid-template-columns:1fr; }
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

          {/* ── SERVICE 1 ── */}
          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 56, marginBottom: 8 }}>Service 1</p>
          <h2 style={{ ...h2Style, marginTop: 0 }}>Pilotage financier</h2>
          <p style={pStyle}>
            Nous sommes une entreprise de DAF externalisé. On regroupe tout le visuel financier de l&apos;entreprise,
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
            Ensuite, le conseiller analyse la situation en continu, que tout aille bien ou non. L&apos;objectif :
            aller chercher la meilleure rentabilité, anticiper les situations critiques avant qu&apos;elles
            n&apos;arrivent, et proposer des solutions concrètes.
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
                {["Négociation fournisseurs", "Ajustement des prix", "Automatisation d'une tâche répétitive", "Suppression d'un abonnement inutile"].map((s, i) => (
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

          {/* ── SERVICE 2 ── */}
          <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 64, marginBottom: 8 }}>Service 2</p>
          <h2 style={{ ...h2Style, marginTop: 0 }}>Outils de gestion sur mesure</h2>
          <p style={pStyle}>
            Même logique, appliquée à l&apos;organisation de l&apos;entreprise. On crée un logiciel sur mesure,
            avec uniquement les modules dont le client a besoin.
          </p>

          <div style={{ marginTop: 28, background: "#fff", borderRadius: 24, boxShadow: "0 32px 80px rgba(0,86,83,.14), 0 0 0 1px rgba(0,86,83,.06)", padding: "24px 20px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#6aaca8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Module Gestion</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Votre plateforme de gestion</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, padding: "5px 12px", borderRadius: 100, border: `1px solid ${C.border}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: C.primary }}>En direct</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                {[
                  <path key="a" d="M2.5 6.5L9 3l6.5 3.5M2.5 6.5v6L9 16l6.5-3.5v-6M2.5 6.5L9 10m0 0l6.5-3.5M9 10v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
                  <g key="b"><rect x="2.5" y="4" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M2.5 7.5h13M6 2.5v3M12 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></g>,
                  <path key="c" d="M9 2.5c-2.2 0-4 1.8-4 4v2.5c0 .8-.3 1.6-.9 2.2L3 12.5h12l-1.1-1.3c-.6-.6-.9-1.4-.9-2.2V6.5c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
                  <path key="d" d="M2.5 5a1 1 0 011-1h3.5l1.5 1.5H14a1 1 0 011 1v7a1 1 0 01-1 1H3.5a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
                  <g key="e"><path d="M3 15V9.5M9 15V3M15 15v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M2.5 15.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></g>,
                ].map((icon, ii) => (
                  <div key={ii} style={{ width: 38, height: 38, borderRadius: 11, background: "#f8fffe", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#6aaca8" }}>
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">{icon}</svg>
                  </div>
                ))}
                <div style={{ width: 38, height: 38, borderRadius: 11, background: C.primary, boxShadow: "0 6px 16px rgba(0,86,83,.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
              </div>
              <div style={{ flex: 1, background: C.bg, borderRadius: 14, border: `1.5px dashed ${C.light}`, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nouveau module</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.text, lineHeight: 1.3 }}>Votre outil, sur mesure</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: C.mid, lineHeight: 1.5 }}>Décrivez la tâche à automatiser, on la construit dans votre plateforme.</div>
                <div style={{ background: "#fff", borderRadius: 9, border: `1px dashed ${C.border}`, padding: "9px 11px", fontSize: 10, fontWeight: 600, color: "#9db8b5", fontStyle: "italic" }}>
                  Ex : suivi de mes commandes fournisseurs...
                </div>
                <div style={{ alignSelf: "flex-start", background: C.primary, color: "#fff", fontSize: 10, fontWeight: 800, padding: "7px 14px", borderRadius: 100, boxShadow: "0 4px 14px rgba(0,86,83,.25)" }}>
                  Construire mon outil →
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M9 2.5v2M9 13.5v2M15.5 9h-2M4.5 9h-2M13.5 4.5l-1.4 1.4M5.9 12.1l-1.4 1.4M13.5 13.5l-1.4-1.4M5.9 5.9L4.5 4.5" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="9" r="2.5" stroke={C.primary} strokeWidth="1.5" />
                  </svg>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: C.primary }}>Tâche automatisée en continu</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, background: "#fff", borderRadius: 14, boxShadow: "0 8px 28px rgba(0,86,83,.12), 0 0 0 1px rgba(0,86,83,.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div><div style={{ fontSize: 10, fontWeight: 800, color: C.primary }}>Chaque entreprise est différente</div><div style={{ fontSize: 9, fontWeight: 600, color: "#6aaca8" }}>On construit l&apos;outil qui va avec</div></div>
            </div>
          </div>
          <p style={captionStyle}>Chaque client a sa propre plateforme, avec les modules dont il a besoin.</p>

          <p style={{ ...pStyle, marginTop: 40 }}>
            Enfin, chaque tâche répétitive peut être automatisée, avec ou sans intelligence artificielle selon ce qui
            est le plus pertinent.
          </p>

          <Frame urlLabel="app.nvm-finance.fr · automatisations">
            <div className="pf-compare">
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 16px", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Tag color={C.mid} bg="#fff">Sans IA</Tag>
                <FlowStep
                  color={C.primary}
                  label="Une condition simple"
                  icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="6" cy="6" r="3" stroke="#fff" strokeWidth="1.7" /><path d="M9 6h6M6 9v6M9 15h6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" /><circle cx="14" cy="15" r="2.2" fill="#fff" /></svg>}
                />
                <FlowArrow />
                <FlowStep
                  color={C.primary}
                  label="Déclenche une action automatique"
                  icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M11 2 4 12h5l-1 6 7-10h-5l1-6z" fill="#fff" /></svg>}
                />
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 16px", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Tag color={C.green} bg="#fff">Avec IA</Tag>
                <FlowStep
                  color={C.green}
                  label="Une situation qui varie"
                  icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.6 5.4L17 9l-5.4 1.6L10 16l-1.6-5.4L3 9l5.4-1.6L10 2z" fill="#fff" /></svg>}
                />
                <FlowArrow />
                <FlowStep
                  color={C.green}
                  label="Une solution est proposée"
                  icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 3h8l2 2v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 9h6M7 12h6M7 6h3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></svg>}
                />
                <FlowArrow />
                <FlowStep
                  color={C.green}
                  label="Vous validez ou ajustez"
                  icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
              </div>
            </div>
          </Frame>
          <p style={captionStyle}>Automatisé, avec ou sans intelligence artificielle selon le besoin.</p>

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
