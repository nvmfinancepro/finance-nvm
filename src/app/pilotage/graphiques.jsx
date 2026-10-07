"use client";
// Graphiques et éléments visuels des vues de pilotage (SVG maison, sans librairie).
// Règles : barres fines à bout arrondi, une seule échelle par graphique, quadrillage
// discret, info-bulle au survol, valeurs lisibles aussi hors survol (légende, tableau).
import { useState, useRef, useEffect } from "react";
import { C } from "@/app/charte";

// Palette validée (daltonisme, contraste) : voir le commit qui l'introduit.
export const VIZ = {
  serie: "#0a9690", serieN1: "#c4dbd8", neg: "#dc2626", grid: "#e3efed", axis: "#6aaca8",
  achats: "#eb6834", externes: "#4a3aa7", personnel: "#2a78d6", autres: "#eda100", resultat: "#0a9690",
  age: ["#7fbdb7", "#3f9e96", "#00756f", "#004844"],
};
export const FONT = "'VAG Rounded Next','Baloo 2',sans-serif";

export const eur = (n) => {
  if (n == null || !isFinite(n)) return "—";
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(2).replace(".", ",") + " M€" : new Intl.NumberFormat("fr-FR").format(Math.round(a)) + " €";
  return n < 0 ? "−" + s : s;
};
export const eurK = (n) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace(".", ",") + " M€" : a >= 1e3 ? Math.round(a / 1e3) + " k€" : Math.round(a) + " €";
  return n < 0 ? "−" + s : s;
};
export const pctFr = (n, d = 0) => (n == null || !isFinite(n) ? "—" : `${n.toFixed(d).replace(".", ",")} %`);
const niceStep = (span, ticks = 4) => {
  const raw = span / ticks;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
function scale(values, ticks = 4) {
  const v = values.filter((x) => x != null && isFinite(x));
  let max = Math.max(0, ...v), min = Math.min(0, ...v);
  if (max === min) max = 1;
  const step = niceStep(max - min, ticks);
  max = Math.ceil(max / step) * step;
  min = Math.floor(min / step) * step;
  const list = [];
  for (let t = min; t <= max + step / 2; t += step) list.push(Math.round(t));
  return { max, min, ticks: list };
}
// Largeur réelle du conteneur : le SVG est dessiné à l'échelle 1, les textes
// gardent leur taille quelle que soit la largeur de la carte.
function useLargeur(defaut = 640) {
  const ref = useRef(null);
  const [w, setW] = useState(defaut);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
// Un libellé sur n quand la place manque (≈ 34 px par libellé de mois).
const pasLibelles = (W, n, larg = 34) => Math.max(1, Math.ceil(n / Math.max(1, Math.floor(W / larg))));

// Barre arrondie côté valeur, carrée côté ligne de base.
function barPath(x, yBase, yVal, w) {
  const h = Math.abs(yBase - yVal);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (yVal < yBase) return `M${x},${yBase} L${x},${yVal + r} Q${x},${yVal} ${x + r},${yVal} L${x + w - r},${yVal} Q${x + w},${yVal} ${x + w},${yVal + r} L${x + w},${yBase} Z`;
  return `M${x},${yBase} L${x},${yVal - r} Q${x},${yVal} ${x + r},${yVal} L${x + w - r},${yVal} Q${x + w},${yVal} ${x + w},${yVal - r} L${x + w},${yBase} Z`;
}

function Bulle({ x, W, lines }) {
  const left = Math.min(Math.max((x / W) * 100, 12), 88);
  return (
    <div style={{ position: "absolute", top: 0, left: `${left}%`, transform: "translateX(-50%)", background: C.primaryDark, color: "white", borderRadius: 10, padding: "8px 11px", fontSize: 12, lineHeight: 1.5, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,.18)", zIndex: 5 }}>
      {lines.map((l, i) => <div key={i} style={{ fontWeight: i === 0 ? 800 : 600, opacity: i === 0 ? 1 : 0.9 }}>{l}</div>)}
    </div>
  );
}

export function Legende({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, fontWeight: 700, color: C.textMid }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {it.dash ? <svg width="16" height="4" aria-hidden><line x1="1" x2="15" y1="2" y2="2" stroke={it.color} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" /></svg>
            : it.line ? <span style={{ width: 14, height: 2, background: it.color, borderRadius: 2 }} /> : <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Colonnes mensuelles, avec en option l'année précédente en fantôme et des
// valeurs négatives (en rouge) sous la ligne de base.
export function Colonnes({ data, height = 180, n1 = false, tip }) {
  const [hov, setHov] = useState(null);
  const [ref, W] = useLargeur();
  const padL = 46, padR = 6, padT = 10, padB = 24;
  const labelEvery = pasLibelles(W - padL, data.length);
  const { max, min, ticks } = scale(data.flatMap((d) => [d.v, n1 ? d.n1 : null]));
  const H = height - padT - padB;
  const y = (v) => padT + ((max - v) / (max - min)) * H;
  const band = (W - padL - padR) / data.length;
  const bw = Math.min(n1 ? 13 : 22, band * (n1 ? 0.34 : 0.56));
  const gap = 2;
  return (
    <div ref={ref} style={{ position: "relative" }} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", overflow: "visible" }} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.border : VIZ.grid} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={VIZ.axis} fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>{eurK(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + band * i + band / 2;
          const x0 = n1 ? cx - bw - gap / 2 : cx - bw / 2;
          const xCur = n1 ? cx + gap / 2 : x0;
          return (
            <g key={i}>
              {hov === i && <rect x={padL + band * i} y={padT} width={band} height={H} fill={C.bg} />}
              {n1 && d.n1 != null && <path d={barPath(x0, y(0), y(d.n1), bw)} fill={VIZ.serieN1} />}
              {d.v != null && <path d={barPath(xCur, y(0), y(d.v), bw)} fill={d.v < 0 ? VIZ.neg : d.active === false ? VIZ.serieN1 : VIZ.serie} opacity={d.dim ? 0.45 : 1} />}
              {(i % labelEvery === 0 || i === data.length - 1) && <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fontWeight={d.current ? 800 : 500} fill={d.current ? C.text : VIZ.axis} fontFamily={FONT}>{d.l}</text>}
              <rect x={padL + band * i} y={0} width={band} height={height} fill="transparent" onMouseEnter={() => setHov(i)} style={{ cursor: "default" }} />
            </g>
          );
        })}
      </svg>
      {hov != null && tip && <Bulle x={padL + band * hov + band / 2} W={W} lines={tip(data[hov])} />}
    </div>
  );
}

// Libellé d'axe : un sur `every`, plus le dernier, sans qu'il chevauche son voisin.
const afficheLibelle = (i, every, n) => i === n - 1 || (i % every === 0 && n - 1 - i >= Math.ceil(every / 2));

// Courbe (trésorerie) : aire légère, point final mis en avant, survol par mois.
// Les points portant `p` (et en option `pp`, scénario prudent) sont une prévision :
// tracée en pointillés depuis le dernier point réel, sur fond teinté « Prévision ».
export function Courbe({ data, height = 180, tip, color = VIZ.serie, colorPrudent = VIZ.achats }) {
  const [hov, setHov] = useState(null);
  const [ref, W] = useLargeur();
  const padL = 46, padR = 10, padT = 10, padB = 24;
  const every = pasLibelles(W - padL, data.length);
  const pts = data.map((d, i) => ({ ...d, i })).filter((d) => d.v != null);
  const prev = data.map((d, i) => ({ ...d, i })).filter((d) => d.p != null);
  const prud = data.map((d, i) => ({ ...d, i })).filter((d) => d.pp != null);
  const { max, min, ticks } = scale([...pts.map((d) => d.v), ...prev.map((d) => d.p), ...prud.map((d) => d.pp)]);
  const H = height - padT - padB;
  const y = (v) => padT + ((max - v) / (max - min)) * H;
  const step = (W - padL - padR) / Math.max(1, data.length - 1);
  const x = (i) => padL + step * i;
  const path = pts.map((d, k) => `${k ? "L" : "M"}${x(d.i)},${y(d.v)}`).join(" ");
  const area = pts.length > 1 ? `${path} L${x(pts[pts.length - 1].i)},${y(Math.max(min, 0))} L${x(pts[0].i)},${y(Math.max(min, 0))} Z` : "";
  const last = pts[pts.length - 1];
  // La prévision part du dernier point réel qui la précède.
  const ancre = prev.length ? [...pts].reverse().find((d) => d.i < prev[0].i) : null;
  const pointilles = (liste, cle) => [...(ancre ? [{ i: ancre.i, val: ancre.v }] : []), ...liste.map((d) => ({ i: d.i, val: d[cle] }))].map((d, k) => `${k ? "L" : "M"}${x(d.i)},${y(d.val)}`).join(" ");
  const debutPrev = !prev.length ? null : ancre ? x(ancre.i) : x(prev[0].i) - step / 2;
  const finPrev = prev[prev.length - 1];
  return (
    <div ref={ref} style={{ position: "relative" }} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", overflow: "visible" }} role="img">
        {debutPrev != null && (
          <g>
            <rect x={debutPrev} y={padT} width={W - padR - debutPrev} height={H} fill={C.bgLight} />
            <text x={debutPrev + 6} y={padT + 11} fontSize={10} fontWeight={800} fill={VIZ.axis} fontFamily={FONT}>Prévision</text>
          </g>
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.border : VIZ.grid} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={VIZ.axis} fontFamily={FONT}>{eurK(t)}</text>
          </g>
        ))}
        {area && <path d={area} fill={color} opacity={0.1} />}
        {pts.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {prud.length > 0 && <path d={pointilles(prud, "pp")} fill="none" stroke={colorPrudent} strokeWidth={2} strokeDasharray="2 5" strokeLinejoin="round" strokeLinecap="round" />}
        {prev.length > 0 && <path d={pointilles(prev, "p")} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" />}
        {data.map((d, i) => (
          <g key={i}>
            {hov === i && (d.v != null || d.p != null) && <line x1={x(i)} x2={x(i)} y1={padT} y2={padT + H} stroke={C.border} strokeWidth={1} />}
            {afficheLibelle(i, every, data.length) && <text x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fontWeight={d.current ? 800 : 500} fill={d.current ? C.text : VIZ.axis} fontFamily={FONT}>{d.l}</text>}
          </g>
        ))}
        {pts.map((d) => (hov === d.i || d === last) && (
          <circle key={d.i} cx={x(d.i)} cy={y(d.v)} r={4.5} fill={d.v < 0 ? VIZ.neg : color} stroke="white" strokeWidth={2} />
        ))}
        {prev.map((d) => (hov === d.i || d === finPrev) && (
          <circle key={"p" + d.i} cx={x(d.i)} cy={y(d.p)} r={4.5} fill="white" stroke={d.p < 0 ? VIZ.neg : color} strokeWidth={2} />
        ))}
        {prud.map((d) => hov === d.i && <circle key={"pp" + d.i} cx={x(d.i)} cy={y(d.pp)} r={4} fill="white" stroke={colorPrudent} strokeWidth={2} />)}
        {data.map((d, i) => <rect key={i} x={x(i) - step / 2} y={0} width={step} height={height} fill="transparent" onMouseEnter={() => setHov(i)} />)}
      </svg>
      {hov != null && (data[hov].v != null || data[hov].p != null) && tip && <Bulle x={x(hov)} W={W} lines={tip(data[hov])} />}
    </div>
  );
}

// Barre de répartition horizontale (parties d'un tout), légende chiffrée dessous.
export function Repartition({ segments, unit = (v) => eur(v), height = 22 }) {
  const [hov, setHov] = useState(null);
  const total = segments.reduce((s, x) => s + Math.max(0, x.v), 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", gap: 2, height, borderRadius: 6, overflow: "hidden" }} onMouseLeave={() => setHov(null)}>
        {segments.filter((s) => s.v > 0).map((s) => (
          <div key={s.id} onMouseEnter={() => setHov(s.id)} title={`${s.label} : ${unit(s.v)}`}
            style={{ width: `${(s.v / total) * 100}%`, background: s.color, opacity: hov && hov !== s.id ? 0.45 : 1, transition: "opacity .15s" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "8px 16px", marginTop: 12 }}>
        {segments.map((s) => (
          <div key={s.id} onMouseEnter={() => setHov(s.id)} onMouseLeave={() => setHov(null)} style={{ display: "flex", alignItems: "flex-start", gap: 8, opacity: hov && hov !== s.id ? 0.55 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, marginTop: 4, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{unit(s.v)}</div>
              {s.sub && <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Variation chiffrée avec flèche (la couleur dit si c'est une bonne nouvelle).
export function Variation({ cur, prev, label, goodUp = true, points = false, compact = false }) {
  if (cur == null || prev == null || !isFinite(cur) || !isFinite(prev)) return null;
  let d, txt, flat;
  if (points) { d = cur - prev; txt = `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")} pt`; flat = Math.abs(d) < 0.05; }
  else if (prev <= 0 || cur < 0) {
    // Un pourcentage n'a pas de sens sur une base nulle ou négative : écart en euros.
    d = cur - prev; txt = `${d >= 0 ? "+" : "−"}${eur(Math.abs(d))}`; flat = Math.abs(d) < 1;
  } else { if (Math.abs(prev) < 1) return null; d = (cur - prev) / Math.abs(prev) * 100; txt = `${d >= 0 ? "+" : "−"}${Math.abs(d) >= 100 ? Math.round(Math.abs(d)) : Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0).replace(".", ",")} %`; flat = Math.abs(d) < 0.5; }
  const good = flat ? null : (d > 0) === goodUp;
  const color = good == null ? C.textMid : good ? C.green : C.red;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", columnGap: 4, fontSize: compact ? 11 : 12, fontWeight: 800, color }}>
      <span style={{ whiteSpace: "nowrap" }}><span aria-hidden style={{ fontSize: compact ? 8 : 9, marginRight: 4 }}>{flat ? "●" : d > 0 ? "▲" : "▼"}</span>{txt}</span>
      {label && <span style={{ color: C.textLight, fontWeight: 700 }}>{label}</span>}
    </span>
  );
}

// Pastille d'état : icône + mot + couleur (jamais la couleur seule).
export const STATUT = {
  ok: { color: C.green, bg: "#dcfce7", icon: "✓", mot: "Bien" },
  warn: { color: C.orange, bg: "#fef3c7", icon: "!", mot: "À surveiller" },
  bad: { color: C.red, bg: "#fee2e2", icon: "✕", mot: "Fragile" },
  na: { color: C.textLight, bg: "#eef6f5", icon: "–", mot: "Pas de données" },
  lock: { color: C.textMid, bg: "#eef6f5", icon: "", mot: "Avec votre conseiller" },
};
export function PastilleStatut({ statut, size = 22 }) {
  const s = STATUT[statut] || STATUT.na;
  if (statut === "lock") return (
    <span aria-label={s.mot} style={{ width: size, height: size, borderRadius: "50%", background: s.bg, color: s.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none" aria-hidden><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.6" /></svg>
    </span>
  );
  return <span aria-label={s.mot} style={{ width: size, height: size, borderRadius: "50%", background: s.bg, color: s.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, fontWeight: 900, flexShrink: 0 }}>{s.icon}</span>;
}

// Plusieurs courbes de même unité (une seule échelle), légende obligatoire.
export function Lignes({ labels, series, height = 190, keys }) {
  const [hov, setHov] = useState(null);
  const [ref, W] = useLargeur();
  const padL = 46, padR = 10, padT = 10, padB = 24;
  const every = pasLibelles(W - padL, labels.length);
  const { max, min, ticks } = scale(series.flatMap((s) => s.values));
  const H = height - padT - padB;
  const y = (v) => padT + ((max - v) / (max - min)) * H;
  const step = (W - padL - padR) / Math.max(1, labels.length - 1);
  const x = (i) => padL + step * i;
  return (
    <div>
      <Legende items={series.map((s) => ({ label: s.label, color: s.color, line: true }))} />
      <div ref={ref} style={{ position: "relative", marginTop: 8 }} onMouseLeave={() => setHov(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", overflow: "visible" }} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.border : VIZ.grid} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={VIZ.axis} fontFamily={FONT}>{eurK(t)}</text>
            </g>
          ))}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={padT} y2={padT + H} stroke={C.border} strokeWidth={1} />}
          {series.map((s) => {
            const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
            return <path key={s.label} d={pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
          })}
          {series.map((s) => s.values.map((v, i) => v != null && (hov === i || i === s.values.length - 1) && <circle key={s.label + i} cx={x(i)} cy={y(v)} r={4.5} fill={s.color} stroke="white" strokeWidth={2} />))}
          {labels.map((l, i) => afficheLibelle(i, every, labels.length) && <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill={i === labels.length - 1 ? C.text : VIZ.axis} fontWeight={i === labels.length - 1 ? 800 : 500} fontFamily={FONT}>{l}</text>)}
          {labels.map((_, i) => <rect key={i} x={x(i) - step / 2} y={0} width={step} height={height} fill="transparent" onMouseEnter={() => setHov(i)} />)}
        </svg>
        {hov != null && <Bulle x={x(hov)} W={W} lines={[keys ? keys[hov] : labels[hov], ...series.map((s) => `${s.label} : ${eur(s.values[hov])}`)]} />}
      </div>
    </div>
  );
}
