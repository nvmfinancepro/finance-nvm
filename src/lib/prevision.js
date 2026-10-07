// Prévision de trésorerie mois par mois à partir du dernier solde connu.
// Activité du mois : le budget s'il existe, sinon le même mois de l'an dernier
// (saisonnalité), sinon la moyenne des 3 derniers mois. On retire les échéances
// d'emprunt et les acomptes d'impôt sur les sociétés, on ajoute les encaissements
// et dépenses exceptionnels saisis. Hypothèse : délais clients / fournisseurs et
// TVA stables (le besoin en fonds de roulement ne bouge pas).

import { shiftKey, plOver, ytdKeys } from "./pilotage.js";
import { dataIndex } from "./donnees.js";
import { lireBudget, budgetMois, ebeDe, realiseMois } from "./budget.js";
import { chargeEmprunts } from "./estimations.js";
import { lirePrevisions } from "./actions.js";

// Impôt de l'exercice précédent : comptabilisé (FEC) ou renseigné sur la fiche client.
export function impotExercicePrecedent(client, key) {
  const idx = dataIndex(client);
  const ytd = ytdKeys(idx, key);
  if (ytd.length) {
    const prec = Array.from({ length: 12 }, (_, i) => shiftKey(ytd[0], i - 12));
    if (prec.every((k) => idx.months.has(k))) { const v = plOver(idx, prec).is; if (v > 0) return v; }
  }
  return client.is?.totalPrecedent > 0 ? client.is.totalPrecedent : 0;
}

export function prevoirTresorerie(client, depart, horizon, soldeDepart) {
  const idx = dataIndex(client);
  const recents = idx.keys.filter((k) => k <= depart).slice(-3).map((k) => realiseMois(client, k)).filter(Boolean);
  const moyenne = recents.length ? { ca: recents.reduce((s, r) => s + r.ca, 0) / recents.length, achats: recents.reduce((s, r) => s + r.achats, 0) / recents.length, ebe: recents.reduce((s, r) => s + ebeDe(r), 0) / recents.length } : null;
  const manuels = lirePrevisions(client);
  const isN1 = impotExercicePrecedent(client, depart);
  const ex = (idx.months.get(depart)?.meta?.ex || `${depart.slice(0, 4)}-01-01`).slice(0, 7);
  const [exY, exM] = ex.split("-").map(Number);
  const out = [];
  let solde = soldeDepart, soldeP = soldeDepart;
  for (let i = 1; i <= horizon; i++) {
    const k = shiftKey(depart, i);
    const [y, m] = k.split("-").map(Number);
    const b = lireBudget(client, y);
    const r1 = realiseMois(client, shiftKey(k, -12));
    let base, source;
    if (b) { const bm = budgetMois(b, m - 1); base = { ca: bm.ca, achats: bm.achats, ebe: ebeDe(bm) }; source = "budget"; }
    else if (r1) { base = { ca: r1.ca, achats: r1.achats, ebe: ebeDe(r1) }; source = "n1"; }
    else if (moyenne) { base = moyenne; source = "tendance"; }
    else { base = { ca: 0, achats: 0, ebe: 0 }; source = "aucune"; }
    const emprunts = chargeEmprunts(client.emprunts, m - 1, y);
    const rang = (((y * 12 + m - 1) - (exY * 12 + exM - 1)) % 12 + 12) % 12;
    const is = isN1 > 3000 && [2, 5, 8, 11].includes(rang) ? Math.round(isN1 / 4) : 0;
    const lignes = manuels.filter((l) => l.mois === k);
    const autres = lignes.reduce((s, l) => s + Number(l.montant || 0), 0);
    const variation = base.ebe - emprunts - is + autres;
    // Scénario prudent : chiffre d'affaires inférieur de 10 %, coûts fixes inchangés.
    const tauxMarge = base.ca > 0 ? (base.ca - base.achats) / base.ca : 0;
    const prudent = variation - 0.1 * base.ca * tauxMarge;
    solde += variation; soldeP += prudent;
    out.push({ key: k, source, ca: base.ca, activite: base.ebe, emprunts, is, autres, lignes, variation, prudent, solde, soldeP });
  }
  return out;
}

export const moisFuturs = (depart, horizon) => Array.from({ length: horizon }, (_, i) => shiftKey(depart, i + 1));
