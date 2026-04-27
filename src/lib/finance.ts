import type { Client, MonthKpis, Alerte, ImportCSV } from "@/types";

export const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

export const fmt = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);

export const pct = (n: number): string => `${Math.round(n ?? 0)} %`;

export const getMonthKey = (moisIdx: number, year: number): string =>
  `${year}-${String(moisIdx + 1).padStart(2, "0")}`;

// ─── Calcul KPIs pour un mois donné ─────────────────────────────────────────
export function calcMonthKpis(client: Client, moisIdx: number, year: number): MonthKpis {
  const key = getMonthKey(moisIdx, year);
  const imports: ImportCSV[] = client.imports ?? [];

  const ventesRows = imports
    .filter(i => i.type === "ventes_produits" && i.mois === key)
    .flatMap(i => i.rows);

  const ca    = ventesRows.reduce((s, r) => s + parseFloat(r.ca_ht ?? "0"), 0);
  const marge = ventesRows.reduce((s, r) => s + parseFloat(r.marge_ht ?? "0"), 0);

  const chargesRows = imports
    .filter(i => i.type === "charges" && i.mois === key)
    .flatMap(i => i.rows);
  const charges = chargesRows.reduce((s, r) => s + parseFloat(r.montant_ht ?? "0"), 0);

  const salairesRows = imports
    .filter(i => i.type === "salaires" && i.mois === key)
    .flatMap(i => i.rows);
  const salaires = salairesRows.reduce(
    (s, r) => s + parseFloat(r.salaire_brut ?? "0") + parseFloat(r.cotisations_patronales ?? "0"),
    0
  );

  const base    = client.kpis;
  const hasData = ca > 0;

  const fCA       = hasData ? ca     : base.ca;
  const fMarge    = hasData ? marge  : base.marge;
  const fCharges  = charges  > 0 ? charges  : base.charges;
  const fSalaires = salaires > 0 ? salaires : base.salaires;

  const amort = (client.investissements ?? []).reduce(
    (s, inv) => s + Math.round(inv.montantHT / (inv.duree || 36)),
    0
  );

  const fEbe    = fMarge - fCharges - fSalaires;
  const fResult = fEbe - amort;
  const isD     = client.is ?? { taux: 15 };
  const provIS  = Math.max(0, Math.round(fEbe * isD.taux / 100));

  return {
    ca: fCA, marge: fMarge, charges: fCharges, salaires: fSalaires,
    ebe: fEbe, result: fResult, amort, provIS, hasData,
  };
}

// ─── Calcul alertes dynamiques ───────────────────────────────────────────────
export function calcAlertes(client: Client, moisIdx: number, moisYear: number): Alerte[] {
  const kpis = calcMonthKpis(client, moisIdx, moisYear);
  const emprunts = client.emprunts ?? [];
  const chargeEmprunt = emprunts.reduce((s, e) => {
    const m = e.capital * (e.taux / 100) / (1 - Math.pow(1 + e.taux / 100, -e.duree));
    return s + Math.round(m + e.assurance);
  }, 0);
  const treso = client.tresorerie?.soldeInitial ?? client.kpis.tresorerie ?? 0;
  const alerts: Alerte[] = [];

  // Résultat net négatif
  if (kpis.result < 0)
    alerts.push({ level: "red", kpi: "Résultat net négatif", current: fmt(kpis.result), threshold: "> 0 €",
      msg: `Vos charges dépassent vos recettes ce mois (${fmt(kpis.result)}).`,
      action: "Analysez vos charges fixes et cherchez à augmenter votre marge." });

  // EBE négatif
  if (kpis.ebe < 0)
    alerts.push({ level: "red", kpi: "EBE négatif", current: fmt(kpis.ebe), threshold: "> 0 €",
      msg: `Votre exploitation ne couvre pas ses charges (EBE : ${fmt(kpis.ebe)}).`,
      action: "Réduisez vos charges variables ou augmentez votre prix de vente." });

  // Masse salariale
  const tauxSal = kpis.ca > 0 ? kpis.salaires / kpis.ca * 100 : 0;
  if (tauxSal > 50 && kpis.ca > 0)
    alerts.push({ level: "red", kpi: "Masse salariale critique", current: `${Math.round(tauxSal)}% du CA`, threshold: "< 50% du CA",
      msg: `Votre masse salariale représente ${Math.round(tauxSal)}% de votre CA.`,
      action: "Analysez la productivité par employé." });
  else if (tauxSal > 35 && kpis.ca > 0)
    alerts.push({ level: "orange", kpi: "Masse salariale élevée", current: `${Math.round(tauxSal)}% du CA`, threshold: "< 35% du CA",
      msg: `Votre masse salariale représente ${Math.round(tauxSal)}% de votre CA.`,
      action: "Surveillez l'évolution du ratio chaque mois." });

  // Taux de marge
  const tauxMarge = kpis.ca > 0 ? kpis.marge / kpis.ca * 100 : 0;
  if (tauxMarge > 0 && tauxMarge < 20)
    alerts.push({ level: "red", kpi: "Taux de marge très faible", current: `${Math.round(tauxMarge)}%`, threshold: "> 20%",
      msg: `Votre marge brute est de ${Math.round(tauxMarge)}% du CA.`,
      action: "Négociez vos prix d'achat ou augmentez vos prix de vente." });
  else if (tauxMarge > 0 && tauxMarge < 30)
    alerts.push({ level: "orange", kpi: "Taux de marge faible", current: `${Math.round(tauxMarge)}%`, threshold: "> 30%",
      msg: `Votre marge brute est de ${Math.round(tauxMarge)}% du CA.`,
      action: "Optimisez votre mix commercial." });

  // Trésorerie
  if (treso < 0)
    alerts.push({ level: "red", kpi: "Trésorerie négative", current: fmt(treso), threshold: "> 0 €",
      msg: `Votre trésorerie est négative (${fmt(treso)}).`,
      action: "Contactez votre conseiller NVM Finance en urgence." });

  const chargesMs = kpis.charges + kpis.salaires + chargeEmprunt;
  if (treso >= 0 && treso < chargesMs)
    alerts.push({ level: "orange", kpi: "Trésorerie insuffisante", current: fmt(treso), threshold: `> ${fmt(Math.round(chargesMs))}`,
      msg: `Votre trésorerie couvre moins d'un mois de charges.`,
      action: "Constituez une réserve de 2-3 mois de charges." });

  // Aucune alerte
  if (alerts.length === 0)
    alerts.push({ level: "green", kpi: "Situation financière saine", current: "Aucun point critique", threshold: "",
      msg: "Aucune anomalie détectée. Tous les indicateurs sont dans les seuils normaux." });

  return alerts;
}

// ─── Génération mot de passe temporaire ─────────────────────────────────────
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
