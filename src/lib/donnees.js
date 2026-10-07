// Source unique des chiffres de pilotage, quelle que soit l'origine des données :
// - la comptabilité importée (FEC, src/lib/fec.js) quand elle couvre le mois ;
// - sinon les imports simplifiés (relevé bancaire, modèles CSV), traduits ici en
//   « comptes » du plan comptable pour alimenter exactement les mêmes vues
//   (compte de résultat, ventes, charges, TVA, IS, budget, comparaison…).
// Les vues de bilan et de trésorerie réelle restent réservées au FEC (fecIndex).

import { fecIndex, monthPL, sigOf, plOver, ytdKeys, estimateIS, monthEnd, monthKey, shiftKey } from "./pilotage.js";
import { amortissements, capitalRestant, echeancesPayees, mensualiteEmprunt } from "./estimations.js";

const num = (v) => {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[\s €]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const n0 = (v) => num(v) ?? 0;
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tauxTva = (r) => num(r.taux_tva) ?? 20;

// ── Une ligne de vente, quel que soit le modèle sectoriel utilisé
// (ca_ht, ca_ht_periode, loyer…, pvht × quantité ; marge_ht, marge_brute ou CA − coûts).
export function lireVente(r) {
  const qte = num(r.quantite_vendue) ?? num(r.qte_vendue) ?? num(r.quantite) ?? num(r.nb_couverts) ?? num(r.nb_actes) ?? num(r.nb_nuits) ?? num(r.nb_jours) ?? null;
  let ca = num(r.ca_ht) ?? num(r.ca_ht_periode);
  if (ca == null && num(r.loyer_mensuel_ht) != null) ca = n0(r.loyer_mensuel_ht) + n0(r.charges_recuperees);
  if (ca == null && num(r.pvht) != null && qte != null) ca = n0(r.pvht) * qte;
  ca = ca ?? 0;
  let cout = num(r.cout_achat_ht) ?? num(r.cout_matiere_ht) ?? num(r.cout_chambre_ht) ?? num(r.charges_directes_ht) ?? num(r.materiaux_ht);
  if (cout == null && num(r.cout_production_ht) != null) cout = n0(r.cout_production_ht) * (qte ?? 1);
  if (cout == null && num(r.cout_unitaire_ht) != null) cout = n0(r.cout_unitaire_ht) * (qte ?? 1);
  const margeExplicite = num(r.marge_ht) ?? num(r.marge_brute) ?? num(r.marge);
  const marge = margeExplicite ?? ca - (cout ?? 0);
  return {
    ca, cout: ca - marge, marge, qte,
    produit: String(r.nom_produit || r.designation || r.libelle || r.type_acte || r.type_chambre || r.reference || r.reference_chantier || r.reference_mission || "").trim(),
    ref: String(r.reference || r.reference_chantier || r.reference_mission || "").trim(),
    canal: String(r.canal_vente || r.categorie || r.client || "").trim(),
    taux: tauxTva(r),
  };
}

// ── Nature d'une charge (plan comptable) d'après le fournisseur et le libellé.
const NATURES = [
  ["6135", /logiciel|saas|abonnement|licence|shopify|microsoft|google workspace|adobe|canva|notion|slack|zoom|hubspot|wix|ovh|hebergement/],
  ["612", /credit[- ]bail|leasing|\blld\b|\bloa\b/],
  ["613", /loyer|\bbail\b|\bsci\b|location|coworking|wework|garde[- ]meuble/],
  ["614", /charges locatives|copropriete|syndic/],
  ["615", /entretien|reparation|maintenance|nettoyage|menage|depannage/],
  ["616", /assurance|\baxa\b|maaf|macsf|allianz|\bmma\b|generali|rc pro|multirisque|decennale|\bpno\b|hiscox/],
  ["618", /formation|documentation|seminaire/],
  ["621", /interim|manpower|adecco|randstad|personnel exterieur/],
  ["622", /honoraire|expert[- ]comptable|comptab|avocat|notaire|juridique|commissaire/],
  ["623", /publicit|\bpub\b|marketing|google ads|meta ads|facebook|instagram|linkedin|campagne|flyer|impression|communication|salon/],
  ["624", /transport|livraison|chronopost|colissimo|\bdhl\b|\bups\b|fedex|frais de port|messagerie|coursier/],
  ["6061", /electricite|\bedf\b|engie|\bgaz\b|\beau\b|energie|carburant|essence|gazole|total ?energies/],
  ["625", /deplacement|sncf|train|avion|air france|hotel|uber|taxi|peage|parking|restaurant|repas|mission|reception/],
  ["626", /telephon|internet|orange|\bsfr\b|\bfree\b|bouygues|mobile|\bbox\b|affranchissement|timbre|la poste/],
  ["627", /frais bancaire|commission|banque|\bcb\b|sumup|stripe|paypal|agios/],
  ["635", /\bcfe\b|cvae|taxe fonciere|impot|taxe/],
  ["611", /sous[- ]trait|prestataire|freelance|externalis/],
  ["6064", /fourniture|papeterie|bureau/],
  ["6063", /petit equipement|outillage|materiel/],
  ["604", /achat|matiere|marchandise|approvisionnement|grossiste|metro|promocash|fournisseur principal/],
  ["628", /cotisation|adhesion|abonnement pro/],
];
const LIBELLES_NATURE = {
  "6135": "Logiciels et abonnements", "612": "Crédit-bail", "613": "Locations et loyers", "614": "Charges locatives", "615": "Entretien et réparations",
  "616": "Assurances", "618": "Documentation et formations", "621": "Personnel extérieur (intérim)", "622": "Honoraires", "623": "Publicité et communication",
  "624": "Transports et livraisons", "6061": "Énergie, eau, carburant", "625": "Déplacements et réceptions", "626": "Téléphone, internet, frais postaux",
  "627": "Frais bancaires", "635": "Impôts et taxes", "611": "Sous-traitance", "6064": "Fournitures de bureau", "6063": "Petit équipement",
  "604": "Achats et approvisionnements", "628": "Autres charges externes",
};
export function natureCharge(r) {
  const t = norm(`${r.fournisseur || ""} ${r.libelle || ""}`);
  for (const [code, re] of NATURES) if (re.test(t)) return code;
  return "628";
}
const compte = (code) => code.padEnd(6, "0");

// ── Traduction d'un mois d'imports simplifiés en mouvements de comptes
function moisDepuisImports(client, key, groupes) {
  const acc = new Map();
  const add = (code, l, d, cr) => {
    if (!d && !cr) return;
    const c = compte(code);
    const a = acc.get(c) || { k: "a", c, l, d: 0, cr: 0, ad: 0, ac: 0 };
    a.d += d; a.cr += cr;
    acc.set(c, a);
  };
  const cli = new Map(), fou = new Map();
  let collectee = 0, deductible = 0;
  for (const r of groupes.ventes_produits || []) {
    const v = lireVente(r);
    if (v.ca) add("706", "Ventes", 0, v.ca);
    if (v.cout) add("607", "Achats consommés", v.cout, 0);
    collectee += (v.ca * v.taux) / 100;
    deductible += (Math.max(0, v.cout) * v.taux) / 100;
    if (r.client && v.ca) { const x = cli.get(r.client) || { k: "c", n: r.client, l: r.client, v: 0 }; x.v += v.ca; cli.set(r.client, x); }
  }
  for (const r of groupes.autres_ventes || []) {
    const ca = n0(r.ca_ht ?? r.encaissement), marge = num(r.marge) ?? num(r.marge_ht) ?? ca - n0(r.cout);
    const nature = norm(r.nature);
    if (nature.includes("subvention")) add("74", r.libelle || "Subventions", 0, ca);
    else if (nature.includes("cession")) { add("775", "Produits de cession", 0, ca); add("675", "Valeur des éléments cédés", ca - marge, 0); }
    else { add("708", r.libelle || "Autres ventes", 0, ca); if (ca - marge) add("604", "Coûts des autres ventes", ca - marge, 0); }
    if (!nature.includes("subvention")) collectee += (ca * tauxTva(r)) / 100;
  }
  for (const r of groupes.charges || []) {
    const m = n0(r.montant_ht);
    const code = natureCharge(r);
    add(code, LIBELLES_NATURE[code], m, 0);
    if (r.tva_recuperable === "oui") deductible += (m * tauxTva(r)) / 100;
    const f = String(r.fournisseur || r.libelle || "").trim();
    if (f && m) { const x = fou.get(f) || { k: "f", n: f, l: f, v: 0 }; x.v += m; fou.set(f, x); }
  }
  for (const r of groupes.salaires || []) {
    add("641", "Salaires bruts", n0(r.salaire_brut), 0);
    add("645", "Cotisations patronales", n0(r.cotisations_patronales), 0);
  }
  const [y, m] = key.split("-").map(Number);
  add("681", "Amortissements des investissements", amortissements(client.investissements, m - 1, y), 0);
  const interets = (client.emprunts || []).reduce((s, e) => {
    if (!mensualiteEmprunt(e, m - 1, y)) return s;
    const k = echeancesPayees(e, m - 1, y);
    return s + capitalRestant(e, Math.max(0, k - 1)) * ((e.taux || 0) / 100);
  }, 0);
  add("661", "Intérêts d'emprunt (estimés)", Math.round(interets), 0);
  if (collectee) add("44571", "TVA collectée", 0, Math.round(collectee));
  if (deductible) add("44566", "TVA déductible", Math.round(deductible), 0);
  return {
    key, importedAt: null, source: "imports",
    meta: { k: "m", ex: `${y}-01-01`, fin: monthEnd(key), source: "imports" },
    acc: [...acc.values()], cli: [...cli.values()], fou: [...fou.values()],
  };
}

// ── Créances / dettes saisies dans les modèles CSV → même format que fec_tiers
const PAYE = /\b(paye|payee|regle|reglee|encaisse|encaissee|solde|soldee|lettre)\b/; // « A payer » reste dû
function tiersDepuisImports(rows, key, side) {
  const fin = monthEnd(key);
  const map = new Map();
  for (const r of rows) {
    if (PAYE.test(norm(r.statut))) continue;
    const nom = String((side === "C" ? r.client : r.fournisseur) || "Sans nom").trim();
    const m = n0(r.montant_ttc) || n0(r.montant_ht) + n0(r.tva);
    if (m <= 0) continue;
    const d = /^\d{4}-\d{2}-\d{2}/.test(r.date_emission || r.date_reception || "") ? (r.date_emission || r.date_reception).slice(0, 10) : fin;
    const age = Math.max(0, Math.round((Date.parse(fin) - Date.parse(d)) / 86400000));
    const t = map.get(nom) || { k: "t", s: side, n: nom, l: nom, solde: 0, items: [] };
    t.solde += m;
    t.items.push({ d, p: r.numero_facture || "", lib: r.statut || "", m, age, echeance: r.date_echeance || null, retard: num(r.jours_retard) });
    map.set(nom, t);
  }
  return [...map.values()].map((t) => ({ ...t, items: t.items.sort((a, b) => b.age - a.age) })).sort((a, b) => b.solde - a.solde);
}

const TYPES_DONNEES = ["ventes_produits", "autres_ventes", "charges", "salaires"];
const cache = new WeakMap();
// Index unifié : même forme que fecIndex (months, keys, tiers…), mois FEC prioritaires.
export function dataIndex(client) {
  const imports = client?.imports || [];
  const hit = cache.get(imports);
  if (hit && hit.inv === client.investissements && hit.emp === client.emprunts) return hit.idx;
  const fec = fecIndex(client);
  const parMois = new Map();
  for (const imp of imports) {
    if (!TYPES_DONNEES.includes(imp.type) || fec.months.has(imp.mois)) continue;
    const g = parMois.get(imp.mois) || {};
    (g[imp.type] = g[imp.type] || []).push(...(imp.rows || []));
    parMois.set(imp.mois, g);
  }
  const months = new Map();
  for (const [k, m] of fec.months) months.set(k, { ...m, source: "fec" });
  for (const [k, g] of parMois) months.set(k, moisDepuisImports(client, k, g));
  const keys = [...months.keys()].sort();
  // Soldes clients / fournisseurs : ceux de la comptabilité, sinon ceux des modèles CSV
  const tiers = [...fec.tiers];
  if (!tiers.length) {
    const snaps = new Map();
    for (const imp of imports) {
      if (imp.type !== "creances_clients" && imp.type !== "dettes_fournisseurs") continue;
      const s = snaps.get(imp.mois) || { key: imp.mois, meta: { fin: monthEnd(imp.mois), source: "imports" }, rows: [] };
      s.rows.push(...tiersDepuisImports(imp.rows || [], imp.mois, imp.type === "creances_clients" ? "C" : "F"));
      snaps.set(imp.mois, s);
    }
    tiers.push(...[...snaps.values()].sort((a, b) => (a.key < b.key ? -1 : 1)));
  }
  const idx = { months, keys, tiers, has: keys.length > 0, first: keys[0] || null, last: keys[keys.length - 1] || null, fec };
  cache.set(imports, { idx, inv: client.investissements, emp: client.emprunts });
  return idx;
}
export const sourceDuMois = (client, key) => dataIndex(client).months.get(key)?.source || null;

// ── Indicateurs d'un mois, mêmes clés que calcMonthKpis (NVMFinance.jsx)
export function monthKpis(client, mi, yr, { tauxReduit = true } = {}) {
  const idx = dataIndex(client);
  const key = monthKey(mi, yr);
  const m = idx.months.get(key);
  if (!m) return null;
  const pl = monthPL(idx, key);
  const sig = sigOf(pl);
  const ytd = ytdKeys(idx, key);
  const rcaiYtd = sigOf(plOver(idx, ytd)).rcai;
  const isAnnuel = estimateIS(rcaiYtd * 12 / Math.max(1, ytd.length), tauxReduit);
  return {
    ca: sig.ca, marge: sig.margeBrute, charges: pl.chargesExternes + pl.impotsTaxes, salaires: sig.personnel,
    ebe: sig.ebe, result: sig.rn, amort: pl.dotations, provIS: pl.is > 0 ? Math.round(pl.is) : Math.round(isAnnuel / 12),
    hasData: true, source: m.source, partial: (m.meta.fin || "") < monthEnd(key), sig, pl,
  };
}

// ── Détails analytiques lus directement dans les imports (quelle que soit la source des totaux)
export function produitsSur(client, keys) {
  const set = new Set(keys);
  const map = new Map(), canaux = new Map();
  for (const imp of client.imports || []) {
    if (imp.type !== "ventes_produits" || !set.has(imp.mois)) continue;
    for (const r of imp.rows || []) {
      const v = lireVente(r);
      if (!v.ca || r.source === "banque") continue;
      const nom = v.produit || v.ref || "Sans libellé";
      const x = map.get(nom) || { l: nom, ref: v.ref, ca: 0, marge: 0, qte: 0 };
      x.ca += v.ca; x.marge += v.marge; x.qte += v.qte || 0;
      map.set(nom, x);
      if (v.canal) canaux.set(v.canal, (canaux.get(v.canal) || 0) + v.ca);
    }
  }
  return { produits: [...map.values()].sort((a, b) => b.ca - a.ca), canaux: [...canaux].map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v) };
}
export function salariesSur(client, key) {
  return (client.imports || []).filter((i) => i.type === "salaires" && i.mois === key).flatMap((i) => i.rows || [])
    .filter((r) => r.source !== "banque")
    .map((r) => ({ nom: r.nom_prenom || "Salarié", poste: r.poste || r.qualification || "", statut: r.statut || "", brut: n0(r.salaire_brut), net: n0(r.salaire_net), cs: n0(r.cotisations_salariales), cp: n0(r.cotisations_patronales) }))
    .sort((a, b) => b.brut + b.cp - (a.brut + a.cp));
}
// Clients / fournisseurs ouverts à la fin du mois (FEC ou modèles CSV), par ancienneté.
export function tiersPour(client, key, side) {
  const idx = dataIndex(client);
  const snap = [...idx.tiers].reverse().find((t) => t.key <= key && t.rows.some((r) => r.s === side));
  // Une situation de plus de 2 mois ne décrit plus les factures en cours : on ne l'affiche pas.
  if (!snap || snap.key < shiftKey(key, -2)) return null;
  const list = snap.rows.filter((t) => t.s === side);
  const buckets = [
    { id: "b30", label: "Moins de 30 jours", max: 30, v: 0 },
    { id: "b60", label: "31 à 60 jours", max: 60, v: 0 },
    { id: "b90", label: "61 à 90 jours", max: 90, v: 0 },
    { id: "b90p", label: "Plus de 90 jours", max: Infinity, v: 0 },
  ];
  for (const t of list) for (const it of t.items) buckets.find((b) => it.age <= b.max).v += it.m;
  return { key: snap.key, date: snap.meta.fin, total: list.reduce((s, t) => s + t.solde, 0), list, buckets, source: snap.meta.source === "imports" ? "imports" : "fec" };
}
