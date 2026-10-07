// Prévisionnel sur 3 ans : compte de résultat, CAF et plan de financement annuels,
// à partir des 12 derniers mois et d'hypothèses par année, puis détail mois par mois
// (saisonnalité des 12 derniers mois). Stocké dans imports_csv (type "previsionnel3",
// mois "plan"), modifiable par le client et le conseiller.

import { ttmKeys, plOver, sigOf, estimateIS, fecIndex, bilanAt, shiftKey } from "./pilotage.js";
import { dataIndex } from "./donnees.js";
import { capitalRembourseMois } from "./estimations.js";

export const HYP_DEFAUT = { croissance: 5, tauxMarge: null, charges: 2, salaires: 2, embauches: 0, invest: 0, dureeAmort: 5, emprunt: 0, dureeEmprunt: 5, tauxEmprunt: 4, apports: 0, dividendes: 0 };

export function lirePrevisionnel3(client) {
  const imp = (client.imports || []).find((i) => i.type === "previsionnel3" && i.mois === "plan");
  const r = imp?.rows?.[0];
  return r ? { annees: [0, 1, 2].map((i) => ({ ...HYP_DEFAUT, ...(r.annees?.[i] || {}) })), bfrJours: r.bfrJours ?? null, majLe: r.majLe || "" } : null;
}
export const sauverPrevisionnel3 = (onSave, data) =>
  onSave({ type: "previsionnel3", label: "Prévisionnel 3 ans", mois: "plan", rows: [{ ...data, majLe: new Date().toLocaleDateString("fr-FR") }], count: 1, importedAt: new Date().toLocaleDateString("fr-FR") });

// Base : 12 derniers mois disponibles (annualisés si moins), trésorerie et BFR de départ.
export function baseAnnuelle(client, cle, tresoEstimee) {
  const idx = dataIndex(client);
  const fin = [...idx.keys].reverse().find((k) => k <= cle);
  if (!fin) return null;
  const keys = ttmKeys(idx, fin);
  const f = 12 / keys.length;
  const pl = plOver(idx, keys), s = sigOf(pl);
  const fec = fecIndex(client).months.has(fin);
  const bil = fec ? bilanAt(client, fin) : null;
  const ca = s.ca * f;
  // Saisonnalité : part de chaque mois calendaire dans le CA (mois absents = moyenne des présents).
  const caMois = new Map(keys.map((k) => [Number(k.slice(5)) - 1, Math.max(0, sigOf(plOver(idx, [k])).ca)]));
  const moyenne = [...caMois.values()].reduce((a, v) => a + v, 0) / Math.max(1, caMois.size);
  const brut = Array.from({ length: 12 }, (_, m) => (caMois.has(m) ? caMois.get(m) : moyenne));
  const total = brut.reduce((a, v) => a + v, 0);
  const profil = total > 0 ? brut.map((v) => v / total) : Array(12).fill(1 / 12);
  return {
    profil,
    fin, mois: keys.length, debut: keys[0],
    ca, marge: s.margeBrute * f, externes: pl.chargesExternes * f, impots: pl.impotsTaxes * f, personnel: s.personnel * f, subventions: pl.subventions * f,
    ebe: s.ebe * f, rcai: s.rcai * f,
    dotations: pl.dotations * f, financier: (pl.chargesFin - pl.prodFin) * f, autres: (pl.autresCharges - pl.autresProduits - pl.reprises) * f,
    tresorerie: fec ? bil.tresoNette : tresoEstimee ?? 0, tresoReelle: fec,
    bfrJours: bil && ca > 0 ? Math.round((bil.bfr / ca) * 365) : 0,
  };
}

// Capital des emprunts existants remboursé sur les 12 mois d'une année de projection
// (les intérêts restent dans le résultat financier de base).
function capitalExistant(client, depart, annee) {
  let capital = 0;
  for (let i = 1; i <= 12; i++) {
    const [y, m] = shiftKey(depart, annee * 12 + i).split("-").map(Number);
    for (const e of client.emprunts || []) capital += capitalRembourseMois(e, m - 1, y);
  }
  return capital;
}
// Annuité constante d'un nouvel emprunt (taux annuel, durée en années).
function tableauNouvelEmprunt(montant, duree, taux) {
  const t = taux / 100, n = Math.max(1, duree);
  const annuite = t > 0 ? (montant * t) / (1 - Math.pow(1 + t, -n)) : montant / n;
  let restant = montant; const out = [];
  for (let i = 0; i < n; i++) { const int = restant * t; const cap = annuite - int; out.push({ interets: int, capital: cap }); restant -= cap; }
  return out;
}

export function projeter(client, base, hyp, tauxReduit = true) {
  const bfrJours = hyp.bfrJours ?? base.bfrJours;
  const annees = [];
  let prev = { ca: base.ca, externes: base.externes, personnel: base.personnel };
  let treso = base.tresorerie, bfrPrec = (base.bfrJours * base.ca) / 365;
  const amortNouveaux = [], empruntsNouveaux = [];
  for (let a = 0; a < 3; a++) {
    const h = hyp.annees[a];
    const ca = prev.ca * (1 + (Number(h.croissance) || 0) / 100);
    const tauxMarge = h.tauxMarge != null && h.tauxMarge !== "" ? Number(h.tauxMarge) / 100 : base.ca > 0 ? base.marge / base.ca : 1;
    const marge = ca * tauxMarge;
    const externes = prev.externes * (1 + (Number(h.charges) || 0) / 100);
    const impots = base.ca > 0 ? (base.impots / base.ca) * ca : base.impots;
    const personnel = prev.personnel * (1 + (Number(h.salaires) || 0) / 100) + (Number(h.embauches) || 0);
    const autres = base.ca > 0 ? (base.autres / base.ca) * ca : base.autres;
    const ebe = marge - externes - impots - personnel + base.subventions;
    if (Number(h.invest) > 0) amortNouveaux.push({ annee: a, montant: Number(h.invest), duree: Math.max(1, Number(h.dureeAmort) || 5) });
    const dotNouv = amortNouveaux.filter((x) => a >= x.annee && a < x.annee + x.duree).reduce((s, x) => s + x.montant / x.duree, 0);
    const dotations = base.dotations + dotNouv;
    if (Number(h.emprunt) > 0) empruntsNouveaux.push({ annee: a, tableau: tableauNouvelEmprunt(Number(h.emprunt), Number(h.dureeEmprunt) || 5, Number(h.tauxEmprunt) || 0) });
    const nouv = empruntsNouveaux.reduce((acc, x) => { const l = x.tableau[a - x.annee]; return l ? { capital: acc.capital + l.capital, interets: acc.interets + l.interets } : acc; }, { capital: 0, interets: 0 });
    const financier = base.financier + nouv.interets;
    const rcai = ebe - autres - dotations - financier;
    const is = estimateIS(rcai, tauxReduit);
    const rn = rcai - is;
    const caf = rn + dotations;
    const bfr = (bfrJours * ca) / 365;
    const ressources = { caf, emprunts: Number(h.emprunt) || 0, apports: Number(h.apports) || 0 };
    const emplois = { invest: Number(h.invest) || 0, remboursements: capitalExistant(client, base.fin, a) + nouv.capital, bfr: bfr - bfrPrec, dividendes: Number(h.dividendes) || 0 };
    const variation = ressources.caf + ressources.emprunts + ressources.apports - emplois.invest - emplois.remboursements - emplois.bfr - emplois.dividendes;
    treso += variation;
    annees.push({ ca, marge, tauxMarge, externes, impots, personnel, autres, ebe, dotations, financier, rcai, is, rn, caf, bfr, ressources, emplois, variation, treso });
    prev = { ca, externes, personnel }; bfrPrec = bfr;
  }
  return annees;
}

// Détail mensuel des 36 mois. Chaque année projetée est répartie : CA, achats, impôts
// et taxes et autres charges selon la saisonnalité ; charges externes, personnel,
// dotations, frais financiers et IS par douzièmes. BFR = jours de CA × CA des 12 mois
// glissants. Investissements, emprunts et apports au 1er mois de l'année, dividendes
// au 6e. Les 12 mois d'une année retombent exactement sur ses totaux annuels.
export function projeterMensuel(client, base, hyp, proj) {
  const bfrJours = hyp.bfrJours ?? base.bfrJours;
  const moisDe = (k) => Number(k.slice(5)) - 1;
  const caGlissant = Array.from({ length: 12 }, (_, i) => base.ca * base.profil[moisDe(shiftKey(base.fin, i - 11))]);
  let treso = base.tresorerie, bfrPrec = (base.bfrJours * base.ca) / 365;
  const out = [];
  for (let j = 0; j < 36; j++) {
    const a = Math.floor(j / 12), rang = j % 12, A = proj[a];
    const key = shiftKey(base.fin, j + 1);
    const [y, m] = key.split("-").map(Number);
    const part = base.profil[m - 1];
    const ca = A.ca * part, marge = ca * A.tauxMarge;
    const externes = A.externes / 12, impots = A.impots * part, personnel = A.personnel / 12, subventions = base.subventions / 12;
    const ebe = marge - externes - impots - personnel + subventions;
    const autres = A.autres * part, dotations = A.dotations / 12, financier = A.financier / 12, is = A.is / 12;
    const rn = ebe - autres - dotations - financier - is;
    caGlissant.push(ca);
    const bfr = (bfrJours * caGlissant.slice(-12).reduce((s, v) => s + v, 0)) / 365;
    const varBfr = bfr - bfrPrec;
    const invest = rang === 0 ? A.emplois.invest : 0;
    const financement = rang === 0 ? A.ressources.emprunts + A.ressources.apports : 0;
    const dividendes = rang === 5 ? A.emplois.dividendes : 0;
    // Capital remboursé : échéancier réel des emprunts existants + douzième des nouveaux.
    const nouveaux = A.emplois.remboursements - capitalExistant(client, base.fin, a);
    const remboursements = (client.emprunts || []).reduce((s, e) => s + capitalRembourseMois(e, m - 1, y), 0) + nouveaux / 12;
    const flux = rn + dotations - varBfr - invest + financement - dividendes - remboursements;
    treso += flux; bfrPrec = bfr;
    out.push({ key, annee: a, ca, marge, externes, impots, personnel, subventions, ebe, autres, dotations, financier, is, rn, caf: rn + dotations, varBfr, invest, financement, dividendes, remboursements, flux, treso });
  }
  return out;
}
