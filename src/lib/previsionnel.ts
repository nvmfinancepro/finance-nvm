import type { Client } from "@/types";

// ─── Prévisionnel hybride — calcul de projection financière ─────────────────
// Extrait de NVMFinance.jsx (bloc "previsionnel") pour sortir ~300 lignes de
// calcul dense du rendu JSX. getImportValueOrEstimate() n'appelle plus
// jamais elle-même (contrairement à l'ancienne getI()) — c'est ce qui
// provoquait un "Maximum call stack size exceeded" sur les clients sans
// aucune donnée importée pour l'année en cours.

export interface PaymentDelays {
  clientsDays: number;
  fournisseursDays: number;
  isEstimated: boolean; // true si aucun import creances_clients/dettes_fournisseurs ce mois → repli sur la valeur par défaut
}

export interface MonthForecast {
  // Historique 3 ans (bruts ou estimés depuis la tendance)
  v3ca: number; v2ca: number; v1ca: number;
  v3mg: number; v2mg: number; v1mg: number;
  v3chF: number; v2chF: number; v1chF: number;
  v3chV: number; v2chV: number; v1chV: number;
  v3chA: number; v2chA: number; v1chA: number;
  v3sal: number; v2sal: number; v1sal: number;
  v1ch: number; v2ch: number; v3ch: number;
  v1ebe: number; v2ebe: number; v3ebe: number;
  v1rbrt: number; v2rbrt: number; v3rbrt: number;
  v1is: number; v1res: number; v2res: number; v3res: number;
  // Années de référence des 3 colonnes historiques affichées
  base1: number; base2: number; base3: number;
  // Taux/ratios utilisés pour la projection du mois affiché
  txCA: number;
  tauxMgBase: number; tauxMgFinal: number;
  ratioChVBase: number; ratioChVFinal: number;
  // Projection du mois affiché
  projCA: number; projMg: number; projChF: number; projChV: number; projChA: number; projCh: number; projSal: number;
  projAm: number; projRemb: number;
  projEbe: number; projRbrt: number; projIS: number; projResult: number;
  isN1Tot: number; acompteMens: number; isTaux: number;
  // Trésorerie — basée sur les délais de paiement réels (§ calcPaymentDelays), plus de coefficient arbitraire
  treso: number;
  paymentDelays: PaymentDelays;
  fluxProj: number;
  fluxV1: number; // même formule appliquée à l'historique N-1, pour comparaison (colonne Écart)
}

export interface AnnualForecast {
  annCA_proj: number;
  annRes_proj: number;
  seuilMois: number | null;
  seuilAnnee: number | null;
  caScenario: { low: number; base: number; high: number };
  resultScenario: { low: number; base: number; high: number };
}

type Adjustments = Record<number, Record<string, number | string>>;

const monthKey = (month: number, year: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

// ─── Lecture des imports réels ───────────────────────────────────────────────
export function getRawImportValue(client: Client, year: number, month: number, field: string): number {
  const key = monthKey(month, year);
  const rowsOf = (type: string) =>
    (client.imports || []).filter(i => i.type === type && i.mois === key).flatMap(i => i.rows);
  const vR = rowsOf("ventes_produits"), cR = rowsOf("charges"), sR = rowsOf("salaires");
  if (field === "ca")    return vR.reduce((s, r) => s + parseFloat(r.ca_ht || "0"), 0);
  if (field === "marge") return vR.reduce((s, r) => s + parseFloat(r.marge_ht || "0"), 0);
  if (field === "chF")   return cR.filter(r => r.type === "fixe").reduce((s, r) => s + parseFloat(r.montant_ht || "0"), 0);
  if (field === "chV")   return cR.filter(r => r.type === "variable").reduce((s, r) => s + parseFloat(r.montant_ht || "0"), 0);
  if (field === "chA")   return cR.filter(r => !r.type || r.type === "autre").reduce((s, r) => s + parseFloat(r.montant_ht || "0"), 0);
  if (field === "sal")   return sR.reduce((s, r) => s + parseFloat(r.salaire_brut || "0") + parseFloat(r.cotisations_patronales || "0"), 0);
  return 0;
}

// Donnée réelle si disponible, sinon estimée depuis N-1 + tendance réelle des mois déjà écoulés.
// N'appelle que getRawImportValue — jamais elle-même.
export function getImportValueOrEstimate(
  client: Client, year: number, month: number, field: string, curYear: number, curMonth: number
): number {
  const raw = getRawImportValue(client, year, month, field);
  if (raw === 0 && year === curYear) {
    const n1 = year - 1;
    const kN1 = getRawImportValue(client, n1, month, field);
    if (kN1 === 0) return 0;
    const moisReels = Array.from({ length: curMonth + 1 }, (_, m2) => {
      const r = getRawImportValue(client, year, m2, field), p = getRawImportValue(client, n1, m2, field);
      return p > 0 ? r / p : null;
    }).filter((v): v is number => v !== null && v > 0);
    const tendance = moisReels.length > 0 ? moisReels.reduce((s, v) => s + v, 0) / moisReels.length : 1.1;
    return Math.round(kN1 * tendance);
  }
  return raw;
}

// ─── Délais de paiement réels (remplace l'ancien coefficient 0.95 arbitraire) ─
const DEFAULT_DELAY_DAYS = 30; // norme B2B courante, utilisé seulement si aucun import créances/dettes ce mois

function avgDelayDays(rows: Record<string, string>[], startField: string, endField: string): number | null {
  const diffs: number[] = [];
  for (const r of rows) {
    const start = r[startField] ? new Date(r[startField]).getTime() : NaN;
    const end = r[endField] ? new Date(r[endField]).getTime() : NaN;
    if (!isNaN(start) && !isNaN(end)) {
      const days = Math.round((end - start) / 86400000);
      if (days >= 0) diffs.push(days);
    }
  }
  if (diffs.length === 0) return null;
  return Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
}

export function calcPaymentDelays(client: Client, year: number, month: number): PaymentDelays {
  const key = monthKey(month, year);
  const creances = (client.imports || []).filter(i => i.type === "creances_clients" && i.mois === key).flatMap(i => i.rows);
  const dettes = (client.imports || []).filter(i => i.type === "dettes_fournisseurs" && i.mois === key).flatMap(i => i.rows);
  const clientsDays = avgDelayDays(creances, "date_emission", "date_echeance");
  const fournisseursDays = avgDelayDays(dettes, "date_reception", "date_echeance");
  return {
    clientsDays: clientsDays ?? DEFAULT_DELAY_DAYS,
    fournisseursDays: fournisseursDays ?? DEFAULT_DELAY_DAYS,
    isEstimated: clientsDays === null || fournisseursDays === null,
  };
}

// ─── Projection d'un mois affiché ────────────────────────────────────────────
export function calcMonthForecast(
  client: Client, moisGlobal: number, curYear: number, curMonth: number, adjustments: Adjustments
): MonthForecast {
  const N = curYear, N1 = N - 1, N2 = N - 2, N3 = N - 3, NF = N + 1;
  const moisAnnee = moisGlobal < 12 ? N : NF;
  const moisLocal = moisGlobal % 12;
  const mi = moisLocal;
  const adj = adjustments || {};
  const adjM = adj[mi] || {};
  const getAdjM = (id: string) => (adjM[id] !== undefined ? parseFloat(String(adjM[id])) : 0);
  const hasAdjM = (id: string) => adjM[id] !== undefined && parseFloat(String(adjM[id])) !== 0;

  const getI = (yr: number, m: number, field: string) => getImportValueOrEstimate(client, yr, m, field, N, curMonth);

  const tx = (a: number, b: number): number | null => (a > 0 && b > 0) ? Math.round(((b - a) / a * 100) * 10) / 10 : null;
  const txProj = (v3: number, v2: number, v1: number, id: string) => {
    const t1 = tx(v2, v1), t2 = tx(v3, v2);
    const base = t1 !== null && t2 !== null ? Math.round((t2 / 3 + t1 * 2 / 3) * 10) / 10 : (t1 ?? t2 ?? 0);
    return hasAdjM(id) ? base + getAdjM(id) : base;
  };

  const base1 = moisAnnee === N ? N1 : N;
  const base2 = moisAnnee === N ? N2 : N1;
  const base3 = moisAnnee === N ? N3 : N2;

  const v3ca = getI(base3, mi, "ca"), v2ca = getI(base2, mi, "ca"), v1ca = getI(base1, mi, "ca");
  const v3mg = getI(base3, mi, "marge"), v2mg = getI(base2, mi, "marge"), v1mg = getI(base1, mi, "marge");
  const v3chF = getI(base3, mi, "chF"), v2chF = getI(base2, mi, "chF"), v1chF = getI(base1, mi, "chF");
  const v3chV = getI(base3, mi, "chV"), v2chV = getI(base2, mi, "chV"), v1chV = getI(base1, mi, "chV");
  const v3chA = getI(base3, mi, "chA"), v2chA = getI(base2, mi, "chA"), v1chA = getI(base1, mi, "chA");
  const v3sal = getI(base3, mi, "sal"), v2sal = getI(base2, mi, "sal"), v1sal = getI(base1, mi, "sal");
  const v1ch = v1chF + v1chV + v1chA, v2ch = v2chF + v2chV + v2chA, v3ch = v3chF + v3chV + v3chA;

  const rBase1 = moisAnnee === N ? N1 : N;
  const rBase2 = moisAnnee === N ? N2 : N1;
  const annSum = (field: string) => Array.from({ length: 12 }, (_, m2) => getI(rBase1, m2, field)).reduce((s, v) => s + v, 0);
  const ann2Sum = (field: string) => Array.from({ length: 12 }, (_, m2) => getI(rBase2, m2, field)).reduce((s, v) => s + v, 0);
  const annCA1 = annSum("ca"), annCA2 = ann2Sum("ca");
  const tauxMargeN1 = annCA1 > 0 ? Math.round(annSum("marge") / annCA1 * 1000) / 10 : 60;
  const tauxMargeN2 = annCA2 > 0 ? Math.round(ann2Sum("marge") / annCA2 * 1000) / 10 : tauxMargeN1;
  const ratioChVN1 = annCA1 > 0 ? Math.round(annSum("chV") / annCA1 * 1000) / 10 : 0;
  const ratioChVN2 = annCA2 > 0 ? Math.round(ann2Sum("chV") / annCA2 * 1000) / 10 : ratioChVN1;

  const txCA = txProj(v3ca, v2ca, v1ca, "ca");
  const tauxMgBase = annCA2 > 0 ? Math.round((tauxMargeN2 / 3 + tauxMargeN1 * 2 / 3) * 10) / 10 : tauxMargeN1;
  const tauxMgFinal = getAdjM("taux_marge") !== 0 ? tauxMgBase + getAdjM("taux_marge") : tauxMgBase;
  const ratioChVBase = annCA2 > 0 ? Math.round((ratioChVN2 / 3 + ratioChVN1 * 2 / 3) * 10) / 10 : ratioChVN1;
  const ratioChVFinal = getAdjM("ratio_chv") !== 0 ? ratioChVBase + getAdjM("ratio_chv") : ratioChVBase;
  const txChF = txProj(v3chF, v2chF, v1chF, "chF");
  const txChA = txProj(v3chA, v2chA, v1chA, "chA");
  const txSal = txProj(v3sal, v2sal, v1sal, "sal");

  const projCA = v1ca > 0 ? Math.round(v1ca * (1 + txCA / 100)) : 0;
  const tauxMgMois = v1ca > 0 ? v1mg / v1ca * 100 : tauxMgFinal;
  const tauxMgEff = hasAdjM("taux_marge") ? tauxMgMois + getAdjM("taux_marge") : tauxMgMois;
  const projMg = projCA > 0 ? Math.round(projCA * tauxMgEff / 100) : 0;
  const projChF = v1chF > 0 ? Math.round(v1chF * (1 + txChF / 100)) : 0;
  const ratioChVMois = v1ca > 0 ? v1chV / v1ca * 100 : ratioChVFinal;
  const ratioChVEff = hasAdjM("ratio_chv") ? ratioChVMois + getAdjM("ratio_chv") : ratioChVMois;
  const projChV = projCA > 0 ? Math.round(projCA * ratioChVEff / 100) : 0;
  const projChA = v1chA > 0 ? Math.round(v1chA * (1 + txChA / 100)) : 0;
  const projCh = projChF + projChV + projChA;
  const projSal = v1sal > 0 ? Math.round(v1sal * (1 + txSal / 100)) : 0;

  const projAm = (client.investissements || []).reduce((s, inv) => {
    const debut = inv.dateMEP ? new Date(inv.dateMEP) : new Date(N1, 0, 1);
    const mDebut = debut.getFullYear() * 12 + debut.getMonth();
    const mActuel = moisAnnee * 12 + moisLocal;
    if (mActuel < mDebut || mActuel >= mDebut + (inv.duree || 36)) return s;
    return s + Math.round(inv.montantHT / (inv.duree || 36));
  }, 0);
  const projRemb = (client.emprunts || []).reduce((s, e) => {
    const debut = e.dateDebut ? new Date(e.dateDebut) : new Date(N1, 0, 1);
    const mDebut = debut.getFullYear() * 12 + debut.getMonth();
    const mActuel = moisAnnee * 12 + moisLocal;
    if (mActuel < mDebut || mActuel >= mDebut + e.duree) return s;
    return s + Math.round(e.capital * (e.taux / 100) / (1 - Math.pow(1 + e.taux / 100, -e.duree)) + e.assurance);
  }, 0);

  const isD = client.is || { taux: 15, totalPrecedent: 0 };
  const projEbe = projMg - projCh - projSal;
  const projRbrt = projEbe - projAm;
  const projIS = Math.max(0, Math.round(projRbrt * isD.taux / 100));
  const projResult = projRbrt - projIS;

  const isN1Tot = isD.totalPrecedent || Array.from({ length: 12 }, (_, m2) => {
    const mg = getI(N1, m2, "marge"), chF = getI(N1, m2, "chF"), chV = getI(N1, m2, "chV"), chA = getI(N1, m2, "chA"), sal = getI(N1, m2, "sal");
    const r = mg - chF - chV - chA - sal - projAm;
    return Math.max(0, Math.round(r * isD.taux / 100));
  }).reduce((s, v) => s + v, 0);
  const acompteMens = Math.round(isN1Tot / 12);

  const treso = client.tresorerie?.soldeInitial || client.kpis?.tresorerie || 0;

  const v1ebe = v1mg - v1ch - v1sal, v1rbrt = v1ebe - projAm, v1is = Math.max(0, Math.round(v1rbrt * isD.taux / 100)), v1res = v1rbrt - v1is;
  const v2ebe = v2mg - v2ch - v2sal, v2rbrt = v2ebe - projAm;
  const v3ebe = v3mg - v3ch - v3sal, v3rbrt = v3ebe - projAm;
  const calcNet = (mg: number, ch: number, sal: number) => {
    const r = mg - ch - sal - projAm;
    return r - Math.max(0, Math.round(r * isD.taux / 100));
  };
  const v2res = calcNet(v2mg, v2ch, v2sal);
  const v3res = calcNet(v3mg, v3ch, v3sal);

  // ── Trésorerie : délais de paiement réels (créances clients / dettes fournisseurs importées ce mois),
  // au lieu d'un coefficient 0.95 arbitraire. Les salaires sont payés à 100% le mois même (pas de délai
  // "fournisseur" appliqué dessus, contrairement à l'ancien calcul qui les mélangeait avec les charges).
  const paymentDelays = calcPaymentDelays(client, moisAnnee, moisLocal);
  const joursDuMois = new Date(moisAnnee, moisLocal + 1, 0).getDate();
  const caEncaisse = Math.round(projCA * joursDuMois / (joursDuMois + paymentDelays.clientsDays));
  const chargesPayees = Math.round(projCh * joursDuMois / (joursDuMois + paymentDelays.fournisseursDays));
  const fluxProj = caEncaisse - chargesPayees - projSal - projRemb - acompteMens;
  const caEncaisseV1 = Math.round(v1ca * joursDuMois / (joursDuMois + paymentDelays.clientsDays));
  const chargesPayeesV1 = Math.round(v1ch * joursDuMois / (joursDuMois + paymentDelays.fournisseursDays));
  const fluxV1 = caEncaisseV1 - chargesPayeesV1 - v1sal - projRemb - acompteMens;

  return {
    v3ca, v2ca, v1ca, v3mg, v2mg, v1mg, v3chF, v2chF, v1chF, v3chV, v2chV, v1chV, v3chA, v2chA, v1chA, v3sal, v2sal, v1sal,
    v1ch, v2ch, v3ch, v1ebe, v2ebe, v3ebe, v1rbrt, v2rbrt, v3rbrt, v1is, v1res, v2res, v3res,
    base1, base2, base3, txCA, tauxMgBase, tauxMgFinal, ratioChVBase, ratioChVFinal,
    projCA, projMg, projChF, projChV, projChA, projCh, projSal, projAm, projRemb, projEbe, projRbrt, projIS, projResult,
    isN1Tot, acompteMens, isTaux: isD.taux, treso, paymentDelays, fluxProj, fluxV1,
  };
}

// ─── Projection annuelle + fourchette de scénario ────────────────────────────
export function calcAnnualForecast(
  client: Client, moisGlobal: number, curYear: number, curMonth: number, adjustments: Adjustments
): AnnualForecast {
  const N = curYear, N1 = N - 1, NF = N + 1;
  const moisAnnee = moisGlobal < 12 ? N : NF;
  const adj = adjustments || {};
  const getI = (yr: number, m: number, field: string) => getImportValueOrEstimate(client, yr, m, field, N, curMonth);

  const rBase1 = moisAnnee === N ? N1 : N;
  const rBase2 = moisAnnee === N ? N - 2 : N1;

  // Réutilise le contexte du mois affiché (taux de base, amortissement du mois) — même logique que l'original,
  // qui appliquait l'amortissement du mois sélectionné à toute la projection annuelle.
  const { tauxMgBase, ratioChVBase, isTaux, projAm } = calcMonthForecast(client, moisGlobal, curYear, curMonth, adjustments);

  const txGlobal = (field: string) => {
    let tot1 = 0, tot2 = 0;
    for (let m2 = 0; m2 < 12; m2++) { tot1 += getI(rBase1, m2, field); tot2 += getI(rBase2, m2, field); }
    return (tot1 > 0 && tot2 > 0) ? Math.round(((tot1 - tot2) / tot2 * 100) * 10) / 10 : 0;
  };
  const txCA_ann = txGlobal("ca");
  const txChF_ann = txGlobal("chF");
  const txChA_ann = txGlobal("chA");
  const txSal_ann = txGlobal("sal");

  const moisDebut = curMonth;
  const allMoisProj = Array.from({ length: 24 - moisDebut }, (_, i) => moisDebut + i);

  const adjVal = (g: number, id: string) => {
    const a = adj[g] || {};
    return a[id] !== undefined ? parseFloat(String(a[id])) : 0;
  };

  // rateDeltaCA décale uniquement le taux de croissance du CA (scénario bas/haut) — les charges fixes,
  // la masse salariale et l'amortissement restent identiques entre scénarios (ne bougent pas avec le CA
  // à court terme) ; seuls la marge et les charges variables, calculées en % du CA, suivent le scénario.
  const projectAnnualCA = (rateDeltaCA: number) => allMoisProj.reduce((s, g) => {
    const mL = g % 12;
    const baseAnn = g < 12 ? N1 : N;
    const b = getI(baseAnn, mL, "ca");
    const rate = txCA_ann + rateDeltaCA;
    const txAdj = adjVal(g, "ca") !== 0 ? rate + adjVal(g, "ca") : rate;
    return s + (b > 0 ? Math.round(b * (1 + txAdj / 100)) : 0);
  }, 0);

  const projectAnnualResult = (rateDeltaCA: number) => allMoisProj.reduce((s, g) => {
    const mL = g % 12, baseAnnR = g < 12 ? N1 : N;
    const ca = getI(baseAnnR, mL, "ca"); if (ca === 0) return s;
    const rate = txCA_ann + rateDeltaCA;
    const txCaAdj = adjVal(g, "ca") !== 0 ? rate + adjVal(g, "ca") : rate;
    const pCa = Math.round(ca * (1 + txCaAdj / 100));
    const mg1 = getI(baseAnnR, mL, "marge");
    const txMgM = ca > 0 ? mg1 / ca * 100 : tauxMgBase;
    const txMgM2 = adjVal(g, "taux_marge") !== 0 ? txMgM + adjVal(g, "taux_marge") : txMgM;
    const pMg = Math.round(pCa * txMgM2 / 100);
    const pChF = Math.round(getI(baseAnnR, mL, "chF") * (1 + (adjVal(g, "chF") !== 0 ? txChF_ann + adjVal(g, "chF") : txChF_ann) / 100));
    const chV1 = getI(baseAnnR, mL, "chV");
    const rChVM = ca > 0 ? chV1 / ca * 100 : ratioChVBase;
    const rChVM2 = adjVal(g, "ratio_chv") !== 0 ? rChVM + adjVal(g, "ratio_chv") : rChVM;
    const pChV = Math.round(pCa * rChVM2 / 100);
    const pChA = Math.round(getI(baseAnnR, mL, "chA") * (1 + (adjVal(g, "chA") !== 0 ? txChA_ann + adjVal(g, "chA") : txChA_ann) / 100));
    const pSal = Math.round(getI(baseAnnR, mL, "sal") * (1 + (adjVal(g, "sal") !== 0 ? txSal_ann + adjVal(g, "sal") : txSal_ann) / 100));
    const r = pMg - pChF - pChV - pChA - pSal - projAm;
    return s + (r - Math.max(0, Math.round(r * isTaux / 100)));
  }, 0);

  const annCA_proj = projectAnnualCA(0);
  const annRes_proj = projectAnnualResult(0);

  let seuilMois: number | null = null, seuilAnnee: number | null = null, cumR = 0;
  for (const g of allMoisProj) {
    const mL = g % 12, mA = g < 12 ? N : NF;
    const baseS = g < 12 ? N1 : N;
    const ca = getI(baseS, mL, "ca"); if (ca === 0) continue;
    const pCa = Math.round(ca * (1 + (adjVal(g, "ca") !== 0 ? txCA_ann + adjVal(g, "ca") : txCA_ann) / 100));
    const mg1 = getI(baseS, mL, "marge"), chV1 = getI(baseS, mL, "chV");
    const txMg = ca > 0 ? mg1 / ca * 100 : tauxMgBase, txMgF = adjVal(g, "taux_marge") !== 0 ? txMg + adjVal(g, "taux_marge") : txMg;
    const rChV = ca > 0 ? chV1 / ca * 100 : ratioChVBase, rChVF = adjVal(g, "ratio_chv") !== 0 ? rChV + adjVal(g, "ratio_chv") : rChV;
    const r = Math.round(pCa * txMgF / 100)
      - Math.round(getI(baseS, mL, "chF") * (1 + (adjVal(g, "chF") !== 0 ? txChF_ann + adjVal(g, "chF") : txChF_ann) / 100))
      - Math.round(pCa * rChVF / 100)
      - Math.round(getI(baseS, mL, "chA") * (1 + (adjVal(g, "chA") !== 0 ? txChA_ann + adjVal(g, "chA") : txChA_ann) / 100))
      - Math.round(getI(baseS, mL, "sal") * (1 + (adjVal(g, "sal") !== 0 ? txSal_ann + adjVal(g, "sal") : txSal_ann) / 100))
      - projAm;
    cumR += r - Math.max(0, Math.round(r * isTaux / 100));
    if (cumR > 0 && seuilMois === null) { seuilMois = mL; seuilAnnee = mA; }
  }

  // ── Fourchette de scénario : largeur = écart entre les 2 taux de croissance annuels réellement mesurés
  // (N-2→N-1 et N-1→N), pas un pourcentage arbitraire. Plancher ±3 pts, plafond ±15 pts.
  const annualSumFor = (yr: number) => Array.from({ length: 12 }, (_, m2) => getImportValueOrEstimate(client, yr, m2, "ca", N, curMonth)).reduce((s, v) => s + v, 0);
  const growthRate = (a: number, b: number) => (a > 0 && b > 0) ? (b - a) / a * 100 : null;
  const rateA = growthRate(annualSumFor(N - 2), annualSumFor(N - 1));
  const rateB = growthRate(annualSumFor(N - 1), annualSumFor(N));
  const measured = [rateA, rateB].filter((r): r is number => r !== null);
  const rawWidth = measured.length === 2 ? Math.abs(measured[1] - measured[0]) : (measured.length === 1 ? Math.abs(measured[0]) * 0.3 : 5);
  const bandWidth = Math.min(15, Math.max(3, Math.round(rawWidth * 10) / 10));

  const caScenario = { low: projectAnnualCA(-bandWidth), base: annCA_proj, high: projectAnnualCA(bandWidth) };
  const resultScenario = { low: projectAnnualResult(-bandWidth), base: annRes_proj, high: projectAnnualResult(bandWidth) };

  return { annCA_proj, annRes_proj, seuilMois, seuilAnnee, caScenario, resultScenario };
}
