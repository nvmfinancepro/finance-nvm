"use client";

import { useState } from "react";

const C = {
  primary:     "#005653",
  primaryDark: "#003d3a",
  green:       "#059669",
  orange:      "#d97706",
  red:         "#dc2626",
  border:      "#a7d4d0",
  borderLight: "#c8e8e5",
  textMid:     "#2d6b68",
  textLight:   "#6aaca8",
  text:        "#002e2c",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);

const W = 500;
const pad = 8;

// ─── BarChart2 — barres doubles avec tooltip SVG ──────────────────────────────
interface BarData { l: string; v1: number; v2?: number; active?: boolean }
export function BarChart2({
  data, c1 = C.primary, c2 = C.green, h = 90,
  label1 = "V1", label2 = "V2", labelUnit = "",
}: {
  data: BarData[]; c1?: string; c2?: string; h?: number;
  label1?: string; label2?: string; labelUnit?: string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(...data.map(d => Math.max(d.v1, d.v2 ?? 0)), 1);
  const n = data.length;
  const bw = Math.max(6, Math.floor((W - pad * (n * 2 + 2)) / (n * 2)));
  const TW = 160;
  const TH = (d: BarData) => (d.v2 != null ? 52 : 36);

  return (
    <svg viewBox={`0 0 ${W} ${h + 22}`} width="100%" style={{ display: "block" }}
      onMouseLeave={() => setHov(null)}>
      <line x1={0} y1={h - 4} x2={W} y2={h - 4} stroke={C.borderLight} strokeWidth={1}/>
      {data.map((d, i) => {
        const h1 = Math.round((d.v1 / max) * (h - 4));
        const h2 = Math.round(((d.v2 ?? 0) / max) * (h - 4));
        const x = pad + i * (bw * 2 + pad * 2);
        return (
          <g key={i} style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <rect x={x} y={0} width={bw * 2 + 1} height={h + 4} fill="transparent"/>
            <rect x={x} y={h - 4 - h1} width={bw} height={h1} rx={2} fill={c1} opacity={hov === i || d.active ? 1 : 0.55}/>
            {d.v2 != null && <rect x={x + bw + 1} y={h - 4 - h2} width={bw} height={h2} rx={2} fill={c2} opacity={hov === i || d.active ? 1 : 0.55}/>}
            <text x={x + bw} y={h + 14} textAnchor="middle" fontSize={8} fill={d.active ? C.text : C.textLight}
              fontWeight={d.active ? 700 : 400} fontFamily="Nunito,sans-serif">{d.l}</text>
          </g>
        );
      })}
      {hov != null && (() => {
        const d = data[hov];
        const x = pad + hov * (bw * 2 + pad * 2);
        const tx = Math.min(W - TW - 4, Math.max(4, x + bw - TW / 2));
        const h1 = Math.round((d.v1 / max) * (h - 4));
        const ty = Math.max(4, h - 4 - h1 - TH(d) - 6);
        const fmtVal = (v: number) => labelUnit ? `${v.toLocaleString("fr-FR")}${labelUnit}` : fmt(v);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={TW} height={TH(d)} rx={6} fill={C.primaryDark}/>
            <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight={800} fill="white" fontFamily="Nunito,sans-serif">{d.l}</text>
            <text x={tx + 8} y={ty + 28} fontSize={9} fill="rgba(255,255,255,0.8)" fontFamily="Nunito,sans-serif">{label1}: {fmtVal(d.v1)}</text>
            {d.v2 != null && <text x={tx + 8} y={ty + 41} fontSize={9} fill="rgba(255,255,255,0.8)" fontFamily="Nunito,sans-serif">{label2}: {fmtVal(d.v2)}</text>}
          </g>
        );
      })()}
    </svg>
  );
}

// ─── LineAreaChart — courbe avec aire et tooltip SVG ─────────────────────────
interface LineData { l: string; v: number; active?: boolean }
export function LineAreaChart({
  data, color = C.primary, h = 80, showZero = false,
  labelFn,
}: {
  data: LineData[]; color?: string; h?: number; showZero?: boolean;
  labelFn?: (v: number) => string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  if (data.length < 2) return null;
  const vals = data.map(d => d.v);
  const maxV = Math.max(...vals, showZero ? 0 : vals[0]);
  const minV = Math.min(...vals, showZero ? 0 : vals[0]);
  const range = maxV - minV || 1;
  const xs = data.map((_, i) => pad + i * (W - pad * 2) / (data.length - 1));
  const ys = data.map(d => h - 4 - Math.round(((d.v - minV) / range) * (h - 8)));
  const zeroY = showZero ? Math.min(h - 4, Math.max(4, h - 4 - Math.round(((0 - minV) / range) * (h - 8)))) : h - 4;
  const path = "M" + xs.map((x, i) => `${x},${ys[i]}`).join(" L");
  const area = `M${xs[0]},${zeroY} L` + xs.map((x, i) => `${x},${ys[i]}`).join(" L") + ` L${xs[xs.length - 1]},${zeroY} Z`;
  const uid = color.replace(/[^a-zA-Z0-9]/g, "");
  const TW = 140;

  return (
    <svg viewBox={`0 0 ${W} ${h + 22}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHov(null)}>
      <defs>
        <linearGradient id={`lg_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      {showZero && <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke={C.borderLight} strokeWidth={1} strokeDasharray="4,3"/>}
      <path d={area} fill={`url(#lg_${uid})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
      {xs.map((x, i) => {
        const xStart = i === 0 ? 0 : (x + xs[i - 1]) / 2;
        const xEnd   = i === xs.length - 1 ? W : (x + xs[i + 1]) / 2;
        return <rect key={i} x={xStart} y={0} width={xEnd - xStart} height={h + 4} fill="transparent"
          style={{ cursor: "crosshair" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}/>;
      })}
      {xs.map((x, i) => (
        <g key={i}>
          {hov === i && <line x1={x} y1={4} x2={x} y2={h - 4} stroke={color} strokeWidth={1} strokeDasharray="3,2" opacity={0.4}/>}
          <circle cx={x} cy={ys[i]} r={hov === i ? 5 : data[i].active ? 3.5 : 2}
            fill={hov === i || data[i].active ? color : "white"} stroke={color} strokeWidth={1.5}/>
          <text x={x} y={h + 14} textAnchor="middle" fontSize={8}
            fill={data[i].active || hov === i ? C.text : C.textLight}
            fontWeight={data[i].active ? 700 : 400} fontFamily="Nunito,sans-serif">{data[i].l}</text>
        </g>
      ))}
      {hov != null && (() => {
        const tx = Math.min(W - TW - 4, Math.max(4, xs[hov] - TW / 2));
        const ty = Math.max(4, ys[hov] - 48);
        const val = labelFn ? labelFn(data[hov].v) : fmt(data[hov].v);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={TW} height={38} rx={6} fill={C.primaryDark}/>
            <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight={800} fill="white" fontFamily="Nunito,sans-serif">{data[hov].l}</text>
            <text x={tx + 8} y={ty + 28} fontSize={9} fill="rgba(255,255,255,0.85)" fontFamily="Nunito,sans-serif">{val}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── SaisonnaliteChart ────────────────────────────────────────────────────────
interface SaisonnaliteData { l: string; coef: number; ca: number }
export function SaisonnaliteChart({ data, h = 70 }: { data: SaisonnaliteData[]; h?: number }) {
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.coef), 1.5);
  const n   = data.length;
  const bw  = Math.max(8, Math.floor((W - pad * (n + 2)) / n));
  const base = Math.round((1 / max) * (h - 4));
  const TW = 160;

  return (
    <svg viewBox={`0 0 ${W} ${h + 22}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHov(null)}>
      <line x1={0} y1={h - 4 - base} x2={W} y2={h - 4 - base} stroke={C.border} strokeWidth={1.5} strokeDasharray="5,3"/>
      <text x={W - 2} y={h - 4 - base - 4} textAnchor="end" fontSize={8} fill={C.textMid} fontFamily="Nunito,sans-serif">moyenne (1.0)</text>
      {data.map((d, i) => {
        const barH = Math.round((d.coef / max) * (h - 4));
        const x = pad + i * (bw + pad);
        const col = d.coef > 1.2 ? C.green : d.coef < 0.8 ? C.orange : C.primary;
        return (
          <g key={i} style={{ cursor: "crosshair" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <rect x={x} y={0} width={bw} height={h + 4} fill="transparent"/>
            <rect x={x} y={h - 4 - barH} width={bw} height={barH} rx={2} fill={col} opacity={hov === i ? 1 : 0.75}/>
            <text x={x + bw / 2} y={h + 14} textAnchor="middle" fontSize={8}
              fill={hov === i ? C.text : C.textLight} fontWeight={hov === i ? 700 : 400} fontFamily="Nunito,sans-serif">{d.l}</text>
          </g>
        );
      })}
      {hov != null && (() => {
        const d    = data[hov];
        const x    = pad + hov * (bw + pad);
        const barH = Math.round((d.coef / max) * (h - 4));
        const interp = d.coef > 1.3 ? "Mois très fort" : d.coef > 1.1 ? "Au-dessus de la moyenne"
          : d.coef < 0.7 ? "Mois très faible" : d.coef < 0.9 ? "En dessous de la moyenne" : "Dans la moyenne";
        const tx  = Math.min(W - TW - 4, Math.max(4, x + bw / 2 - TW / 2));
        const ty  = Math.max(4, h - 4 - barH - 62);
        const col = d.coef > 1.2 ? C.green : d.coef < 0.8 ? C.orange : C.primary;
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={TW} height={56} rx={6} fill={C.primaryDark}/>
            <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight={800} fill="white" fontFamily="Nunito,sans-serif">{d.l} — {d.coef.toFixed(2)}x</text>
            <text x={tx + 8} y={ty + 28} fontSize={9} fill="rgba(255,255,255,0.8)" fontFamily="Nunito,sans-serif">CA : {fmt(d.ca)}</text>
            <text x={tx + 8} y={ty + 42} fontSize={9} fill={col} fontWeight={700} fontFamily="Nunito,sans-serif">{interp}</text>
          </g>
        );
      })()}
    </svg>
  );
}
