"use client";
// Vues détaillées de pilotage à partir de la comptabilité importée (FEC) :
// compte de résultat (soldes intermédiaires de gestion), bilan et BFR, trésorerie
// réelle, clients et fournisseurs, ventes / achats / charges / salaires, TVA, IS.
// Chaque chiffre est accompagné d'une explication en français courant.
import { useState } from "react";
import { C, Card, Btn, Info } from "@/app/charte";
import * as P from "@/lib/pilotage";
import { VIZ, eur, pctFr, Colonnes, Courbe, Lignes, Repartition, Variation, Legende, PastilleStatut, STATUT } from "@/app/pilotage/graphiques";
import { NavMois, Titre } from "@/app/pilotage/synthese";
import { dataIndex, tiersPour, produitsSur, salariesSur } from "@/lib/donnees";
import { prolongerTresorerie } from "@/lib/prevision";

export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
export const grid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap: 16 });
export const num = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
export const PRODUITS = new Set(["ventesMarch", "prodVendue", "prodStockee", "prodImmo", "subventions", "autresProduits", "reprises", "prodFin", "prodExc"]);

export function Page({ children }) {
  return <div style={{ padding: "22px 24px 40px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1320, margin: "0 auto" }} className="fade-up">{children}</div>;
}
// Origine des chiffres affichés : comptabilité (exacte) ou imports simplifiés (estimations).
export function Source({ source, fin }) {
  if (!source) return null;
  const fec = source === "fec";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: fec ? C.greenBg : C.orangeBg, border: `1px solid ${fec ? C.green + "33" : C.orange + "44"}`, color: fec ? C.green : C.orange, borderRadius: 100, padding: "3px 11px", fontSize: 11.5, fontWeight: 800, marginTop: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: fec ? C.green : C.orange }} />
      {fec ? `FEC · comptabilité au ${fin ? fmtDate(fin) : ""}` : "Estimations (relevé bancaire, fichiers)"}
    </span>
  );
}
// sub : explication (affichée au clic sur « i ») ; detail : information factuelle visible.
export function EnTete({ title, sub, detail, nav, right, source, fin }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: C.text, display: "flex", alignItems: "center" }}>{title}<Info>{sub}</Info></div>
        {detail && <div style={{ fontSize: 13, color: C.textMid, fontWeight: 700, marginTop: 3 }}>{detail}</div>}
        <Source source={source} fin={fin} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{right}{nav}</div>
    </div>
  );
}
export function ChoixPeriode({ value, onChange, options }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 100, padding: 3, gap: 2 }}>
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          style={{ padding: "6px 13px", borderRadius: 100, border: "none", background: value === id ? C.primary : "transparent", color: value === id ? "white" : C.textMid, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
      ))}
    </div>
  );
}
export function CarteTitre({ title, sub, detail, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "18px 22px 0", flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 15, fontWeight: 900, color: C.text, display: "flex", alignItems: "center" }}>{title}<Info>{sub}</Info></div>{detail && <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700, marginTop: 2 }}>{detail}</div>}</div>
      {right}
    </div>
  );
}
export function Chiffre({ label, value, sub, aide, statut, delta, subTon }) {
  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.text}`, borderRadius: 20, padding: "16px 18px", boxShadow: "0 16px 36px rgba(0,86,83,.06)", display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center" }}>{label}<Info>{aide}</Info></div>
        {statut && <PastilleStatut statut={statut} size={20} />}
      </div>
      <div style={{ fontSize: 23, fontWeight: 900, color: C.text, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, fontWeight: 700, color: subTon && statut ? STATUT[statut].color : C.textMid }}>{sub}</div>}
      {delta}
    </div>
  );
}
export const Th = ({ children, right, w }) => <th style={{ padding: "9px 12px", textAlign: right ? "right" : "left", fontSize: 10.5, color: C.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", background: C.bgLight, width: w }}>{children}</th>;

// fec : vues qui exigent la comptabilité (bilan, trésorerie réelle) ; sinon index unifié.
function contexte(client, moisIdx, moisYear, { fec = false } = {}) {
  const idx = fec ? P.fecIndex(client) : dataIndex(client);
  const key = P.monthKey(moisIdx, moisYear);
  const m = idx.months.get(key);
  return { idx, key, covered: !!m, source: m ? m.source || "fec" : null, fin: m?.meta?.fin };
}
// Plus gros clients / fournisseurs sur des mois, depuis l'index (FEC ou imports).
function topTiersIdx(idx, keys, kind) {
  const map = new Map();
  for (const k of keys) {
    const m = idx.months.get(k);
    if (!m) continue;
    for (const r of kind === "c" ? m.cli : m.fou) { const x = map.get(r.n) || { n: r.n, l: r.l, v: 0 }; x.v += r.v; map.set(r.n, x); }
  }
  return [...map.values()].sort((a, b) => b.v - a.v);
}
export function HorsPeriode({ title, idx, keyM, setMoisKey, nav }) {
  return (
    <Page>
      <EnTete title={title} nav={nav} />
      <Card style={{ padding: "30px 26px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>Aucune donnée pour {P.keyLabel(keyM)}</div>
        <div style={{ fontSize: 13.5, color: C.textMid, marginBottom: 16 }}>{idx.has ? `Les données disponibles vont de ${P.keyLabel(idx.first)} à ${P.keyLabel(idx.last)}. Le prochain import mensuel ajoutera les mois suivants.` : "Dès que les données de l'entreprise sont importées, cette page se remplit automatiquement."}</div>
        {setMoisKey && idx.has && <Btn onClick={() => setMoisKey(keyM > idx.last ? idx.last : idx.first)}>Voir {P.keyLabel(keyM > idx.last ? idx.last : idx.first)}</Btn>}
      </Card>
    </Page>
  );
}
const evo = (a, b) => (b == null || Math.abs(b) < 1 ? null : ((a - b) / Math.abs(b)) * 100);

// ══════════════════════════════════════════════════════════════════════
// COMPTE DE RÉSULTAT (soldes intermédiaires de gestion)
// ══════════════════════════════════════════════════════════════════════
export const LIGNES_SIG = [
  { id: "ca", label: "Chiffre d'affaires HT", f: (p, s) => s.ca, postes: ["ventesMarch", "prodVendue"], total: true, aide: "Ventes de marchandises et production vendue (comptes 70)." },
  { id: "prod", label: "Production stockée et immobilisée", f: (p) => p.prodStockee + p.prodImmo, postes: ["prodStockee", "prodImmo"] },
  { id: "conso", label: "Achats consommés", f: (p, s) => -s.consommations, postes: ["achatsMarch", "varStockMarch", "achatsMat", "varStockMat"], aide: "Achats de marchandises et matières, corrigés de la variation des stocks (60, 603)." },
  { id: "mb", label: "Marge brute", f: (p, s) => s.margeBrute, total: true, aide: "CA + production stockée et immobilisée − achats consommés." },
  { id: "ext", label: "Charges externes", f: (p) => -p.chargesExternes, postes: ["chargesExternes"], aide: "Autres achats et charges externes (60 hors achats consommés, 61, 62) : loyer, sous-traitance, honoraires, publicité, énergie…" },
  { id: "va", label: "Valeur ajoutée", f: (p, s) => s.valeurAjoutee, total: true, aide: "Marge brute − charges externes : la richesse créée, avant rémunération du personnel." },
  { id: "subv", label: "Subventions d'exploitation", f: (p) => p.subventions, postes: ["subventions"] },
  { id: "imp", label: "Impôts et taxes", f: (p) => -p.impotsTaxes, postes: ["impotsTaxes"], aide: "CFE, taxe foncière, taxes sur salaires (63), hors IS." },
  { id: "pers", label: "Charges de personnel", f: (p, s) => -s.personnel, postes: ["salaires", "chargesSociales"], aide: "Salaires bruts et charges sociales (64)." },
  { id: "ebe", label: "EBE", f: (p, s) => s.ebe, total: true, aide: "Excédent brut d'exploitation : ce que l'activité dégage avant amortissements, frais financiers et IS. L'indicateur clé de la rentabilité opérationnelle." },
  { id: "dot", label: "Dotations nettes aux amortissements et provisions", f: (p) => -p.dotations + p.reprises, postes: ["dotations", "reprises"], aide: "Dotations (68) moins reprises et transferts de charges (78, 79). Souvent comptabilisées en fin d'exercice." },
  { id: "gest", label: "Autres produits et charges de gestion", f: (p) => p.autresProduits - p.autresCharges, postes: ["autresProduits", "autresCharges"], aide: "Comptes 65 et 75 : redevances, pertes sur créances, produits divers." },
  { id: "rex", label: "Résultat d'exploitation (REX)", f: (p, s) => s.rex, total: true, aide: "EBE − dotations nettes ± autres produits et charges de gestion." },
  { id: "fin", label: "Résultat financier", f: (p, s) => s.resFin, postes: ["prodFin", "chargesFin"], aide: "Produits financiers (76) − charges financières (66), dont intérêts d'emprunt." },
  { id: "exc", label: "Résultat exceptionnel", f: (p, s) => s.resExc, postes: ["prodExc", "chargesExc"], aide: "Comptes 67 et 77 : cessions d'immobilisations, pénalités, régularisations." },
  { id: "is", label: "IS et participation", f: (p) => -(p.is + p.participation), postes: ["is", "participation"], aide: "Impôt sur les sociétés (695) et participation des salariés (691)." },
  { id: "rn", label: "Résultat net", f: (p, s) => s.rn, total: true, aide: "Bénéfice ou perte comptable de la période." },
];

export function CompteResultat({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
  const [periode, setPeriode] = useState("exercice");
  const [ouvert, setOuvert] = useState({});
  const { idx, key, covered, source, fin } = contexte(client, moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title="Compte de résultat" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const ytd = P.ytdKeys(idx, key);
  const keys = periode === "mois" ? [key] : periode === "exercice" ? ytd : P.ttmKeys(idx, key);
  const keys1 = keys.map((k) => P.shiftKey(k, -12));
  const hasN1 = keys1.every((k) => idx.months.has(k));
  const pl = P.plOver(idx, keys), s = P.sigOf(pl);
  const pl1 = hasN1 ? P.plOver(idx, keys1) : null, s1 = hasN1 ? P.sigOf(pl1) : null;
  const libPeriode = periode === "mois" ? P.keyLabel(key) : `${P.keyLabel(keys[0], false)} → ${P.keyLabel(key, false)}`;
  const pm = P.pointMort(idx, P.ttmKeys(idx, key));
  const lignes = LIGNES_SIG.filter((l) => l.total || Math.abs(l.f(pl, s)) >= 1 || (s1 && Math.abs(l.f(pl1, s1)) >= 1));
  const comptes = (l) => [...pl.accounts.values()].filter((a) => l.postes.includes(a.poste))
    .map((a) => ({ ...a, d: PRODUITS.has(a.poste) ? a.v : -a.v, d1: pl1 ? (PRODUITS.has(a.poste) ? 1 : -1) * (pl1.accounts.get(a.c)?.v || 0) : null }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const moisEx = ytd.map((k) => ({ k, s: P.sigOf(P.monthPL(idx, k)), p: P.monthPL(idx, k) }));
  const sEx = P.sigOf(P.plOver(idx, ytd));
  const LIGNES_MOIS = [
    { l: "CA HT", f: (x) => x.s.ca, bold: true },
    { l: "Marge brute", f: (x) => x.s.margeBrute },
    { l: "  taux de marge", f: (x) => (x.s.ca ? (x.s.margeBrute / x.s.ca) * 100 : null), pct: true },
    { l: "Charges externes", f: (x) => x.p.chargesExternes },
    { l: "Charges de personnel", f: (x) => x.s.personnel },
    { l: "EBE", f: (x) => x.s.ebe, bold: true, signe: true },
    { l: "  EBE / CA", f: (x) => (x.s.ca ? (x.s.ebe / x.s.ca) * 100 : null), pct: true },
    { l: "Résultat net", f: (x) => x.s.rn, bold: true, signe: true },
  ];
  return (
    <Page>
      <EnTete title="Compte de résultat · SIG" sub="Soldes intermédiaires de gestion, du CA au résultat net. Cliquez sur une ligne pour le détail par compte." source={source} fin={fin}
        nav={nav} right={<ChoixPeriode value={periode} onChange={setPeriode} options={[["mois", "Mois"], ["exercice", "Cumul exercice"], ["12m", "12 mois glissants"]]} />} />
      <div style={grid(200)}>
        <Chiffre label="CA HT" value={eur(s.ca)} sub={libPeriode} delta={s1 && <Variation cur={s.ca} prev={s1.ca} label="vs N-1" />} />
        <Chiffre label="Taux de marge brute" value={pctFr(s.ca ? (s.margeBrute / s.ca) * 100 : null, 1)} sub={`Marge brute ${eur(s.margeBrute)}`} delta={s1 && s1.ca > 0 && s.ca > 0 && <Variation cur={(s.margeBrute / s.ca) * 100} prev={(s1.margeBrute / s1.ca) * 100} points label="vs N-1" />} />
        <Chiffre label="EBE" value={eur(s.ebe)} sub={s.ca ? `${pctFr((s.ebe / s.ca) * 100, 1)} du CA` : null} delta={s1 && <Variation cur={s.ebe} prev={s1.ebe} label="vs N-1" />} />
        <Chiffre label="Résultat net" value={eur(s.rn)} sub={s.ca ? `${pctFr((s.rn / s.ca) * 100, 1)} du CA` : null} delta={s1 && <Variation cur={s.rn} prev={s1.rn} label="vs N-1" />} />
        {pm && <Chiffre label="Point mort annuel" value={eur(pm.seuil)} statut={pm.marge >= 0.1 * pm.ca ? "ok" : pm.marge >= 0 ? "warn" : "bad"} subTon sub={pm.marge >= 0 ? `Marge de sécurité ${eur(pm.marge)}` : `Manque ${eur(-pm.marge)} de CA`} aide="Seuil de rentabilité : CA annuel (12 mois glissants) qui couvre l'ensemble des charges fixes. Charges variables retenues : achats consommés et sous-traitance." />}
      </div>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>{libPeriode}</Th><Th right>Réalisé</Th><Th right>% CA</Th>{hasN1 && <Th right>N-1</Th>}{hasN1 && <Th right>Écart</Th>}</tr></thead>
            <tbody>
              {lignes.map((l) => {
                const v = l.f(pl, s), v1 = s1 ? l.f(pl1, s1) : null;
                const open = !!ouvert[l.id];
                return [
                  <tr key={l.id} onClick={() => l.postes && setOuvert((o) => ({ ...o, [l.id]: !o[l.id] }))}
                    style={{ borderTop: `1px solid ${C.borderLight}`, background: l.total ? C.bgLight : "white", cursor: l.postes ? "pointer" : "default" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: l.total ? 14 : 13, fontWeight: l.total ? 900 : 700, color: C.text, display: "flex", alignItems: "center" }}>{l.postes && <span style={{ display: "inline-block", width: 14, color: C.textLight }}>{open ? "▾" : "▸"}</span>}{l.label}<Info>{l.aide}</Info></div>
                    </td>
                    <td style={{ ...num, padding: "10px 12px", fontSize: l.total ? 14.5 : 13.5, fontWeight: l.total ? 900 : 700, color: l.total && v < 0 ? C.red : C.text }}>{eur(v)}</td>
                    <td style={{ ...num, padding: "10px 12px", fontSize: 12.5, color: C.textMid, fontWeight: 700 }}>{s.ca ? pctFr((v / s.ca) * 100, 1) : "—"}</td>
                    {hasN1 && <td style={{ ...num, padding: "10px 12px", fontSize: 13, color: C.textMid, fontWeight: 600 }}>{eur(v1)}</td>}
                    {hasN1 && <td style={{ ...num, padding: "10px 12px" }}><Variation cur={v} prev={v1} compact /></td>}
                  </tr>,
                  open && comptes(l).map((a) => (
                    <tr key={l.id + a.c} style={{ background: "#fbfefd" }}>
                      <td style={{ padding: "6px 12px 6px 40px", fontSize: 12.5, color: C.textMid, fontWeight: 600 }}>{source === "fec" && <span style={{ color: C.textLight, marginRight: 8, fontVariantNumeric: "tabular-nums" }}>{a.c}</span>}{a.l}</td>
                      <td style={{ ...num, padding: "6px 12px", fontSize: 12.5, color: C.text, fontWeight: 700 }}>{eur(a.d)}</td>
                      <td style={{ ...num, padding: "6px 12px", fontSize: 12, color: C.textLight }}>{s.ca ? pctFr((a.d / s.ca) * 100, 1) : ""}</td>
                      {hasN1 && <td style={{ ...num, padding: "6px 12px", fontSize: 12, color: C.textLight }}>{eur(a.d1)}</td>}
                      {hasN1 && <td style={{ ...num, padding: "6px 12px" }}><Variation cur={a.d} prev={a.d1} compact /></td>}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CarteTitre title="Évolution mensuelle · exercice" />
        <div style={{ overflowX: "auto", padding: "12px 0 6px" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
            <thead><tr><Th>&nbsp;</Th>{moisEx.map((x) => <Th key={x.k} right>{P.keyLabel(x.k, false).replace(/ \d+$/, "")}</Th>)}<Th right>Cumul</Th></tr></thead>
            <tbody>
              {LIGNES_MOIS.map((l) => {
                const tot = l.f({ s: sEx, p: P.plOver(idx, ytd) });
                const cell = (v) => (v == null ? "—" : l.pct ? pctFr(v) : eur(v));
                return (
                  <tr key={l.l} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "7px 12px", fontSize: 12.5, fontWeight: l.bold ? 900 : l.pct ? 600 : 700, color: l.pct ? C.textLight : C.text, whiteSpace: "nowrap" }}>{l.l.trim()}</td>
                    {moisEx.map((x) => { const v = l.f(x); return <td key={x.k} style={{ ...num, padding: "7px 10px", fontSize: 12.5, fontWeight: l.bold ? 800 : 600, color: l.signe && v < 0 ? C.red : l.pct ? C.textLight : C.text, background: x.k === key ? C.bg : "transparent" }}>{cell(v)}</td>; })}
                    <td style={{ ...num, padding: "7px 12px", fontSize: 12.5, fontWeight: 900, color: l.signe && tot < 0 ? C.red : C.text }}>{cell(tot)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BILAN & BFR
// ══════════════════════════════════════════════════════════════════════
function LigneBilan({ label, v, total, detail, aide }) {
  const [open, setOpen] = useState(false);
  if (Math.abs(v) < 1 && !detail?.length) return null;
  return (
    <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: "9px 0" }}>
      <div onClick={() => detail?.length && setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", gap: 10, cursor: detail?.length ? "pointer" : "default" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, display: "flex", alignItems: "center" }}>{detail?.length ? <span style={{ color: C.textLight, display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span> : null}{label}<Info>{aide}</Info></div>
        </div>
        <div style={{ ...num, fontSize: 14, fontWeight: 900, color: v < 0 ? C.red : C.text }}>{eur(v)}</div>
      </div>
      <div style={{ height: 5, background: C.bg, borderRadius: 3, marginTop: 6 }}><div style={{ width: `${Math.min(100, Math.max(0, (v / (total || 1)) * 100))}%`, height: 5, background: VIZ.serie, borderRadius: 3 }} /></div>
      {open && (
        <div style={{ marginTop: 6 }}>
          {detail.map((a, i) => (
            <div key={a.c + i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0 3px 14px", fontSize: 12.5, color: C.textMid }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: C.textLight, marginRight: 8 }}>{a.c}</span>{a.l}</span>
              <span style={{ ...num, fontWeight: 700 }}>{eur(a.v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export const statutDe = (v, ok, warn, haut = true) => (v == null ? "na" : haut ? (v >= ok ? "ok" : v >= warn ? "warn" : "bad") : (v <= ok ? "ok" : v <= warn ? "warn" : "bad"));

export function BilanView({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
  const { idx, key, covered } = contexte(client, moisIdx, moisYear, { fec: true });
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title="Bilan et besoin en fonds de roulement" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const b = P.bilanAt(client, key);
  const r = P.ratiosAt(client, key);
  const last12 = idx.keys.filter((k) => k <= key).slice(-12);
  const hist = last12.map((k) => P.bilanAt(client, k));
  const d = b.detail;
  const ratios = [
    { label: "DSO · délai clients", v: r.dso, f: (v) => `${Math.round(v)} jours`, statut: statutDe(r.dso, 45, 75, false), aide: "Créances clients TTC / CA TTC × 365, sur 12 mois glissants. Repère : moins de 45 jours." },
    { label: "DPO · délai fournisseurs", v: r.dpo, f: (v) => `${Math.round(v)} jours`, statut: r.dpo == null ? "na" : r.dpo > 60 ? "warn" : "ok", aide: "Dettes fournisseurs TTC / achats TTC × 365. Plafond légal (LME) : 60 jours date de facture." },
    { label: "DIO · rotation des stocks", v: r.dio, f: (v) => `${Math.round(v)} jours`, statut: r.dio == null ? "na" : r.dio > 120 ? "warn" : "ok", aide: "Stocks / achats consommés × 365." },
    { label: "Autonomie financière", v: r.autonomieFinanciere, f: (v) => pctFr(v * 100), statut: statutDe(r.autonomieFinanciere, 0.3, 0.15), aide: "Capitaux propres / total bilan. Repère bancaire : au moins 30 %." },
    { label: "Gearing", v: r.endettement, f: (v) => v.toFixed(2).replace(".", ","), statut: r.endettement == null ? (b.capitauxPropres <= 0 ? "bad" : "na") : statutDe(r.endettement, 1, 2, false), aide: "Endettement net (dettes financières − trésorerie) / capitaux propres. Repère : inférieur à 1." },
    { label: "Capacité de remboursement", v: r.capaciteRemboursement, f: (v) => `${v.toFixed(1).replace(".", ",")} ans`, statut: r.capaciteRemboursement == null ? "na" : statutDe(r.capaciteRemboursement, 3, 5, false), aide: "Dettes financières / CAF annuelle. Repère bancaire : 3 à 4 ans maximum." },
    { label: "Point mort", v: r.pointMort, f: (v) => eur(v), statut: r.margeSecurite == null ? "na" : r.margeSecurite > 0.1 * r.caAnnuel ? "ok" : r.margeSecurite > 0 ? "warn" : "bad", sub: r.margeSecurite != null ? `${r.margeSecurite >= 0 ? "Marge de sécurité" : "Manque"} ${eur(Math.abs(r.margeSecurite))}` : null, aide: "Seuil de rentabilité annuel : charges fixes / taux de marge sur coûts variables." },
    { label: "BFR", v: r.bfrJoursCA, f: (v) => `${Math.round(v)} jours de CA`, statut: "na", aide: "BFR / CA HT annuel × 365." },
  ];
  return (
    <Page>
      <EnTete title="Bilan de gestion" detail={`Situation au ${fmtDate(P.monthEnd(b.key))}`} sub="Bilan reconstitué chaque mois à partir du FEC (non certifié). Cliquez sur une ligne pour le détail par compte." nav={nav} />
      <Card style={{ padding: "18px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 14, display: "flex", alignItems: "center" }}>FR − BFR = Trésorerie nette<Info>Les ressources stables (fonds de roulement) financent le besoin né du cycle d'exploitation (BFR) ; le solde constitue la trésorerie nette.</Info></div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
          {[
            { l: "Fonds de roulement (FR)", v: b.fr, a: "Capitaux permanents − actif immobilisé net" },
            { op: "−" },
            { l: "BFR", v: b.bfr, a: "Actif circulant − dettes d'exploitation" },
            { op: "=" },
            { l: "Trésorerie nette", v: b.tresoNette, a: "Disponibilités − concours bancaires", accent: true },
          ].map((x, i) => x.op ? <div key={i} style={{ fontSize: 26, fontWeight: 900, color: C.textLight, alignSelf: "center", padding: "0 4px" }}>{x.op}</div> : (
            <div key={i} style={{ flex: "1 1 200px", background: x.accent ? C.primary : C.bgLight, color: x.accent ? "white" : C.text, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}>{x.l}</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{eur(x.v)}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.75, lineHeight: 1.4 }}>{x.a}</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={grid(420)}>
        <Card style={{ padding: "16px 22px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Actif</div>
          <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700, marginBottom: 6 }}>Total {eur(b.actif)}</div>
          <LigneBilan label="Immobilisations (valeur nette)" v={b.immoNet} total={b.actif} detail={d.immoNet} aide={`Valeur brute ${eur(b.immoBrut)}, amortissements cumulés ${eur(b.amortImmo)}.`} />
          <LigneBilan label="Stocks" v={b.stocks} total={b.actif} detail={d.stocks} />
          <LigneBilan label="Créances clients" v={b.clients} total={b.actif} detail={d.clients} aide="Factures émises non encore encaissées (411, 416, 418)." />
          <LigneBilan label="Autres créances" v={b.autresCreances} total={b.actif} detail={d.autresCreances} aide="TVA déductible, crédit de TVA, avances et acomptes versés…" />
          <LigneBilan label="Charges constatées d'avance" v={b.cca} total={b.actif} detail={d.cca} />
          <LigneBilan label="Disponibilités" v={b.dispo} total={b.actif} detail={d.dispo} aide="Banques (512) et caisse (53)." />
        </Card>
        <Card style={{ padding: "16px 22px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Passif</div>
          <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700, marginBottom: 6 }}>Total {eur(b.passif)}</div>
          <LigneBilan label="Capitaux propres" v={b.capitauxPropres} total={b.passif} detail={[...d.capitaux, ...d.resultat]} aide={`Dont résultat de l'exercice en cours : ${eur(b.resultat)}.`} />
          <LigneBilan label="Provisions" v={b.provisions} total={b.passif} detail={d.provisions} />
          <LigneBilan label="Dettes financières" v={b.dettesFin} total={b.passif} detail={d.dettesFin} aide="Emprunts auprès des établissements de crédit (16, 17)." />
          <LigneBilan label="Comptes courants d'associés" v={b.associes} total={b.passif} detail={d.associes} aide="Sommes prêtées par les associés (455)." />
          <LigneBilan label="Concours bancaires courants" v={b.concours} total={b.passif} detail={d.concours} aide="Découverts et soldes créditeurs de banque (519)." />
          <LigneBilan label="Dettes fournisseurs" v={b.fournisseurs} total={b.passif} detail={d.fournisseurs} />
          <LigneBilan label="Dettes fiscales et sociales" v={b.fiscalSocial} total={b.passif} detail={d.fiscalSocial} aide="TVA, URSSAF, salaires et impôts à payer (42, 43, 44)." />
          <LigneBilan label="Autres dettes et produits constatés d'avance" v={b.autresDettes + b.pca} total={b.passif} detail={[...d.autresDettes, ...d.pca]} />
        </Card>
      </div>
      {Math.abs(b.ecart) >= 1 && <div style={{ fontSize: 12, color: C.orange, fontWeight: 700 }}>Écart actif / passif de {eur(b.ecart)} : la comptabilité importée contient probablement des écritures déséquilibrées ou une reprise d'à-nouveaux incomplète.</div>}
      <div>
        <Titre>Ratios financiers</Titre>
        <div style={grid(230)}>
          {ratios.map((x) => <Chiffre key={x.label} label={x.label} value={x.v == null ? "—" : x.f(x.v)} statut={x.statut === "na" ? null : x.statut} subTon sub={x.sub || (x.statut !== "na" ? STATUT[x.statut].mot : null)} aide={x.aide} />)}
        </div>
        <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, marginTop: 8 }}>{r.mois} mois glissants{r.mois < 12 ? ", annualisés" : ""} · délais TTC</div>
      </div>
      {hist.length > 1 && (
        <Card>
          <CarteTitre title="FR, BFR et trésorerie nette · 12 mois" sub="Quand le BFR augmente (clients plus lents, stock qui gonfle), la trésorerie baisse d'autant à FR constant." />
          <div style={{ padding: "12px 18px 16px" }}>
            <Lignes labels={last12.map((k) => P.keyLabel(k, false).replace(/ \d+$/, ""))} keys={last12.map((k) => P.keyLabel(k))}
              series={[{ label: "BFR", color: VIZ.externes, values: hist.map((h) => h.bfr) }, { label: "Trésorerie nette", color: VIZ.serie, values: hist.map((h) => h.tresoNette) }, { label: "FR", color: VIZ.achats, values: hist.map((h) => h.fr) }]} />
          </div>
        </Card>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TRÉSORERIE RÉELLE
// ══════════════════════════════════════════════════════════════════════
export function TresorerieFec({ client, moisIdx, moisYear, setMoisIdx, setMoisKey, tresoOf }) {
  const [periode, setPeriode] = useState("mois");
  const [ouvert, setOuvert] = useState(false);
  const { idx, key, covered } = contexte(client, moisIdx, moisYear, { fec: true });
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title="Trésorerie" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const fin = P.bilanAt(client, key);
  const ytd = P.ytdKeys(idx, key);
  const prevKey = P.shiftKey(key, -1);
  let debut, keys;
  if (periode === "mois") { keys = [key]; debut = idx.months.has(prevKey) ? P.bilanAt(client, prevKey) : P.bilanAt(client, key, { ouverture: true }); }
  else { keys = ytd; debut = P.bilanAt(client, key, { ouverture: true }) || (idx.months.has(P.shiftKey(ytd[0], -1)) ? P.bilanAt(client, P.shiftKey(ytd[0], -1)) : null); }
  const flux = debut ? P.fluxTresorerie(client, keys, debut, fin) : null;
  const r = P.ratiosAt(client, key);
  const histKeys = idx.keys.filter((k) => k <= key).slice(-24);
  // Prolongement en pointillés : 6 mois du plan de trésorerie, si le mois consulté est le dernier connu.
  const projection = prolongerTresorerie(client, key, 6, tresoOf);
  const cli = P.tiersAt(client, key, "C");
  // Ce qui va sortir prochainement : dettes à court terme connues
  const somme = (list, pref) => list.filter((a) => pref.some((p) => a.c.startsWith(p))).reduce((t, a) => t + a.v, 0);
  const tva = somme(fin.detail.fiscalSocial, ["445"]) - somme(fin.detail.autresCreances, ["445"]);
  const social = somme(fin.detail.fiscalSocial, ["43"]);
  const salaires = somme(fin.detail.fiscalSocial, ["42"]);
  const is = somme(fin.detail.fiscalSocial, ["444"]);
  const autresFisc = fin.fiscalSocial - somme(fin.detail.fiscalSocial, ["445", "43", "42", "444"]);
  const sorties = [
    { l: "Fournisseurs", v: fin.fournisseurs },
    { l: "TVA à décaisser", v: Math.max(0, tva) },
    { l: "URSSAF et organismes sociaux", v: social },
    { l: "Rémunérations dues", v: salaires },
    { l: "IS", v: is },
    { l: "Autres impôts et taxes", v: autresFisc },
  ].filter((x) => x.v >= 1);
  const totalSorties = sorties.reduce((t, x) => t + x.v, 0);
  const entrees = cli ? cli.total : 0;
  return (
    <Page>
      <EnTete title="Trésorerie" sub="Trésorerie nette réelle d'après les comptes de banque et de caisse du FEC." nav={nav} />
      <div style={grid(200)}>
        <Chiffre label="Trésorerie nette" value={eur(fin.tresoNette)} sub={`Au ${fmtDate(P.monthEnd(key))}`} statut={fin.tresoNette < 0 ? "bad" : r.autonomieTreso >= 1.5 ? "ok" : r.autonomieTreso >= 0.7 ? "warn" : "bad"} aide="Disponibilités − concours bancaires courants." />
        <Chiffre label="Variation M-1" value={idx.months.has(prevKey) ? `${fin.tresoNette - P.bilanAt(client, prevKey).tresoNette >= 0 ? "+" : "−"}${eur(Math.abs(fin.tresoNette - P.bilanAt(client, prevKey).tresoNette))}` : "—"} />
        <Chiffre label="Couverture" value={r.autonomieTreso == null ? "—" : `${r.autonomieTreso.toFixed(1).replace(".", ",")} mois`} sub={r.depensesMois ? `Charges décaissables : ${eur(r.depensesMois)}/mois` : null} aide="Trésorerie nette / charges décaissables mensuelles moyennes (3 derniers mois) : nombre de mois tenus sans encaissement." />
        <Chiffre label="BFR" value={eur(fin.bfr)} sub={r.bfrJoursCA != null ? `${Math.round(r.bfrJoursCA)} jours de CA` : null} aide="Besoin en fonds de roulement : stocks + créances − dettes d'exploitation." />
      </div>
      <div style={grid(440)}>
        <Card>
          <CarteTitre title="Tableau de flux de trésorerie" detail={flux ? `${eur(flux.debut)} → ${eur(flux.fin)} (${flux.variation >= 0 ? "+" : "−"}${eur(Math.abs(flux.variation))})` : "Point de départ indisponible"} sub="De la variation du résultat à la variation de trésorerie : CAF, variation du BFR, investissements, financement."
            right={<ChoixPeriode value={periode} onChange={setPeriode} options={[["mois", "Mois"], ["exercice", "Cumul exercice"]]} />} />
          <div style={{ padding: "12px 22px 18px" }}>
            {flux ? flux.lignes.filter((l) => Math.abs(l.v) >= 1 || l.id === "rn").map((l) => (
              <div key={l.id} style={{ borderTop: `1px solid ${C.borderLight}`, padding: "9px 0" }}>
                <div onClick={() => l.detail && setOuvert(!ouvert)} style={{ display: "flex", justifyContent: "space-between", gap: 10, cursor: l.detail ? "pointer" : "default" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, display: "flex", alignItems: "center" }}>{l.detail && <span style={{ color: C.textLight, display: "inline-block", width: 14 }}>{ouvert ? "▾" : "▸"}</span>}{l.label}<Info>{l.aide}</Info></div>
                  </div>
                  <div style={{ ...num, fontSize: 14, fontWeight: 900, color: l.v < 0 ? C.red : C.green }}>{l.v >= 0 ? "+" : "−"}{eur(Math.abs(l.v))}</div>
                </div>
                {l.detail && ouvert && l.detail.filter((x) => Math.abs(x.v) >= 1).map((x) => (
                  <div key={x.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0 3px 14px", fontSize: 12.5, color: C.textMid }}>
                    <span>{x.label}</span><span style={{ ...num, fontWeight: 700, color: x.v < 0 ? C.red : C.green }}>{x.v >= 0 ? "+" : "−"}{eur(Math.abs(x.v))}</span>
                  </div>
                ))}
              </div>
            )) : <div style={{ fontSize: 13, color: C.textLight }}>Importez aussi le mois précédent (ou le FEC avec ses à-nouveaux) pour voir l'explication.</div>}
            {flux && <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.text}`, paddingTop: 10, marginTop: 2 }}><span style={{ fontSize: 14, fontWeight: 900, color: C.text }}>Variation de trésorerie</span><span style={{ ...num, fontSize: 15, fontWeight: 900, color: flux.variation < 0 ? C.red : C.green }}>{flux.variation >= 0 ? "+" : "−"}{eur(Math.abs(flux.variation))}</span></div>}
          </div>
        </Card>
        <Card>
          <CarteTitre title="Encaissements et décaissements à venir" detail={`Au ${fmtDate(P.monthEnd(key))}`} sub="Créances et dettes d'exploitation inscrites en comptabilité. S'y ajoutent les échéances d'emprunt et les charges des mois suivants." />
          <div style={{ padding: "12px 22px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13.5, fontWeight: 900, color: C.text }}><span>Créances clients</span><span style={{ ...num, color: C.green }}>+{eur(entrees)}</span></div>
            {cli && entrees > 0 && <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 8 }}>dont {eur(cli.buckets[0].v)} facturés il y a moins de 30 jours</div>}
            <div style={{ fontSize: 13.5, fontWeight: 900, color: C.text, padding: "8px 0 2px", borderTop: `1px solid ${C.borderLight}` }}>Dettes d'exploitation</div>
            {sorties.map((x) => (
              <div key={x.l} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}</div>
                <span style={{ ...num, fontSize: 13, fontWeight: 800, color: C.red }}>−{eur(x.v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.text}`, paddingTop: 10, marginTop: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 900, color: C.text }}>Trésorerie nette après dénouement</span>
              <span style={{ ...num, fontSize: 15, fontWeight: 900, color: fin.tresoNette + entrees - totalSorties < 0 ? C.red : C.text }}>{eur(fin.tresoNette + entrees - totalSorties)}</span>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <CarteTitre title="Trésorerie nette fin de mois" detail={projection.length ? `Réel puis prévision sur ${projection.length} mois` : null} sub={projection.length ? "Pointillés : prévision du plan de trésorerie (budget, sinon N-1, sinon tendance 3 mois ; échéances d'emprunt, acomptes d'IS et flux exceptionnels saisis)." : null} />
        <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {projection.length > 0 && <Legende items={[{ label: "Réel", color: VIZ.serie, line: true }, { label: "Prévision", color: VIZ.serie, dash: true }]} />}
          <Courbe data={[...histKeys.map((k) => ({ key: k, l: P.keyLabel(k, false).replace(/ \d+$/, ""), v: P.bilanAt(client, k).tresoNette, current: k === key })), ...projection.map((x) => ({ key: x.key, l: P.keyLabel(x.key, false).replace(/ \d+$/, ""), p: x.solde }))]} height={210}
            tip={(x) => [P.keyLabel(x.key), x.p != null ? `Prévision : ${eur(x.p)}` : `Trésorerie : ${eur(x.v)}`]} />
        </div>
        {(fin.detail.dispo.length > 0 || fin.detail.concours.length > 0) && (
          <div style={{ padding: "0 22px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[...fin.detail.dispo, ...fin.detail.concours.map((a) => ({ ...a, v: -a.v }))].map((a) => (
              <div key={a.c} style={{ background: C.bgLight, borderRadius: 12, padding: "8px 12px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMid }}>{a.l}</div>
                <div style={{ ...num, textAlign: "left", fontSize: 14, fontWeight: 900, color: a.v < 0 ? C.red : C.text }}>{eur(a.v)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CLIENTS (créances) ET FOURNISSEURS (dettes)
// ══════════════════════════════════════════════════════════════════════
// Message de relance prêt à envoyer pour les factures d'un client de plus de 30 jours.
function messageRelance(x) {
  const items = x.items.filter((it) => it.age > 30);
  const lignes = items.map((it) => `- ${it.p ? `Facture ${it.p}` : "Facture"} du ${fmtDate(it.d)} : ${eur(it.m)}`).join("\n");
  return `Bonjour,\n\nSauf erreur de notre part, ${items.length > 1 ? "les factures suivantes restent" : "la facture suivante reste"} à régler :\n${lignes}\n\nTotal : ${eur(items.reduce((s, it) => s + it.m, 0))}.\n\nPourriez-vous nous indiquer la date de règlement prévue ? Si le paiement a été fait entre-temps, merci de ne pas tenir compte de ce message.\n\nBien cordialement,`;
}
export function TiersView({ client, moisIdx, moisYear, setMoisIdx, setMoisKey, side }) {
  const [ouvert, setOuvert] = useState({});
  const [copie, setCopie] = useState(null);
  const { idx, key, covered } = contexte(client, moisIdx, moisYear);
  const isC = side === "C";
  const title = isC ? "Créances clients" : "Dettes fournisseurs";
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title={title} idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const t = tiersPour(client, key, side);
  const fec = t?.source === "fec";
  const r = fec ? P.ratiosAt(client, key) : null;
  const ytd = P.ytdKeys(idx, key);
  const top = topTiersIdx(idx, ytd, isC ? "c" : "f");
  const caYtd = P.sigOf(P.plOver(idx, ytd)).ca;
  const totalTop = top.reduce((s, x) => s + x.v, 0);
  if (!t) return (
    <Page>
      <EnTete title={title} nav={nav} />
      <Card style={{ padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 6 }}>Pas encore de suivi {isC ? "des factures clients" : "des factures fournisseurs"}</div>
        <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>Il apparaît dès que la comptabilité (FEC) est importée : chaque {isC ? "client" : "fournisseur"}, ses factures non réglées et leur ancienneté.</div>
      </Card>
    </Page>
  );
  const vieux = t.buckets[2].v + t.buckets[3].v;
  // Sans comptabilité : retard moyen déclaré dans le fichier importé
  const retards = t.list.flatMap((x) => x.items).filter((it) => it.retard != null);
  const delai = fec ? (isC ? r?.dso : r?.dpo) : null;
  const retardMoyen = retards.length ? retards.reduce((s2, it) => s2 + it.retard, 0) / retards.length : null;
  return (
    <Page>
      <EnTete title={title} detail={`Situation au ${fmtDate(t.date)}`} sub={fec ? "Encours par tiers, facture par facture. Les règlements sont imputés sur les factures les plus anciennes (FIFO)." : "Encours par tiers d'après le fichier importé."} nav={nav} source={t.source} fin={fec ? t.date : null} />
      <div style={grid(200)}>
        <Chiffre label={isC ? "Encours clients" : "Encours fournisseurs"} value={eur(t.total)} sub={`${t.list.length} ${isC ? "client" : "fournisseur"}${t.list.length > 1 ? "s" : ""}`} />
        {fec ? <Chiffre label={isC ? "DSO" : "DPO"} value={delai == null ? "—" : `${Math.round(delai)} jours`} statut={isC ? statutDe(delai, 45, 75, false) : null} aide={isC ? "Délai moyen de paiement clients : créances TTC / CA TTC × 365 (12 mois glissants)." : "Délai moyen de paiement fournisseurs : dettes TTC / achats TTC × 365. Plafond légal : 60 jours."} />
          : <Chiffre label="Retard moyen" value={retardMoyen == null ? "—" : `${Math.round(retardMoyen)} jours`} statut={isC && retardMoyen != null ? statutDe(retardMoyen, 15, 45, false) : null} aide="Retard moyen au-delà de l'échéance, d'après le fichier importé." />}
        <Chiffre label="Encours > 60 jours" value={eur(vieux)} statut={isC ? (vieux > 0.3 * t.total ? "bad" : vieux > 0.15 * t.total ? "warn" : "ok") : null} sub={t.total ? `${pctFr((vieux / t.total) * 100)} de l'encours` : null} aide={isC ? "Créances les plus exposées au risque d'impayé : à relancer en priorité." : "Dettes anciennes : risque de tension avec les fournisseurs."} />
      </div>
      <Card style={{ padding: "16px 22px 18px" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 10 }}>Balance âgée</div>
        <Repartition segments={t.buckets.map((b, i) => ({ id: b.id, label: b.label, v: b.v, color: VIZ.age[i] }))} />
      </Card>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><Th>{isC ? "Client" : "Fournisseur"}</Th><Th right>Solde</Th><Th right>&gt; 60 j</Th><Th right>Antériorité</Th>{isC && <Th right>Relance</Th>}</tr></thead>
            <tbody>
              {t.list.map((x) => {
                const v60 = x.items.filter((it) => it.age > 60).reduce((s, it) => s + it.m, 0);
                const oldest = Math.max(...x.items.map((it) => it.age));
                const open = !!ouvert[x.n];
                return [
                  <tr key={x.n} onClick={() => setOuvert((o) => ({ ...o, [x.n]: !o[x.n] }))} style={{ borderTop: `1px solid ${C.borderLight}`, cursor: "pointer" }} className="row-hover">
                    <td style={{ padding: "10px 12px", fontSize: 13.5, fontWeight: 800, color: C.text }}><span style={{ color: C.textLight, display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span>{x.l}</td>
                    <td style={{ ...num, padding: "10px 12px", fontSize: 13.5, fontWeight: 900, color: C.text }}>{eur(x.solde)}</td>
                    <td style={{ ...num, padding: "10px 12px", fontSize: 13, fontWeight: 800, color: v60 > 0 && isC ? C.orange : C.textMid }}>{v60 > 0 ? eur(v60) : "—"}</td>
                    <td style={{ ...num, padding: "10px 12px", fontSize: 13, fontWeight: 700, color: oldest > 90 && isC ? C.red : C.textMid }}>{oldest} jours</td>
                    {isC && (
                      <td style={{ ...num, padding: "6px 12px" }} onClick={(e) => e.stopPropagation()}>
                        {oldest > 30 ? <Btn small variant="ghost" onClick={() => { try { navigator.clipboard.writeText(messageRelance(x)); setCopie(x.n); setTimeout(() => setCopie(null), 2500); } catch { /* presse-papiers indisponible */ } }}>{copie === x.n ? "Message copié" : "Copier une relance"}</Btn> : <span style={{ fontSize: 12, color: C.textLight }}>—</span>}
                      </td>
                    )}
                  </tr>,
                  open && x.items.map((it, i) => (
                    <tr key={x.n + i} style={{ background: "#fbfefd" }}>
                      <td style={{ padding: "5px 12px 5px 38px", fontSize: 12.5, color: C.textMid }}>{fmtDate(it.d)} · {it.p || "—"} · {it.lib}</td>
                      <td style={{ ...num, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, color: C.text }}>{eur(it.m)}</td>
                      <td />
                      <td style={{ ...num, padding: "5px 12px", fontSize: 12.5, color: it.age > 60 && isC ? C.orange : C.textLight }}>{it.age} jours</td>
                      {isC && <td />}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {top.length > 0 && (
        <Card>
          <CarteTitre title={isC ? "Top clients · CA cumul exercice" : "Top fournisseurs · achats cumul exercice"} sub={isC ? "CA HT facturé depuis l'ouverture de l'exercice. Risque de dépendance au-delà de 30 % du CA sur un seul client." : "Achats et charges HT facturés depuis l'ouverture de l'exercice."} />
          <div style={{ padding: "10px 22px 18px" }}>
            {top.slice(0, 10).map((x) => {
              const base = isC ? caYtd : totalTop;
              const part = base > 0 ? (x.v / base) * 100 : 0;
              return (
                <div key={x.n} style={{ padding: "6px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}</span>
                    <span style={{ display: "flex", gap: 12 }}><span style={{ ...num, fontSize: 13, fontWeight: 900 }}>{eur(x.v)}</span><span style={{ ...num, width: 52, fontSize: 12.5, fontWeight: 700, color: isC && part > 30 ? C.orange : C.textMid }}>{pctFr(part)}</span></span>
                  </div>
                  <div style={{ height: 5, background: C.bg, borderRadius: 3, marginTop: 5 }}><div style={{ width: `${Math.min(100, part)}%`, height: 5, background: isC ? VIZ.serie : VIZ.externes, borderRadius: 3 }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// VENTES · ACHATS · CHARGES · SALAIRES (même gabarit)
// ══════════════════════════════════════════════════════════════════════
const VUES_POSTES = {
  ventes: { title: "Chiffre d'affaires", sub: "CA HT par nature de vente (comptes 70), comparé à N-1.", postes: ["ventesMarch", "prodVendue", "prodStockee", "prodImmo"], tiers: "c", produit: true },
  achats: { title: "Achats et marge brute", sub: "Achats consommés (60, variation de stocks) et taux de marge brute.", postes: ["achatsMarch", "varStockMarch", "achatsMat", "varStockMat"], tiers: "f" },
  charges: { title: "Frais généraux", sub: "Charges externes, impôts et taxes et autres charges de gestion, par nature. Hausse supérieure à 15 % vs N-1 signalée en orange.", postes: ["chargesExternes", "impotsTaxes", "autresCharges"], regroupe: true, tiers: "f" },
  salaires: { title: "Masse salariale", sub: "Salaires bruts et charges sociales (comptes 64).", postes: ["salaires", "chargesSociales"] },
};
export function PosteView({ client, moisIdx, moisYear, setMoisIdx, setMoisKey, vue }) {
  const cfg = VUES_POSTES[vue];
  const { idx, key, covered, source, fin } = contexte(client, moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title={cfg.title} idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const ytd = P.ytdKeys(idx, key);
  const ytd1 = ytd.map((k) => P.shiftKey(k, -12));
  const hasN1 = ytd1.every((k) => idx.months.has(k));
  const key1 = P.shiftKey(key, -12);
  const plM = P.monthPL(idx, key), plM1 = idx.months.has(key1) ? P.monthPL(idx, key1) : null;
  const plY = P.plOver(idx, ytd), plY1 = hasN1 ? P.plOver(idx, ytd1) : null;
  const sY = P.sigOf(plY), sY1 = plY1 ? P.sigOf(plY1) : null, sM = P.sigOf(plM), sM1 = plM1 ? P.sigOf(plM1) : null;
  const tot = (pl) => (pl ? cfg.postes.reduce((t, p) => t + pl[p], 0) : null);
  const grp = (a) => (cfg.regroupe ? P.pcgRacine(a.c) : a.c);
  const lib = (a) => (cfg.regroupe ? P.pcgLabel(P.pcgRacine(a.c)) || a.l : a.l);
  const rows = new Map();
  const add = (pl, field) => { if (!pl) return; for (const a of pl.accounts.values()) { if (!cfg.postes.includes(a.poste)) continue; const g = grp(a); const x = rows.get(g) || { c: g, l: lib(a), m: 0, m1: 0, y: 0, y1: 0 }; x[field] += a.v; rows.set(g, x); } };
  add(plM, "m"); add(plM1, "m1"); add(plY, "y"); add(plY1, "y1");
  const list = [...rows.values()].filter((x) => Math.abs(x.y) >= 1 || Math.abs(x.y1) >= 1).sort((a, b) => b.y - a.y);
  const series = Array.from({ length: 12 }, (_, i) => {
    const k = P.shiftKey(key, i - 11), k1 = P.shiftKey(k, -12);
    return { key: k, l: P.keyLabel(k, false).replace(/ \d+$/, ""), current: k === key, v: idx.months.has(k) ? tot(P.monthPL(idx, k)) : null, n1: idx.months.has(k1) ? tot(P.monthPL(idx, k1)) : null };
  });
  const tM = tot(plM), tY = tot(plY), tY1 = tot(plY1), tM1 = tot(plM1);
  const top = cfg.tiers ? topTiersIdx(idx, ytd, cfg.tiers) : [];
  // Détail analytique lu dans les fichiers importés (produits, canaux, salariés)
  const prodY = vue === "ventes" || vue === "achats" ? produitsSur(client, ytd) : null;
  const prodM = vue === "ventes" ? produitsSur(client, [key]) : null;
  const salaries = vue === "salaires" ? salariesSur(client, key) : [];
  const exLib = `${P.keyLabel(ytd[0], false)} → ${P.keyLabel(key, false)}`;
  const tauxMarge = (s) => (s && s.ca > 0 ? (s.margeBrute / s.ca) * 100 : null);
  return (
    <Page>
      <EnTete title={cfg.title} sub={cfg.sub} nav={nav} source={source} fin={fin} />
      <div style={grid(200)}>
        <Chiffre label={P.keyLabel(key)} value={eur(tM)} delta={tM1 != null && <Variation cur={tM} prev={tM1} goodUp={!!cfg.produit} label="vs N-1" />} />
        <Chiffre label="Cumul exercice" value={eur(tY)} sub={exLib} delta={tY1 != null && <Variation cur={tY} prev={tY1} goodUp={!!cfg.produit} label="vs N-1" />} />
        {!cfg.produit && <Chiffre label="% du CA" value={sY.ca > 0 ? pctFr((tY / sY.ca) * 100, 1) : "—"} sub="Cumul exercice" delta={sY1 && sY1.ca > 0 && sY.ca > 0 && <Variation cur={(tY / sY.ca) * 100} prev={(tY1 / sY1.ca) * 100} points goodUp={false} label="vs N-1" />} />}
        {vue === "achats" && <Chiffre label="Taux de marge brute" value={pctFr(tauxMarge(sY), 1)} sub={`Mois : ${pctFr(tauxMarge(sM), 1)}${sM1 ? ` · N-1 : ${pctFr(tauxMarge(sM1), 1)}` : ""}`} delta={sY1 && <Variation cur={tauxMarge(sY)} prev={tauxMarge(sY1)} points label="vs N-1 (cumul)" />} />}
        {vue === "salaires" && <Chiffre label="Taux de charges sociales" value={plY.salaires > 0 ? pctFr((plY.chargesSociales / plY.salaires) * 100) : "—"} sub="Charges sociales / salaires bruts" />}
        {vue === "ventes" && <Chiffre label="CA moyen mensuel" value={eur(tY / ytd.length)} sub={`${ytd.length} mois`} />}
      </div>
      <Card>
        <CarteTitre title={`${cfg.title} · 12 mois glissants`} />
        <div style={{ padding: "10px 22px 0" }}><Legendes /></div>
        <div style={{ padding: "8px 18px 14px" }}><Colonnes data={series} n1 tip={(x) => [P.keyLabel(x.key), `N : ${eur(x.v)}`, `N-1 : ${eur(x.n1)}`]} /></div>
      </Card>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr><Th>{cfg.regroupe ? "Nature" : source === "fec" ? "Compte" : "Poste"}</Th><Th right>{P.keyLabel(key, false)}</Th>{plM1 && <Th right>{P.keyLabel(key1, false)}</Th>}<Th right>Cumul N</Th>{hasN1 && <Th right>Cumul N-1</Th>}{hasN1 && <Th right>Écart</Th>}<Th right>% CA</Th></tr></thead>
            <tbody>
              {list.map((x) => {
                const e = hasN1 ? evo(x.y, x.y1) : null;
                const hausse = !cfg.produit && e != null && e > 15 && x.y - x.y1 > 500;
                return (
                  <tr key={x.c} style={{ borderTop: `1px solid ${C.borderLight}`, background: hausse ? C.orangeBg : "white" }}>
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700, color: C.text }}>{source === "fec" && <span style={{ color: C.textLight, marginRight: 8, fontVariantNumeric: "tabular-nums" }}>{x.c}</span>}{x.l}</td>
                    <td style={{ ...num, padding: "9px 12px", fontSize: 13, fontWeight: 700 }}>{eur(x.m)}</td>
                    {plM1 && <td style={{ ...num, padding: "9px 12px", fontSize: 12.5, color: C.textMid }}>{eur(x.m1)}</td>}
                    <td style={{ ...num, padding: "9px 12px", fontSize: 13, fontWeight: 900 }}>{eur(x.y)}</td>
                    {hasN1 && <td style={{ ...num, padding: "9px 12px", fontSize: 12.5, color: C.textMid }}>{eur(x.y1)}</td>}
                    {hasN1 && <td style={{ ...num, padding: "9px 12px" }}><Variation cur={x.y} prev={x.y1} compact goodUp={!!cfg.produit} /></td>}
                    <td style={{ ...num, padding: "9px 12px", fontSize: 12.5, color: C.textMid }}>{sY.ca > 0 ? pctFr((x.y / sY.ca) * 100, 1) : "—"}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: `2px solid ${C.text}`, background: C.bgLight }}>
                <td style={{ padding: "10px 12px", fontSize: 13.5, fontWeight: 900 }}>Total</td>
                <td style={{ ...num, padding: "10px 12px", fontSize: 13.5, fontWeight: 900 }}>{eur(tM)}</td>
                {plM1 && <td style={{ ...num, padding: "10px 12px", fontSize: 13, fontWeight: 700, color: C.textMid }}>{eur(tM1)}</td>}
                <td style={{ ...num, padding: "10px 12px", fontSize: 13.5, fontWeight: 900 }}>{eur(tY)}</td>
                {hasN1 && <td style={{ ...num, padding: "10px 12px", fontSize: 13, fontWeight: 700, color: C.textMid }}>{eur(tY1)}</td>}
                {hasN1 && <td style={{ ...num, padding: "10px 12px" }}><Variation cur={tY} prev={tY1} compact goodUp={!!cfg.produit} /></td>}
                <td style={{ ...num, padding: "10px 12px", fontSize: 13, fontWeight: 800 }}>{sY.ca > 0 ? pctFr((tY / sY.ca) * 100, 1) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      {vue === "ventes" && prodY.produits.length > 0 && (
        <div style={grid(420)}>
          <Card>
            <CarteTitre title="CA par produit" detail={`Cumul exercice · ${exLib}`} />
            <TableProduits produits={prodY.produits} total={prodY.produits.reduce((t, x) => t + x.ca, 0)} mois={prodM.produits} />
          </Card>
          {prodY.canaux.length > 1 && (
            <Card>
              <CarteTitre title="CA par canal" detail="Cumul exercice" />
              <div style={{ padding: "14px 22px 20px" }}>
                <Repartition segments={prodY.canaux.slice(0, 5).map((c2, i) => ({ id: c2.l, label: c2.l, v: c2.v, color: [VIZ.serie, VIZ.externes, VIZ.achats, VIZ.personnel, VIZ.autres][i] }))} />
              </div>
            </Card>
          )}
        </div>
      )}
      {vue === "achats" && prodY.produits.some((x) => x.ca !== x.marge) && (
        <Card>
          <CarteTitre title="Marge par produit" detail="Cumul exercice" sub="Taux de marge inférieur à 25 % signalé en orange." />
          <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr><Th>Produit</Th><Th right>Chiffre d'affaires</Th><Th right>Coût</Th><Th right>Marge</Th><Th right>Taux</Th></tr></thead>
              <tbody>
                {[...prodY.produits].sort((a, b) => b.marge - a.marge).slice(0, 15).map((x) => {
                  const tx = x.ca > 0 ? (x.marge / x.ca) * 100 : 0;
                  return (
                    <tr key={x.l} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}</td>
                      <td style={{ ...num, padding: "8px 12px", fontSize: 13 }}>{eur(x.ca)}</td>
                      <td style={{ ...num, padding: "8px 12px", fontSize: 13, color: C.textMid }}>{eur(x.ca - x.marge)}</td>
                      <td style={{ ...num, padding: "8px 12px", fontSize: 13, fontWeight: 900 }}>{eur(x.marge)}</td>
                      <td style={{ ...num, padding: "8px 12px", fontSize: 13, fontWeight: 800, color: tx < 25 ? C.orange : C.green }}>{pctFr(tx)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {vue === "salaires" && (
        <div style={grid(420)}>
          {salaries.length > 0 && (
            <Card>
              <CarteTitre title={`Détail par salarié · ${P.keyLabel(key)}`} sub="D'après les bulletins de paie importés." />
              <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead><tr><Th>Salarié</Th><Th right>Brut</Th><Th right>Net versé</Th><Th right>Coût employeur</Th></tr></thead>
                  <tbody>
                    {salaries.map((x, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "8px 12px" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{x.nom}</div>{(x.poste || x.statut) && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{[x.poste, x.statut].filter(Boolean).join(" · ")}</div>}</td>
                        <td style={{ ...num, padding: "8px 12px", fontSize: 13 }}>{eur(x.brut)}</td>
                        <td style={{ ...num, padding: "8px 12px", fontSize: 13, color: C.textMid }}>{x.net ? eur(x.net) : "—"}</td>
                        <td style={{ ...num, padding: "8px 12px", fontSize: 13, fontWeight: 900 }}>{eur(x.brut + x.cp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <Card>
            <CarteTitre title="Calendrier de décaissement" />
            <div style={{ padding: "12px 22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { t: "M · fin de mois", d: "Versement des salaires nets." },
                { t: "M+1 · le 5 ou le 15", d: "Prélèvement URSSAF des cotisations salariales et patronales (DSN)." },
                { t: "Coût employeur", d: `${plY.salaires > 0 ? Math.round(100 + (plY.chargesSociales / plY.salaires) * 100) : 142} € pour 100 € de brut (cumul exercice).` },
              ].map((x) => (
                <div key={x.t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ minWidth: 8, height: 8, borderRadius: "50%", background: VIZ.personnel, marginTop: 6 }} />
                  <div><div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{x.t}</div><div style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5 }}>{x.d}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {top.length > 0 && (
        <Card>
          <CarteTitre title={cfg.tiers === "c" ? "Top clients · cumul exercice" : "Top fournisseurs · cumul exercice"} sub={cfg.tiers === "c" ? "Risque de dépendance au-delà de 30 % du CA sur un seul client." : "Montants HT facturés depuis l'ouverture de l'exercice."} />
          <div style={{ padding: "10px 22px 18px" }}>
            {top.slice(0, 10).map((x) => {
              const part = cfg.tiers === "c" ? (sY.ca > 0 ? (x.v / sY.ca) * 100 : 0) : (x.v / (top.reduce((s, y) => s + y.v, 0) || 1)) * 100;
              return (
                <div key={x.n} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 56px", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.borderLight}`, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.l}</span>
                  <span style={{ ...num, fontSize: 13, fontWeight: 900 }}>{eur(x.v)}</span>
                  <span style={{ ...num, fontSize: 12.5, fontWeight: 700, color: cfg.tiers === "c" && part > 30 ? C.orange : C.textMid }}>{pctFr(part)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </Page>
  );
}
function TableProduits({ produits, total, mois }) {
  const duMois = new Map((mois || []).map((x) => [x.l, x]));
  const cumul = []; let c = 0;
  for (const x of produits) { c += x.ca; cumul.push(c); }
  const n80 = cumul.findIndex((v) => v >= total * 0.8) + 1;
  return (
    <div style={{ padding: "8px 0 14px" }}>
      {produits.length >= 5 && n80 > 0 && <div style={{ margin: "4px 22px 10px", fontSize: 12.5, fontWeight: 700, color: C.textMid, background: C.bgLight, borderRadius: 10, padding: "8px 12px" }}>Pareto : {n80} produit{n80 > 1 ? "s" : ""} sur {produits.length} = 80 % du CA</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead><tr><Th>Produit</Th><Th right>Mois</Th><Th right>Cumul</Th><Th right>% CA</Th></tr></thead>
          <tbody>
            {produits.slice(0, 12).map((x) => (
              <tr key={x.l} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}{x.qte ? <span style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}> · {Math.round(x.qte)} vendus</span> : null}</td>
                <td style={{ ...num, padding: "8px 12px", fontSize: 12.5, color: C.textMid }}>{duMois.has(x.l) ? eur(duMois.get(x.l).ca) : "—"}</td>
                <td style={{ ...num, padding: "8px 12px", fontSize: 13, fontWeight: 900 }}>{eur(x.ca)}</td>
                <td style={{ ...num, padding: "8px 12px", fontSize: 12.5, color: C.textMid }}>{pctFr(total > 0 ? (x.ca / total) * 100 : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Legendes() {
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12, fontWeight: 700, color: C.textMid }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: VIZ.serie }} />N</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: VIZ.serieN1 }} />N-1</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TVA
// ══════════════════════════════════════════════════════════════════════
export function TvaFec({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
  const { idx, key, covered, source, fin } = contexte(client, moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title="TVA" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const keys = idx.keys.filter((k) => k <= key).slice(-12);
  const rows = keys.map((k) => ({ k, ...P.tvaOfMonth(idx, k) }));
  const m = rows[rows.length - 1];
  // Avec la comptabilité : solde réel des comptes de TVA ; sinon, la TVA du mois (versée le mois suivant).
  let due = m.net;
  if (source === "fec") {
    const b = P.bilanAt(client, key);
    const somme = (list) => list.filter((a) => a.c.startsWith("445")).reduce((t, a) => t + a.v, 0);
    due = somme(b.detail.fiscalSocial) - somme(b.detail.autresCreances);
  }
  return (
    <Page>
      <EnTete title="TVA" sub="TVA collectée − TVA déductible = TVA à décaisser, versée à la déclaration suivante." nav={nav} source={source} fin={fin} />
      <div style={grid(200)}>
        <Chiffre label={due >= 0 ? "TVA à décaisser" : "Crédit de TVA"} value={eur(Math.abs(due))} sub={source === "fec" ? `Au ${fmtDate(P.monthEnd(key))}` : `Déclaration de ${P.keyLabel(P.shiftKey(key, 1))}`} aide={due >= 0 ? "Solde des comptes de TVA dû à la prochaine déclaration (CA3)." : "Crédit imputable sur les prochaines déclarations ou remboursable."} />
        <Chiffre label="TVA collectée" value={eur(m.collectee)} sub={P.keyLabel(key)} />
        <Chiffre label="TVA déductible" value={eur(m.deductible)} sub={P.keyLabel(key)} />
        {source === "fec" && <Chiffre label="TVA décaissée" value={eur(m.payee)} sub={P.keyLabel(key)} />}
      </div>
      <Card>
        <CarteTitre title="Historique 12 mois" />
        <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><Th>Mois</Th><Th right>Collectée</Th><Th right>Déductible</Th><Th right>Solde du mois</Th>{source === "fec" && <Th right>Décaissée</Th>}</tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.k} style={{ borderTop: `1px solid ${C.borderLight}`, background: x.k === key ? C.bg : "white" }}>
                  <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 800, color: C.text, textTransform: "capitalize" }}>{P.keyLabel(x.k)}</td>
                  <td style={{ ...num, padding: "8px 12px", fontSize: 13 }}>{eur(x.collectee)}</td>
                  <td style={{ ...num, padding: "8px 12px", fontSize: 13 }}>{eur(x.deductible)}</td>
                  <td style={{ ...num, padding: "8px 12px", fontSize: 13, fontWeight: 900, color: x.net < 0 ? C.green : C.text }}>{eur(x.net)}</td>
                  {source === "fec" && <td style={{ ...num, padding: "8px 12px", fontSize: 13, color: C.textMid }}>{eur(x.payee)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// IMPÔT SUR LES SOCIÉTÉS (estimation)
// ══════════════════════════════════════════════════════════════════════
export function ImpotFec({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
  const { idx, key, covered, source, fin } = contexte(client, moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!covered) return <HorsPeriode title="Impôt sur les sociétés" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const tauxReduit = (client.is?.taux ?? 15) !== 25;
  const ytd = P.ytdKeys(idx, key);
  const exFin = P.shiftKey(ytd[0], 11);
  const rest = []; for (let k = P.shiftKey(key, 1); k <= exFin; k = P.shiftKey(k, 1)) rest.push(k);
  const sY = P.sigOf(P.plOver(idx, ytd));
  const isDejaCompta = P.plOver(idx, ytd).is;
  const avantIS = sY.rcai + sY.resExc - P.plOver(idx, ytd).participation;
  const restN1 = rest.map((k) => P.shiftKey(k, -12));
  const saison = restN1.length > 0 && restN1.every((k) => idx.months.has(k));
  const projRest = !rest.length ? 0 : saison ? (() => { const s = P.sigOf(P.plOver(idx, restN1)); return s.rcai + s.resExc; })() : (avantIS / ytd.length) * rest.length;
  const projection = avantIS + projRest;
  const isEstime = P.estimateIS(projection, tauxReduit);
  const fullPrec = Array.from({ length: 12 }, (_, i) => P.shiftKey(ytd[0], i - 12));
  // Impôt de l'exercice précédent : comptabilisé (FEC) ou renseigné par le conseiller sur la fiche.
  const isCompta = fullPrec.every((k) => idx.months.has(k)) ? P.plOver(idx, fullPrec).is : 0;
  const isN1 = isCompta > 0 ? isCompta : client.is?.totalPrecedent > 0 ? client.is.totalPrecedent : null;
  const acomptes = isN1 != null && isN1 > 3000 ? [3, 6, 9, 12].map((n) => ({ k: P.shiftKey(ytd[0], n - 1), v: isN1 / 4 })) : [];
  return (
    <Page>
      <EnTete title="Impôt sur les sociétés" sub="Estimation de gestion : le montant définitif est déterminé à la clôture par l'expert-comptable, après réintégrations et déductions fiscales." nav={nav} source={source} fin={fin} />
      <div style={grid(210)}>
        <Chiffre label="Résultat avant IS · cumul" value={eur(avantIS)} sub={`${P.keyLabel(ytd[0], false)} → ${P.keyLabel(key, false)}`} />
        <Chiffre label="Atterrissage" value={eur(projection)} sub={rest.length ? `${rest.length} mois projetés (${saison ? "base N-1" : "tendance"})` : "Exercice complet"} aide="Résultat avant IS projeté à la clôture : réalisé + mois restants d'après N-1 (ou la tendance)." />
        <Chiffre label="IS estimé" value={eur(isEstime)} sub={projection > 0 ? `Taux effectif ${pctFr((isEstime / projection) * 100, 1)}` : "Pas de bénéfice imposable"} aide={tauxReduit ? "Taux réduit PME 15 % jusqu'à 42 500 €, puis 25 %." : "Taux normal 25 %."} />
        {isDejaCompta > 0 && <Chiffre label="IS comptabilisé" value={eur(isDejaCompta)} />}
      </div>
      {acomptes.length > 0 && (
        <Card>
          <CarteTitre title="Acomptes d'IS" detail={`Base : IS N-1 ${eur(isN1)}`} sub="Quatre acomptes de 25 % de l'IS N-1, le 15 des 3e, 6e, 9e et 12e mois de l'exercice. Solde à la liquidation." />
          <div style={{ padding: "10px 22px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {acomptes.map((a) => (
              <div key={a.k} style={{ background: a.k < key ? C.bg : C.bgLight, borderRadius: 12, padding: "10px 12px", opacity: a.k < key ? 0.7 : 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid }}>15 {P.keyLabel(a.k)}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{eur(a.v)}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textLight }}>{a.k <= key ? "Échéance passée" : "À venir"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {isN1 == null && source === "fec" && <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>Importez aussi le FEC de l'exercice précédent pour voir le calendrier des acomptes et une projection qui tient compte de la saisonnalité.</div>}
    </Page>
  );
}
