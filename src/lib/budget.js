// Budget annuel : objectifs mois par mois sur 5 lignes, du chiffre d'affaires à
// l'excédent d'exploitation. Stocké dans imports_csv (type "budget", mois = l'année,
// ex. "2026") ; le réalisé vient de l'index unifié (comptabilité ou imports).

import { monthPL, sigOf, monthKey } from "./pilotage.js";
import { dataIndex } from "./donnees.js";

export const LIGNES_BUDGET = [
  { id: "ca", label: "Chiffre d'affaires", aide: "Ventes et prestations, hors taxes", produit: true },
  { id: "achats", label: "Achats consommés", aide: "Marchandises et matières vendues" },
  { id: "externes", label: "Charges externes", aide: "Loyer, honoraires, publicité, énergie…" },
  { id: "personnel", label: "Salaires et charges sociales", aide: "Coût employeur total" },
  { id: "autres", label: "Impôts, taxes et autres", aide: "CFE et taxes, moins les subventions" },
];
export const ebeDe = (v) => v.ca - v.achats - v.externes - v.personnel - v.autres;
const vide = () => Object.fromEntries(LIGNES_BUDGET.map((l) => [l.id, Array(12).fill(0)]));

export function lireBudget(client, annee) {
  const imp = (client.imports || []).find((i) => i.type === "budget" && i.mois === String(annee));
  const r = imp?.rows?.[0];
  if (!r) return null;
  const out = vide();
  for (const l of LIGNES_BUDGET) out[l.id] = Array.from({ length: 12 }, (_, i) => Number(r[l.id]?.[i]) || 0);
  return { ...out, majLe: r.majLe || imp.importedAt || "" };
}
export const budgetMois = (b, i) => Object.fromEntries(LIGNES_BUDGET.map((l) => [l.id, b[l.id][i]]));

// Réalisé d'un mois, découpé comme le budget (la somme des lignes donne l'EBE).
export function realiseMois(client, key) {
  const idx = dataIndex(client);
  if (!idx.months.has(key)) return null;
  const pl = monthPL(idx, key), s = sigOf(pl);
  const v = { ca: s.ca, achats: s.ca - s.margeBrute, externes: pl.chargesExternes, personnel: s.personnel };
  v.autres = v.ca - v.achats - v.externes - v.personnel - s.ebe;
  return v;
}

// Proposition de budget : les mêmes mois de l'an dernier (saisonnalité comprise)
// ajustés des hausses choisies ; à défaut, la moyenne des mois connus.
export function proposerBudget(client, annee, { ca = 5, charges = 2, salaires = 3 } = {}) {
  const prev = Array.from({ length: 12 }, (_, i) => realiseMois(client, monthKey(i, annee - 1)));
  const idx = dataIndex(client);
  const connus = idx.keys.slice(-12).map((k) => realiseMois(client, k)).filter(Boolean);
  const moyenne = connus.length ? Object.fromEntries(LIGNES_BUDGET.map((l) => [l.id, connus.reduce((s, v) => s + v[l.id], 0) / connus.length])) : null;
  const f = { ca: 1 + ca / 100, achats: 1 + ca / 100, externes: 1 + charges / 100, autres: 1 + charges / 100, personnel: 1 + salaires / 100 };
  const out = vide();
  for (const l of LIGNES_BUDGET) out[l.id] = prev.map((p) => Math.round(((p || moyenne)?.[l.id] || 0) * f[l.id] / 10) * 10);
  const nPrev = prev.filter(Boolean).length;
  return { budget: out, base: nPrev === 12 ? "n1" : nPrev > 0 || moyenne ? "moyenne" : "vide" };
}

// Répartit un total annuel selon le profil actuel de la ligne (ou à parts égales).
export function repartir(total, profil) {
  const somme = profil.reduce((s, v) => s + Math.max(0, v), 0);
  const parts = somme > 0 ? profil.map((v) => Math.max(0, v) / somme) : Array(12).fill(1 / 12);
  const out = parts.map((p) => Math.round((total * p) / 10) * 10);
  out[11] += Math.round(total - out.reduce((s, v) => s + v, 0));
  return out;
}
