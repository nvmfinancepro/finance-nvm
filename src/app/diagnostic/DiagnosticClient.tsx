"use client";

import { useMemo, useState } from "react";
import { LogoSVG } from "@/components/ui/Logo";

const C = { primary: "#005653", green: "#21C45D", red: "#e5484d", orange: "#f5a524", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const Logo = ({ width = 120 }: { width?: number }) => (
  <LogoSVG width={width} showLabel={true} fillColor="#005552" brightGreen="#21C45D" labelColor="#005653" />
);

const NAV_LINKS = [{ h: "/", l: "Accueil" }, { h: "/services", l: "Nos offres" }, { h: "/on-vous-montre", l: "On vous montre" }, { h: "/diagnostic", l: "Simulateur" }, { h: "/blog", l: "Blog" }] as const;

const CTA_URL = "https://calendly.com/nvmfinance-pro/30min";

type Level = "green" | "orange" | "red";

function levelColor(level: Level) {
  return level === "green" ? C.green : level === "orange" ? C.orange : C.red;
}

function levelFromValue(v: number): Level {
  return v < 4 ? "red" : v < 7 ? "orange" : "green";
}

const QUESTIONS = [
  { key: "treso", label: "Visibilité sur votre trésorerie", left: "Aucune visibilité", right: "Visibilité totale" },
  { key: "surprises", label: "Surprises financières", left: "Fréquentes surprises", right: "Aucune surprise" },
  { key: "admin", label: "Temps perdu en administratif", left: "Beaucoup de temps perdu", right: "Aucun temps perdu" },
  { key: "rentabilite", label: "Connaissance de votre rentabilité", left: "Aucune idée", right: "Parfaitement maîtrisée" },
  { key: "accompagnement", label: "Accompagnement actuel", left: "Je me sens seul", right: "Bien accompagné" },
] as const;

type Values = Record<(typeof QUESTIONS)[number]["key"], number>;

const OPERATIONAL_KEYS = ["treso", "surprises", "admin", "rentabilite"] as const;

function computeDiagnostic(values: Values) {
  const entries = QUESTIONS.map(q => ({ ...q, value: values[q.key] }));
  const rawScore = Math.round((entries.reduce((s, e) => s + e.value, 0) / (entries.length * 10)) * 100);

  const weakAxes = entries.filter(e => (OPERATIONAL_KEYS as readonly string[]).includes(e.key) && e.value < 4);
  const wellAccompanied = values.accompagnement >= 7;

  // Being "bien accompagné" while a fundamental is still weak isn't neutral, it's a red flag on its
  // own: it means the current support isn't actually fixing the problem, so a plain average would
  // wrongly let a high accompagnement score paper over it. Penalize instead of averaging it away.
  const contradiction = wellAccompanied && weakAxes.length > 0;
  const penalty = contradiction ? 15 + (weakAxes.length - 1) * 10 : 0;
  const score = Math.max(0, Math.min(100, rawScore - penalty));

  let level: Level = score < 45 ? "red" : score < 75 ? "orange" : "green";
  if (contradiction && weakAxes.length >= 2) level = "red";
  else if (contradiction && level === "green") level = "orange";

  const status = { label: level === "red" ? "Danger" : level === "orange" ? "À surveiller" : "Sain", level };

  const weakest = entries.reduce((a, b) => (b.value < a.value ? b : a));

  let message: string;
  if (contradiction) {
    message = `Vous vous dites bien accompagné, mais « ${weakAxes[0].label} » reste un point faible : votre accompagnement actuel ne couvre pas le vrai pilotage financier.`;
  } else if (level === "red") {
    message = "Sur plusieurs points, vous naviguez à vue. C'est le moment d'y voir clair.";
  } else if (level === "orange") {
    message = `Votre gestion tient, mais « ${weakest.label} » reste un point faible.`;
  } else {
    message = "Vous avez une gestion solide. Voyons comment aller encore plus loin.";
  }

  return { score, status, entries, weakest, message };
}

function RangeSlider({
  label, value, onChange, left, right,
}: { label: string; value: number; onChange: (v: number) => void; left: string; right: string }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 10 }}>{label}</label>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.primary, height: 6, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mid, opacity: 0.75, maxWidth: "45%" }}>{left}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mid, opacity: 0.75, maxWidth: "45%", textAlign: "right" }}>{right}</span>
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polarToCartesian(cx, cy, r, a0);
  const p1 = polarToCartesian(cx, cy, r, a1);
  const largeArc = a0 - a1 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
}

// score -> angle: 0 points left (180deg), 100 points right (0deg)
const scoreToAngle = (score: number) => 180 - score * 1.8;

function Gauge({ score, level }: { score: number; level: Level }) {
  const cx = 140, cy = 138, r = 112;
  const needleAngle = scoreToAngle(score);
  const needleEnd = polarToCartesian(cx, cy, r - 22, needleAngle);

  return (
    <svg viewBox="0 0 280 160" style={{ width: "100%", maxWidth: 320, height: "auto", display: "block", margin: "0 auto" }}>
      <path d={arcPath(cx, cy, r, 180, 100.8)} stroke={C.red} strokeWidth={18} fill="none" strokeLinecap="round" />
      <path d={arcPath(cx, cy, r, 100.8, 46.8)} stroke={C.orange} strokeWidth={18} fill="none" strokeLinecap="round" />
      <path d={arcPath(cx, cy, r, 46.8, 0)} stroke={C.green} strokeWidth={18} fill="none" strokeLinecap="round" />
      <g style={{ transition: "transform 0.4s ease" }}>
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={8} fill={C.text} />
      </g>
      <text x={cx} y={cy - 34} textAnchor="middle" fontSize={34} fontWeight={900} fill={levelColor(level)}>{score}</text>
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.mid}>/ 100</text>
    </svg>
  );
}

export default function DiagnosticClient() {
  const [values, setValues] = useState<Values>({ treso: 5, surprises: 5, admin: 5, rentabilite: 5, accompagnement: 5 });
  const [menuOpen, setMenuOpen] = useState(false);

  const diag = useMemo(() => computeDiagnostic(values), [values]);
  const setValue = (key: keyof Values) => (v: number) => setValues(prev => ({ ...prev, [key]: v }));

  const solid = diag.status.level === "green";

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
          <Logo width={80} />
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

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
          Gratuit · Sans compte · 30 secondes
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 14, textAlign: "center" }}>
          Comment gérez-vous vraiment les finances de votre entreprise ?
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.mid, marginBottom: 40, textAlign: "center" }}>
          Positionnez chaque curseur là où vous vous sentez. Rien n&apos;est enregistré, tout se calcule dans votre navigateur.
        </p>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 26px", marginBottom: 32 }}>
          {QUESTIONS.map(q => (
            <RangeSlider
              key={q.key}
              label={q.label}
              left={q.left}
              right={q.right}
              value={values[q.key]}
              onChange={setValue(q.key)}
            />
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <Gauge score={diag.score} level={diag.status.level} />
          <p style={{ fontSize: 17, fontWeight: 800, color: levelColor(diag.status.level), marginTop: 4 }}>
            {diag.status.label}
          </p>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "24px 20px 0", marginTop: 36 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 16 }}>
            Détail par point
          </p>

          <div style={{ position: "relative" }}>
            <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", paddingBottom: 24 }} aria-hidden="true">
              {diag.entries.map(e => (
                <DetailRow key={e.key} label={e.label} value={e.value < 4 ? "Point faible" : e.value < 7 ? "À surveiller" : "Point fort"} level={levelFromValue(e.value)} />
              ))}
            </div>

            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12, padding: "0 16px",
              background: "linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.92) 45%)",
            }}>
              <p style={{ fontSize: 14.5, fontWeight: 800, color: levelColor(diag.status.level), textAlign: "center", maxWidth: 340 }}>
                {diag.message}
              </p>
              <a
                href={CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100,
                  fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 24px rgba(0,86,83,.25)",
                }}
              >
                {solid ? "Échanger avec un conseiller →" : "Réserver un appel gratuit →"}
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ background: "#002e2c", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>
          © 2026 NVM Finance · <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>Accueil</a> · <a href="/services" style={{ color: "rgba(255,255,255,.4)" }}>Nos offres</a>
        </p>
      </footer>
    </div>
  );
}

function DetailRow({ label, value, level }: { label: string; value: string; level: Level }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 20px", background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 14, marginBottom: 12,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: levelColor(level) }}>{value}</span>
    </div>
  );
}
