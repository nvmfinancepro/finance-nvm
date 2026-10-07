"use client";
// Vues détaillées de pilotage à partir de la comptabilité importée (FEC) :
// compte de résultat (soldes intermédiaires de gestion), bilan et BFR, trésorerie
// réelle, clients et fournisseurs, ventes / achats / charges / salaires, TVA, IS.
// Chaque chiffre est accompagné d'une explication en français courant.
import { useState } from "react";
import { C, Card, Btn } from "@/app/charte";
import * as P from "@/lib/pilotage";
import { VIZ, eur, pctFr, Colonnes, Courbe, Lignes, Repartition, Variation, PastilleStatut, STATUT } from "@/app/pilotage/graphiques";
import { NavMois, Titre } from "@/app/pilotage/synthese";
import { dataIndex, tiersPour, produitsSur, salariesSur } from "@/lib/donnees";

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
      {fec ? `Comptabilité${fin ? ` à jour au ${fmtDate(fin)}` : ""}` : "Estimations à partir de vos imports (relevé bancaire, fichiers)"}
    </span>
  );
}
export function EnTete({ title, sub, nav, right, source, fin }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: C.textMid, fontWeight: 600, marginTop: 3, lineHeight: 1.55, maxWidth: 760 }}>{sub}</div>}
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
export function CarteTitre({ title, sub, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "18px 22px 0", flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{title}</div>{sub && <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}</div>
      {right}
    </div>
  );
}
export function Chiffre({ label, value, sub, aide, statut, delta, subTon }) {
  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.text}`, borderRadius: 20, padding: "16px 18px", boxShadow: "0 16px 36px rgba(0,86,83,.06)", display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, color: C.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        {statut && <PastilleStatut statut={statut} size={20} />}
      </div>
      <div style={{ fontSize: 23, fontWeight: 900, color: C.text, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, fontWeight: 700, color: subTon && statut ? STATUT[statut].color : C.textMid }}>{sub}</div>}
      {delta}
      {aide && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, lineHeight: 1.45, marginTop: "auto", paddingTop: 3 }}>{aide}</div>}
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
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>Pas encore de chiffres pour {P.keyLabel(keyM)}</div>
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
  { id: "ca", label: "Chiffre d'affaires", f: (p, s) => s.ca, postes: ["ventesMarch", "prodVendue"], total: true, aide: "Ventes et prestations facturées, hors taxes." },
  { id: "prod", label: "Production stockée et immobilisée", f: (p) => p.prodStockee + p.prodImmo, postes: ["prodStockee", "prodImmo"] },
  { id: "conso", label: "Achats consommés", f: (p, s) => -s.consommations, postes: ["achatsMarch", "varStockMarch", "achatsMat", "varStockMat"], aide: "Marchandises et matières achetées, corrigées de la variation des stocks." },
  { id: "mb", label: "Marge brute", f: (p, s) => s.margeBrute, total: true, aide: "Ce qu'il reste une fois payés les achats nécessaires aux ventes." },
  { id: "ext", label: "Charges externes", f: (p) => -p.chargesExternes, postes: ["chargesExternes"], aide: "Loyer, sous-traitance, honoraires, publicité, énergie, assurances…" },
  { id: "va", label: "Valeur ajoutée", f: (p, s) => s.valeurAjoutee, total: true, aide: "La richesse créée par l'entreprise, avant de rémunérer les équipes." },
  { id: "subv", label: "Subventions d'exploitation", f: (p) => p.subventions, postes: ["subventions"] },
  { id: "imp", label: "Impôts et taxes", f: (p) => -p.impotsTaxes, postes: ["impotsTaxes"], aide: "CFE, taxe foncière, taxes sur les salaires (hors impôt sur les bénéfices)." },
  { id: "pers", label: "Salaires et charges sociales", f: (p, s) => -s.personnel, postes: ["salaires", "chargesSociales"] },
  { id: "ebe", label: "Excédent brut d'exploitation (EBE)", f: (p, s) => s.ebe, total: true, aide: "Ce que l'activité dégage avant amortissements, frais financiers et impôt : l'indicateur clé de rentabilité." },
  { id: "dot", label: "Amortissements et provisions", f: (p) => -p.dotations + p.reprises, postes: ["dotations", "reprises"], aide: "L'usure des investissements, étalée sur leur durée de vie. Souvent comptabilisée en fin d'exercice." },
  { id: "gest", label: "Autres produits et charges de gestion", f: (p) => p.autresProduits - p.autresCharges, postes: ["autresProduits", "autresCharges"] },
  { id: "rex", label: "Résultat d'exploitation", f: (p, s) => s.rex, total: true, aide: "Ce que rapporte le métier lui-même, investissements compris." },
  { id: "fin", label: "Résultat financier", f: (p, s) => s.resFin, postes: ["prodFin", "chargesFin"], aide: "Intérêts d'emprunt et produits de placement." },
  { id: "exc", label: "Résultat exceptionnel", f: (p, s) => s.resExc, postes: ["prodExc", "chargesExc"], aide: "Opérations hors activité courante : cessions, pénalités, régularisations." },
  { id: "is", label: "Impôt sur les sociétés et participation", f: (p) => -(p.is + p.participation), postes: ["is", "participation"] },
  { id: "rn", label: "Résultat net", f: (p, s) => s.rn, total: true, aide: "Le bénéfice ou la perte comptable de la période." },
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
    { l: "Chiffre d'affaires", f: (x) => x.s.ca, bold: true },
    { l: "Marge brute", f: (x) => x.s.margeBrute },
    { l: "  taux de marge", f: (x) => (x.s.ca ? (x.s.margeBrute / x.s.ca) * 100 : null), pct: true },
    { l: "Charges externes", f: (x) => x.p.chargesExternes },
    { l: "Salaires et charges", f: (x) => x.s.personnel },
    { l: "EBE", f: (x) => x.s.ebe, bold: true, signe: true },
    { l: "  EBE / CA", f: (x) => (x.s.ca ? (x.s.ebe / x.s.ca) * 100 : null), pct: true },
    { l: "Résultat net", f: (x) => x.s.rn, bold: true, signe: true },
  ];
  return (
    <Page>
      <EnTete title="Compte de résultat" sub="Du chiffre d'affaires au résultat, étape par étape. Cliquez sur une ligne pour voir le détail." source={source} fin={fin}
        nav={nav} right={<ChoixPeriode value={periode} onChange={setPeriode} options={[["mois", "Le mois"], ["exercice", "Depuis le début de l'exercice"], ["12m", "12 derniers mois"]]} />} />
      <div style={grid(200)}>
        <Chiffre label="Chiffre d'affaires" value={eur(s.ca)} sub={libPeriode} delta={s1 && <Variation cur={s.ca} prev={s1.ca} label="sur un an" />} />
        <Chiffre label="Marge brute" value={pctFr(s.ca ? (s.margeBrute / s.ca) * 100 : null, 1)} sub={`${eur(s.margeBrute)} sur la période`} delta={s1 && s1.ca > 0 && s.ca > 0 && <Variation cur={(s.margeBrute / s.ca) * 100} prev={(s1.margeBrute / s1.ca) * 100} points label="sur un an" />} />
        <Chiffre label="EBE" value={eur(s.ebe)} sub={s.ca ? `${pctFr((s.ebe / s.ca) * 100, 1)} du chiffre d'affaires` : null} delta={s1 && <Variation cur={s.ebe} prev={s1.ebe} label="sur un an" />} />
        <Chiffre label="Résultat net" value={eur(s.rn)} sub={s.rn >= 0 ? "Bénéfice" : "Perte"} delta={s1 && <Variation cur={s.rn} prev={s1.rn} label="sur un an" />} />
        {pm && <Chiffre label="Point mort annuel" value={eur(pm.seuil)} statut={pm.marge >= 0.1 * pm.ca ? "ok" : pm.marge >= 0 ? "warn" : "bad"} subTon sub={pm.marge >= 0 ? `Dépassé de ${eur(pm.marge)} sur 12 mois` : `Il manque ${eur(-pm.marge)} de CA sur 12 mois`} aide="Le chiffre d'affaires annuel à partir duquel l'entreprise ne perd plus d'argent." />}
      </div>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>{libPeriode}</Th><Th right>Montant</Th><Th right>% du CA</Th>{hasN1 && <Th right>Un an plus tôt</Th>}{hasN1 && <Th right>Évolution</Th>}</tr></thead>
            <tbody>
              {lignes.map((l) => {
                const v = l.f(pl, s), v1 = s1 ? l.f(pl1, s1) : null;
                const open = !!ouvert[l.id];
                return [
                  <tr key={l.id} onClick={() => l.postes && setOuvert((o) => ({ ...o, [l.id]: !o[l.id] }))}
                    style={{ borderTop: `1px solid ${C.borderLight}`, background: l.total ? C.bgLight : "white", cursor: l.postes ? "pointer" : "default" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: l.total ? 14 : 13, fontWeight: l.total ? 900 : 700, color: C.text }}>{l.postes && <span style={{ display: "inline-block", width: 14, color: C.textLight }}>{open ? "▾" : "▸"}</span>}{l.label}</div>
                      {l.aide && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, marginLeft: l.postes ? 14 : 0 }}>{l.aide}</div>}
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
        <CarteTitre title="Mois par mois sur l'exercice" sub="Pour repérer d'un coup d'œil les mois forts, les mois faibles et les dérives." />
        <div style={{ overflowX: "auto", padding: "12px 0 6px" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
            <thead><tr><Th>&nbsp;</Th>{moisEx.map((x) => <Th key={x.k} right>{P.keyLabel(x.k, false).replace(/ \d+$/, "")}</Th>)}<Th right>Exercice</Th></tr></thead>
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
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{detail?.length ? <span style={{ color: C.textLight, display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span> : null}{label}</div>
          {aide && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, marginLeft: detail?.length ? 14 : 0 }}>{aide}</div>}
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
    { label: "Délai de paiement clients", v: r.dso, f: (v) => `${Math.round(v)} jours`, statut: statutDe(r.dso, 45, 75, false), aide: "Le temps moyen entre la facture et l'encaissement. Chaque jour gagné, c'est de la trésorerie en plus." },
    { label: "Délai de paiement fournisseurs", v: r.dpo, f: (v) => `${Math.round(v)} jours`, statut: r.dpo == null ? "na" : r.dpo > 60 ? "warn" : "ok", aide: "Le temps moyen pour régler vos fournisseurs (60 jours maximum par la loi, en général)." },
    { label: "Rotation des stocks", v: r.dio, f: (v) => `${Math.round(v)} jours`, statut: r.dio == null ? "na" : r.dio > 120 ? "warn" : "ok", aide: "Le nombre de jours d'achats immobilisés en stock." },
    { label: "Autonomie financière", v: r.autonomieFinanciere, f: (v) => pctFr(v * 100), statut: statutDe(r.autonomieFinanciere, 0.3, 0.15), aide: "La part du bilan financée par les fonds propres. Au-dessus de 30 %, les banques sont rassurées." },
    { label: "Endettement net", v: r.endettement, f: (v) => `${v.toFixed(2).replace(".", ",")} × les fonds propres`, statut: r.endettement == null ? (b.capitauxPropres <= 0 ? "bad" : "na") : statutDe(r.endettement, 1, 2, false), aide: "Dettes bancaires moins trésorerie, rapportées aux fonds propres. Au-delà de 1, la marge de manœuvre se réduit." },
    { label: "Capacité de remboursement", v: r.capaciteRemboursement, f: (v) => `${v.toFixed(1).replace(".", ",")} ans`, statut: r.capaciteRemboursement == null ? "na" : statutDe(r.capaciteRemboursement, 3, 5, false), aide: "Le nombre d'années d'autofinancement pour rembourser les emprunts. Les banques regardent le seuil de 3 à 4 ans." },
    { label: "Point mort annuel", v: r.pointMort, f: (v) => eur(v), statut: r.margeSecurite == null ? "na" : r.margeSecurite > 0.1 * r.caAnnuel ? "ok" : r.margeSecurite > 0 ? "warn" : "bad", sub: r.margeSecurite != null ? `${r.margeSecurite >= 0 ? "Marge de sécurité" : "Il manque"} : ${eur(Math.abs(r.margeSecurite))}` : null, aide: "Le chiffre d'affaires annuel à partir duquel l'entreprise ne perd plus d'argent." },
    { label: "Besoin en fonds de roulement", v: r.bfrJoursCA, f: (v) => `${Math.round(v)} jours de CA`, statut: "na", aide: "L'argent immobilisé par l'activité, exprimé en jours de chiffre d'affaires." },
  ];
  return (
    <Page>
      <EnTete title="Bilan et fonds de roulement" sub={`Situation au ${fmtDate(P.monthEnd(b.key))} reconstituée à partir de la comptabilité (bilan de gestion, non certifié). Cliquez sur une ligne pour voir les comptes.`} nav={nav} />
      <Card style={{ padding: "18px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 4 }}>La trésorerie s'explique en une ligne</div>
        <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 600, marginBottom: 14 }}>Les ressources stables de l'entreprise (fonds de roulement) financent l'argent immobilisé par l'activité (besoin en fonds de roulement). Ce qui reste, c'est la trésorerie.</div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
          {[
            { l: "Fonds de roulement", v: b.fr, a: "Capitaux, emprunts et comptes courants, moins les immobilisations" },
            { op: "−" },
            { l: "Besoin en fonds de roulement", v: b.bfr, a: "Stocks et clients, moins fournisseurs et dettes fiscales et sociales" },
            { op: "=" },
            { l: "Trésorerie nette", v: b.tresoNette, a: "Banques et caisse, moins les découverts", accent: true },
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
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Ce que possède l'entreprise</div>
          <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>Actif · total {eur(b.actif)}</div>
          <LigneBilan label="Immobilisations (valeur nette)" v={b.immoNet} total={b.actif} detail={d.immoNet} aide={`Valeur d'achat ${eur(b.immoBrut)}, déjà amortie de ${eur(b.amortImmo)}`} />
          <LigneBilan label="Stocks" v={b.stocks} total={b.actif} detail={d.stocks} />
          <LigneBilan label="Créances clients" v={b.clients} total={b.actif} detail={d.clients} aide="Factures émises, pas encore payées" />
          <LigneBilan label="Autres créances" v={b.autresCreances} total={b.actif} detail={d.autresCreances} aide="TVA à récupérer, avances versées…" />
          <LigneBilan label="Charges payées d'avance" v={b.cca} total={b.actif} detail={d.cca} />
          <LigneBilan label="Disponibilités" v={b.dispo} total={b.actif} detail={d.dispo} aide="Banques et caisse" />
        </Card>
        <Card style={{ padding: "16px 22px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Comment c'est financé</div>
          <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>Passif · total {eur(b.passif)}</div>
          <LigneBilan label="Fonds propres" v={b.capitauxPropres} total={b.passif} detail={[...d.capitaux, ...d.resultat]} aide={`Dont résultat de l'exercice en cours : ${eur(b.resultat)}`} />
          <LigneBilan label="Provisions" v={b.provisions} total={b.passif} detail={d.provisions} />
          <LigneBilan label="Emprunts bancaires" v={b.dettesFin} total={b.passif} detail={d.dettesFin} />
          <LigneBilan label="Comptes courants d'associés" v={b.associes} total={b.passif} detail={d.associes} aide="Argent prêté à l'entreprise par les associés" />
          <LigneBilan label="Découverts bancaires" v={b.concours} total={b.passif} detail={d.concours} />
          <LigneBilan label="Dettes fournisseurs" v={b.fournisseurs} total={b.passif} detail={d.fournisseurs} />
          <LigneBilan label="Dettes fiscales et sociales" v={b.fiscalSocial} total={b.passif} detail={d.fiscalSocial} aide="TVA, URSSAF, salaires, impôts à payer" />
          <LigneBilan label="Autres dettes" v={b.autresDettes + b.pca} total={b.passif} detail={[...d.autresDettes, ...d.pca]} />
        </Card>
      </div>
      {Math.abs(b.ecart) >= 1 && <div style={{ fontSize: 12, color: C.orange, fontWeight: 700 }}>Écart actif / passif de {eur(b.ecart)} : la comptabilité importée contient probablement des écritures déséquilibrées ou une reprise d'à-nouveaux incomplète.</div>}
      <div>
        <Titre>Les ratios que regardent les banques et les investisseurs</Titre>
        <div style={grid(230)}>
          {ratios.map((x) => <Chiffre key={x.label} label={x.label} value={x.v == null ? "—" : x.f(x.v)} statut={x.statut === "na" ? null : x.statut} subTon sub={x.sub || (x.statut !== "na" ? STATUT[x.statut].mot : null)} aide={x.aide} />)}
        </div>
        <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, marginTop: 8 }}>Calculés sur les {r.mois} derniers mois{r.mois < 12 ? " (ramenés à l'année)" : ""}. Délais exprimés toutes taxes comprises.</div>
      </div>
      {hist.length > 1 && (
        <Card>
          <CarteTitre title="Besoin en fonds de roulement et trésorerie" sub="Quand le besoin monte (clients qui paient plus tard, stock qui gonfle), la trésorerie baisse d'autant." />
          <div style={{ padding: "12px 18px 16px" }}>
            <Lignes labels={last12.map((k) => P.keyLabel(k, false).replace(/ \d+$/, ""))} keys={last12.map((k) => P.keyLabel(k))}
              series={[{ label: "Besoin en fonds de roulement", color: VIZ.externes, values: hist.map((h) => h.bfr) }, { label: "Trésorerie nette", color: VIZ.serie, values: hist.map((h) => h.tresoNette) }, { label: "Fonds de roulement", color: VIZ.achats, values: hist.map((h) => h.fr) }]} />
          </div>
        </Card>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TRÉSORERIE RÉELLE
// ══════════════════════════════════════════════════════════════════════
export function TresorerieFec({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
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
  const cli = P.tiersAt(client, key, "C");
  // Ce qui va sortir prochainement : dettes à court terme connues
  const somme = (list, pref) => list.filter((a) => pref.some((p) => a.c.startsWith(p))).reduce((t, a) => t + a.v, 0);
  const tva = somme(fin.detail.fiscalSocial, ["445"]) - somme(fin.detail.autresCreances, ["445"]);
  const social = somme(fin.detail.fiscalSocial, ["43"]);
  const salaires = somme(fin.detail.fiscalSocial, ["42"]);
  const is = somme(fin.detail.fiscalSocial, ["444"]);
  const autresFisc = fin.fiscalSocial - somme(fin.detail.fiscalSocial, ["445", "43", "42", "444"]);
  const sorties = [
    { l: "Fournisseurs", v: fin.fournisseurs, a: "Factures reçues, pas encore payées" },
    { l: "TVA", v: Math.max(0, tva), a: "À reverser à la prochaine déclaration" },
    { l: "URSSAF et caisses sociales", v: social, a: "Cotisations du mois, prélevées le mois suivant" },
    { l: "Salaires", v: salaires, a: "Rémunérations restant à verser" },
    { l: "Impôt sur les sociétés", v: is, a: "Solde ou acompte à payer" },
    { l: "Autres impôts et taxes", v: autresFisc, a: "" },
  ].filter((x) => x.v >= 1);
  const totalSorties = sorties.reduce((t, x) => t + x.v, 0);
  const entrees = cli ? cli.total : 0;
  return (
    <Page>
      <EnTete title="Trésorerie" sub="L'argent réellement disponible, d'après vos comptes bancaires en comptabilité, et ce qui l'a fait bouger." nav={nav} />
      <div style={grid(200)}>
        <Chiffre label="Trésorerie nette" value={eur(fin.tresoNette)} sub={`Au ${fmtDate(P.monthEnd(key))}`} statut={fin.tresoNette < 0 ? "bad" : r.autonomieTreso >= 1.5 ? "ok" : r.autonomieTreso >= 0.7 ? "warn" : "bad"} aide="Banques et caisse, moins les découverts." />
        <Chiffre label="Sur le mois" value={idx.months.has(prevKey) ? `${fin.tresoNette - P.bilanAt(client, prevKey).tresoNette >= 0 ? "+" : "−"}${eur(Math.abs(fin.tresoNette - P.bilanAt(client, prevKey).tresoNette))}` : "—"} aide="Variation depuis la fin du mois précédent." />
        <Chiffre label="Mois de dépenses couverts" value={r.autonomieTreso == null ? "—" : r.autonomieTreso.toFixed(1).replace(".", ",")} sub={r.depensesMois ? `Dépenses courantes : ${eur(r.depensesMois)} par mois` : null} aide="Combien de mois l'entreprise tiendrait avec sa trésorerie actuelle, sans aucune rentrée." />
        <Chiffre label="Besoin en fonds de roulement" value={eur(fin.bfr)} sub={r.bfrJoursCA != null ? `${Math.round(r.bfrJoursCA)} jours de chiffre d'affaires` : null} aide="L'argent avancé par l'entreprise le temps que ses clients paient." />
      </div>
      <div style={grid(440)}>
        <Card>
          <CarteTitre title="Pourquoi votre trésorerie a bougé" sub={flux ? `De ${eur(flux.debut)} à ${eur(flux.fin)} : ${flux.variation >= 0 ? "+" : "−"}${eur(Math.abs(flux.variation))}.` : "Le point de départ n'est pas disponible."}
            right={<ChoixPeriode value={periode} onChange={setPeriode} options={[["mois", "Le mois"], ["exercice", "L'exercice"]]} />} />
          <div style={{ padding: "12px 22px 18px" }}>
            {flux ? flux.lignes.filter((l) => Math.abs(l.v) >= 1 || l.id === "rn").map((l) => (
              <div key={l.id} style={{ borderTop: `1px solid ${C.borderLight}`, padding: "9px 0" }}>
                <div onClick={() => l.detail && setOuvert(!ouvert)} style={{ display: "flex", justifyContent: "space-between", gap: 10, cursor: l.detail ? "pointer" : "default" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{l.detail && <span style={{ color: C.textLight, display: "inline-block", width: 14 }}>{ouvert ? "▾" : "▸"}</span>}{l.label}</div>
                    {l.aide && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600, marginLeft: l.detail ? 14 : 0 }}>{l.aide}</div>}
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
          <CarteTitre title="Ce qui doit rentrer et sortir" sub={`D'après la comptabilité au ${fmtDate(P.monthEnd(key))}. Les échéances d'emprunt et les charges du mois suivant s'y ajoutent.`} />
          <div style={{ padding: "12px 22px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13.5, fontWeight: 900, color: C.text }}><span>À encaisser auprès des clients</span><span style={{ ...num, color: C.green }}>+{eur(entrees)}</span></div>
            {cli && entrees > 0 && <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 8 }}>dont {eur(cli.buckets[0].v)} facturés il y a moins de 30 jours</div>}
            <div style={{ fontSize: 13.5, fontWeight: 900, color: C.text, padding: "8px 0 2px", borderTop: `1px solid ${C.borderLight}` }}>À payer</div>
            {sorties.map((x) => (
              <div key={x.l} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0" }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}</div>{x.a && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{x.a}</div>}</div>
                <span style={{ ...num, fontSize: 13, fontWeight: 800, color: C.red }}>−{eur(x.v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.text}`, paddingTop: 10, marginTop: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 900, color: C.text }}>Trésorerie + encaissements − paiements</span>
              <span style={{ ...num, fontSize: 15, fontWeight: 900, color: fin.tresoNette + entrees - totalSorties < 0 ? C.red : C.text }}>{eur(fin.tresoNette + entrees - totalSorties)}</span>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <CarteTitre title="Trésorerie en fin de mois" sub="Solde réel des comptes bancaires et de la caisse, découverts déduits." />
        <div style={{ padding: "12px 18px 16px" }}>
          <Courbe data={histKeys.map((k) => ({ key: k, l: P.keyLabel(k, false).replace(/ \d+$/, ""), v: P.bilanAt(client, k).tresoNette, current: k === key }))} height={210} tip={(x) => [P.keyLabel(x.key), `Trésorerie : ${eur(x.v)}`]} />
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
      <EnTete title={title} sub={`${isC ? "Ce que vos clients vous doivent" : "Ce que vous devez à vos fournisseurs"} au ${fmtDate(t.date)}, facture par facture.${fec ? " Les règlements sont imputés sur les factures les plus anciennes." : ""}`} nav={nav} source={t.source} fin={fec ? t.date : null} />
      <div style={grid(200)}>
        <Chiffre label={isC ? "À encaisser" : "À payer"} value={eur(t.total)} sub={`${t.list.length} ${isC ? "client" : "fournisseur"}${t.list.length > 1 ? "s" : ""}`} />
        {fec ? <Chiffre label={isC ? "Délai moyen d'encaissement" : "Délai moyen de paiement"} value={delai == null ? "—" : `${Math.round(delai)} jours`} statut={isC ? statutDe(delai, 45, 75, false) : null} sub={isC ? null : "60 jours maximum en règle générale"} aide={isC ? "Entre la facture et l'encaissement, sur les 12 derniers mois." : "Entre la facture fournisseur et son règlement."} />
          : <Chiffre label="Retard moyen" value={retardMoyen == null ? "—" : `${Math.round(retardMoyen)} jours`} statut={isC && retardMoyen != null ? statutDe(retardMoyen, 15, 45, false) : null} aide="Au-delà de l'échéance, d'après le fichier importé." />}
        <Chiffre label="Factures de plus de 60 jours" value={eur(vieux)} statut={isC ? (vieux > 0.3 * t.total ? "bad" : vieux > 0.15 * t.total ? "warn" : "ok") : null} sub={t.total ? `${pctFr((vieux / t.total) * 100)} du total` : null} aide={isC ? "Les plus difficiles à encaisser : à relancer en priorité." : "Un retard prolongé peut tendre la relation fournisseur."} />
      </div>
      <Card style={{ padding: "16px 22px 18px" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 10 }}>Âge des factures non réglées</div>
        <Repartition segments={t.buckets.map((b, i) => ({ id: b.id, label: b.label, v: b.v, color: VIZ.age[i] }))} />
      </Card>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><Th>{isC ? "Client" : "Fournisseur"}</Th><Th right>Solde dû</Th><Th right>Plus de 60 jours</Th><Th right>Plus ancienne facture</Th>{isC && <Th right>Relance</Th>}</tr></thead>
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
          <CarteTitre title={isC ? "Vos meilleurs clients sur l'exercice" : "Vos principaux fournisseurs sur l'exercice"} sub={isC ? "Chiffre d'affaires HT facturé depuis le début de l'exercice : attention si un seul client pèse plus de 30 %." : "Achats et charges HT facturés depuis le début de l'exercice."} />
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
  ventes: { title: "Ventes", sub: "Votre chiffre d'affaires par nature de vente, comparé à l'an dernier.", postes: ["ventesMarch", "prodVendue", "prodStockee", "prodImmo"], tiers: "c", produit: true },
  achats: { title: "Achats et marge", sub: "Ce que coûtent les achats nécessaires à vos ventes, et la marge qu'il vous reste.", postes: ["achatsMarch", "varStockMarch", "achatsMat", "varStockMat"], tiers: "f" },
  charges: { title: "Charges", sub: "Tous vos frais de fonctionnement, regroupés par nature et comparés à l'an dernier. Une forte hausse est signalée en orange.", postes: ["chargesExternes", "impotsTaxes", "autresCharges"], regroupe: true, tiers: "f" },
  salaires: { title: "Masse salariale", sub: "Salaires et cotisations sociales, tels qu'enregistrés en comptabilité.", postes: ["salaires", "chargesSociales"] },
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
        <Chiffre label={P.keyLabel(key)} value={eur(tM)} delta={tM1 != null && <Variation cur={tM} prev={tM1} goodUp={!!cfg.produit} label={`vs ${P.keyLabel(key1, false)}`} />} />
        <Chiffre label="Depuis le début de l'exercice" value={eur(tY)} sub={exLib} delta={tY1 != null && <Variation cur={tY} prev={tY1} goodUp={!!cfg.produit} label="sur un an" />} />
        {!cfg.produit && <Chiffre label="Poids dans le chiffre d'affaires" value={sY.ca > 0 ? pctFr((tY / sY.ca) * 100, 1) : "—"} sub="Sur l'exercice" delta={sY1 && sY1.ca > 0 && sY.ca > 0 && <Variation cur={(tY / sY.ca) * 100} prev={(tY1 / sY1.ca) * 100} points goodUp={false} label="sur un an" />} aide={`Pour 100 € vendus, ${sY.ca > 0 ? eur((tY / sY.ca) * 100) : "—"} partent ${vue === "salaires" ? "dans les salaires" : vue === "achats" ? "dans les achats" : "en charges"}.`} />}
        {vue === "achats" && <Chiffre label="Taux de marge brute" value={pctFr(tauxMarge(sY), 1)} sub="Sur l'exercice" delta={sY1 && <Variation cur={tauxMarge(sY)} prev={tauxMarge(sY1)} points label="sur un an" />} aide={`Ce mois-ci : ${pctFr(tauxMarge(sM), 1)}${sM1 ? ` (${pctFr(tauxMarge(sM1), 1)} un an plus tôt)` : ""}.`} />}
        {vue === "salaires" && <Chiffre label="Charges sociales / salaires" value={plY.salaires > 0 ? pctFr((plY.chargesSociales / plY.salaires) * 100) : "—"} sub="Sur l'exercice" aide="Pour 100 € de salaire brut, ce que l'entreprise verse en plus en cotisations." />}
        {vue === "ventes" && <Chiffre label="Moyenne mensuelle" value={eur(tY / ytd.length)} sub={`Sur ${ytd.length} mois`} />}
      </div>
      <Card>
        <CarteTitre title={`${cfg.title}, 12 derniers mois`} sub="Chaque mois comparé au même mois de l'année précédente." />
        <div style={{ padding: "10px 22px 0" }}><Legendes /></div>
        <div style={{ padding: "8px 18px 14px" }}><Colonnes data={series} n1 tip={(x) => [P.keyLabel(x.key), `${eur(x.v)}`, `Un an plus tôt : ${eur(x.n1)}`]} /></div>
      </Card>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr><Th>{cfg.regroupe ? "Nature" : source === "fec" ? "Compte" : "Poste"}</Th><Th right>{P.keyLabel(key, false)}</Th>{plM1 && <Th right>{P.keyLabel(key1, false)}</Th>}<Th right>Exercice</Th>{hasN1 && <Th right>Un an plus tôt</Th>}{hasN1 && <Th right>Évolution</Th>}<Th right>% du CA</Th></tr></thead>
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
            <CarteTitre title="Par produit ou prestation" sub={`Ce qui fait votre chiffre d'affaires sur l'exercice (${exLib}).`} />
            <TableProduits produits={prodY.produits} total={prodY.produits.reduce((t, x) => t + x.ca, 0)} mois={prodM.produits} />
          </Card>
          {prodY.canaux.length > 1 && (
            <Card>
              <CarteTitre title="Par canal de vente" sub="D'où vient votre chiffre d'affaires sur l'exercice." />
              <div style={{ padding: "14px 22px 20px" }}>
                <Repartition segments={prodY.canaux.slice(0, 5).map((c2, i) => ({ id: c2.l, label: c2.l, v: c2.v, color: [VIZ.serie, VIZ.externes, VIZ.achats, VIZ.personnel, VIZ.autres][i] }))} />
              </div>
            </Card>
          )}
        </div>
      )}
      {vue === "achats" && prodY.produits.some((x) => x.ca !== x.marge) && (
        <Card>
          <CarteTitre title="Marge par produit ou prestation" sub="Les produits qui rapportent le plus, et ceux dont la marge est trop faible (en orange sous 25 %)." />
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
              <CarteTitre title={`Par salarié · ${P.keyLabel(key)}`} sub="D'après les bulletins de paie importés." />
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
            <CarteTitre title="Quand l'argent sort de la banque" sub="Le coût d'un salaire ne sort pas en une fois." />
            <div style={{ padding: "12px 22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { t: "Fin du mois", d: "Le salaire net est versé au salarié." },
                { t: "Le 5 ou le 15 du mois suivant", d: "Les cotisations salariales et patronales sont prélevées par l'URSSAF (déclaration sociale nominative)." },
                { t: "Au total", d: `Pour 100 € de salaire brut, l'entreprise débourse environ ${plY.salaires > 0 ? Math.round(100 + (plY.chargesSociales / plY.salaires) * 100) : 142} € sur l'exercice.` },
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
          <CarteTitre title={cfg.tiers === "c" ? "Par client, sur l'exercice" : "Par fournisseur, sur l'exercice"} sub={cfg.tiers === "c" ? "Quand un client dépasse 30 % du chiffre d'affaires, sa perte mettrait l'entreprise en difficulté." : "Ce que vous avez dépensé chez chaque fournisseur depuis le début de l'exercice (HT)."} />
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
      {produits.length >= 5 && n80 > 0 && <div style={{ margin: "4px 22px 10px", fontSize: 12.5, fontWeight: 700, color: C.textMid, background: C.bgLight, borderRadius: 10, padding: "8px 12px" }}>{n80} produit{n80 > 1 ? "s" : ""} sur {produits.length} font 80 % de votre chiffre d'affaires.</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead><tr><Th>Produit</Th><Th right>Ce mois</Th><Th right>Exercice</Th><Th right>Part</Th></tr></thead>
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: VIZ.serie }} />Cette année</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: VIZ.serieN1 }} />Un an plus tôt</span>
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
      <EnTete title="TVA" sub="La TVA encaissée sur vos ventes ne vous appartient pas : elle est reversée à l'État, moins celle payée sur vos achats." nav={nav} source={source} fin={fin} />
      <div style={grid(200)}>
        <Chiffre label={due >= 0 ? "TVA à reverser" : "Crédit de TVA"} value={eur(Math.abs(due))} sub={source === "fec" ? `Au ${fmtDate(P.monthEnd(key))}` : `À la déclaration de ${P.keyLabel(P.shiftKey(key, 1))}`} aide={due >= 0 ? "Somme due à l'État à la prochaine déclaration : à garder de côté." : "L'État vous doit cette somme (remboursement ou imputation)."} />
        <Chiffre label="TVA collectée du mois" value={eur(m.collectee)} aide="Facturée à vos clients sur vos ventes." />
        <Chiffre label="TVA déductible du mois" value={eur(m.deductible)} aide="Payée à vos fournisseurs, récupérable." />
        {source === "fec" && <Chiffre label="TVA payée dans le mois" value={eur(m.payee)} aide="Versée à l'État au titre de la déclaration précédente." />}
      </div>
      <Card>
        <CarteTitre title="Mois par mois" sub="Collectée moins déductible = ce qui est dû pour le mois (versé le mois suivant)." />
        <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><Th>Mois</Th><Th right>Collectée</Th><Th right>Déductible</Th><Th right>Due pour le mois</Th>{source === "fec" && <Th right>Payée dans le mois</Th>}</tr></thead>
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
      <EnTete title="Impôt sur les sociétés" sub="Une estimation pour anticiper : le montant définitif est calculé par votre expert-comptable à la clôture, après retraitements fiscaux." nav={nav} source={source} fin={fin} />
      <div style={grid(210)}>
        <Chiffre label="Résultat avant impôt" value={eur(avantIS)} sub={`${P.keyLabel(ytd[0], false)} → ${P.keyLabel(key, false)}`} aide="Le bénéfice comptable de l'exercice à ce jour, avant impôt." />
        <Chiffre label="Projection sur l'exercice" value={eur(projection)} sub={rest.length ? (saison ? `${rest.length} mois restants estimés d'après l'an dernier` : `${rest.length} mois restants au rythme actuel`) : "Exercice complet"} aide="Si la fin d'exercice ressemble à l'an dernier (ou au rythme actuel)." />
        <Chiffre label="Impôt estimé" value={eur(isEstime)} sub={projection > 0 ? `Taux moyen ${pctFr((isEstime / projection) * 100, 1)}` : "Pas de bénéfice imposable estimé"} aide={tauxReduit ? "15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà (taux réduit PME)." : "25 % du bénéfice."} />
        {isDejaCompta > 0 && <Chiffre label="Déjà comptabilisé" value={eur(isDejaCompta)} aide="Impôt déjà enregistré en comptabilité sur l'exercice." />}
      </div>
      {acomptes.length > 0 && (
        <Card>
          <CarteTitre title="Acomptes à prévoir" sub={`Calculés sur l'impôt de l'exercice précédent (${eur(isN1)}) : un quart à chaque échéance, le 15 du mois. À confirmer avec ${client.advisorLabel || "votre conseiller"}.`} />
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
