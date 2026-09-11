"use client";

import { useMemo, useState } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import { fmt } from "@/lib/finance";

const C = { primary: "#005653", green: "#21C45D", red: "#e5484d", orange: "#f5a524", bg: "#ecfdf5", text: "#002e2c", mid: "#2d6b68", light: "#a7d4d0", border: "#c8e8e5" };

const CTA_URL = "https://calendly.com/nvmfinance-pro/30min";
const OFFRES_URL = "/services";

type Level = "green" | "orange" | "red";

function levelColor(level: Level) {
  return level === "green" ? C.green : level === "orange" ? C.orange : C.red;
}

function computeDiagnostic(ca: number, charges: number, treso: number) {
  const ebe = ca - charges;
  const tauxCharges = ca > 0 ? (charges / ca) * 100 : 0;
  const moisCouverture = charges > 0 ? treso / charges : treso > 0 ? 3 : 0;

  let score = 100;
  let rentaLevel: Level = "green";
  if (ebe < 0) {
    score -= 45;
    rentaLevel = "red";
  } else if (tauxCharges > 85) {
    score -= 20;
    rentaLevel = "orange";
  }

  let tresoLevel: Level = "green";
  if (treso < 0) {
    score -= 45;
    tresoLevel = "red";
  } else if (moisCouverture < 1) {
    score -= 30;
    tresoLevel = "orange";
  } else if (moisCouverture < 2) {
    score -= 10;
    tresoLevel = "orange";
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // The label always reflects the single worst signal, not the raw point total —
  // a negative trésorerie must never read as merely "à surveiller".
  const worst: Level =
    rentaLevel === "red" || tresoLevel === "red" ? "red" :
    rentaLevel === "orange" || tresoLevel === "orange" ? "orange" : "green";

  if (worst === "red") score = Math.min(score, 44);
  else if (worst === "orange") score = Math.min(Math.max(score, 45), 74);
  else score = Math.max(score, 75);

  const status =
    worst === "red" ? { label: "Danger", level: "red" as Level } :
    worst === "orange" ? { label: "À surveiller", level: "orange" as Level } :
    { label: "Sain", level: "green" as Level };

  const projection = Array.from({ length: 6 }, (_, i) => ({
    month: i,
    value: treso + ebe * i,
  }));

  let message: string;
  if (tresoLevel === "red") {
    message = "Votre trésorerie est déjà dans le rouge.";
  } else if (moisCouverture < 1) {
    message = "Au rythme actuel, votre trésorerie ne tient pas 1 mois de charges.";
  } else if (rentaLevel === "red") {
    message = "Votre activité ne dégage pas de bénéfice ce mois-ci.";
  } else if (moisCouverture < 2) {
    message = `Votre trésorerie ne couvre que ${moisCouverture.toFixed(1)} mois de charges.`;
  } else if (rentaLevel === "orange") {
    message = "Vos charges représentent plus de 85 % de votre CA.";
  } else {
    message = "Voyez ce qui pourrait faire baisser ce score dans les prochains mois.";
  }

  return { ebe, tauxCharges, moisCouverture, score, status, rentaLevel, tresoLevel, projection, message };
}

function SliderField({
  label, value, onChange, min, max, step, hint,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; hint?: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{label}</label>
        <span style={{ fontSize: 16, fontWeight: 900, color: C.primary }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.primary, height: 6, cursor: "pointer" }}
      />
      {hint && <p style={{ fontSize: 11.5, color: C.mid, opacity: 0.7, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function ProjectionChart({ projection, level }: { projection: { month: number; value: number }[]; level: Level }) {
  const W = 560, H = 160, padL = 10, padR = 36, padT = 20, padB = 28;
  const values = projection.map(p => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const x = (i: number) => padL + (i * (W - padL - padR)) / (projection.length - 1);
  const y = (v: number) => padT + ((max - v) / range) * (H - padT - padB);

  const path = projection.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const color = levelColor(level);
  const monthLabels = ["Auj.", "M+1", "M+2", "M+3", "M+4", "M+5"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {max > 0 && min < 0 && (
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {projection.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === 0 ? 5 : 4} fill={i === 0 ? C.primary : color} />
      ))}
      {projection.map((p, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.mid}>
          {monthLabels[i]}
        </text>
      ))}
      {/* today's value: not sensitive, it's what the user just typed above */}
      <text x={x(0)} y={y(projection[0].value) - 12} textAnchor="start" fontSize={12} fontWeight={800} fill={C.primary}>
        {fmt(projection[0].value)}
      </text>
      {/* projected future values: the actual insight, kept blurred */}
      <g style={{ filter: "blur(4px)" }} aria-hidden="true">
        {projection.slice(1).map((p, idx) => {
          const i = idx + 1;
          return (
            <text key={i} x={x(i)} y={y(p.value) - 12} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>
              {fmt(p.value)}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

export default function DiagnosticClient() {
  const [ca, setCa] = useState(15000);
  const [charges, setCharges] = useState(11000);
  const [treso, setTreso] = useState(8000);

  const diag = useMemo(() => computeDiagnostic(ca, charges, treso), [ca, charges, treso]);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", background: "#fff", color: C.text, minHeight: "100vh" }}>
      <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoSVG width={36} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.primary }}>NVM Finance</span>
          </a>
          <nav style={{ display: "flex", gap: 18 }}>
            <a href="/services" style={{ fontSize: 13, fontWeight: 700, color: C.mid, textDecoration: "none" }}>Nos offres</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
          Gratuit · Sans compte · 30 secondes
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 14, textAlign: "center" }}>
          Votre entreprise est-elle en bonne santé financière ?
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.mid, marginBottom: 40, textAlign: "center" }}>
          Bougez les curseurs avec vos chiffres approximatifs. Rien n&apos;est enregistré, tout se calcule dans votre navigateur.
        </p>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 26px", marginBottom: 32 }}>
          <SliderField label="Chiffre d'affaires mensuel" value={ca} onChange={setCa} min={0} max={100000} step={500} />
          <SliderField label="Charges + salaires mensuels" value={charges} onChange={setCharges} min={0} max={100000} step={500} />
          <SliderField
            label="Trésorerie disponible"
            value={treso}
            onChange={setTreso}
            min={-20000}
            max={150000}
            step={500}
            hint="Ce qu'il y a sur vos comptes pros aujourd'hui"
          />
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{
            display: "inline-flex", alignItems: "baseline", gap: 10, background: "#fff",
            border: `3px solid ${levelColor(diag.status.level)}`, borderRadius: 100,
            padding: "14px 34px", boxShadow: `0 8px 30px ${levelColor(diag.status.level)}22`,
          }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: levelColor(diag.status.level) }}>{diag.score}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.mid }}>/ 100</span>
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: levelColor(diag.status.level), marginTop: 12 }}>
            {diag.status.label}
          </p>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 20, padding: "24px 20px 0", marginTop: 36 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            Projection de trésorerie · 6 mois
          </p>
          <p style={{ fontSize: 11.5, color: C.mid, opacity: 0.7, marginBottom: 4 }}>
            Si votre rythme actuel de charges et de recettes ne change pas
          </p>

          <ProjectionChart projection={diag.projection} level={diag.tresoLevel === "red" || diag.rentaLevel === "red" ? "red" : diag.tresoLevel === "orange" || diag.rentaLevel === "orange" ? "orange" : "green"} />

          <div style={{ position: "relative", marginTop: 8 }}>
            <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", paddingBottom: 24 }} aria-hidden="true">
              <DetailRow label="Excédent brut d'exploitation (EBE)" value={fmt(diag.ebe)} level={diag.rentaLevel} />
              <DetailRow label="Autonomie de trésorerie" value={`${diag.moisCouverture.toFixed(1)} mois de charges`} level={diag.tresoLevel} />
              <DetailRow label="Recommandation prioritaire" value="Réduire le poste de charges le plus élevé de 8 à 12 %" level="orange" />
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
                href={OFFRES_URL}
                style={{
                  background: C.primary, color: "#fff", padding: "14px 32px", borderRadius: 100,
                  fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 24px rgba(0,86,83,.25)",
                }}
              >
                Voir comment corriger ça →
              </a>
              <a
                href={CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 700, color: C.mid, opacity: 0.75, textDecoration: "underline" }}
              >
                ou en parler directement à un conseiller
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
