// Estimations utilisées quand la comptabilité (FEC) n'est pas importée : emprunts,
// amortissements, paie et TVA calculés à partir des données saisies ou des imports
// simplifiés. Fonctions pures, partagées par toutes les vues de NVMFinance.jsx.

const moisIndex = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.getFullYear() * 12 + d.getMonth() : null;
};

// Répartition type d'un coût salarial (brut + cotisations patronales = 100) quand le
// détail des bulletins n'est pas importé : patronales ≈ 42 % du brut, salariales ≈ 22 %.
export const PAIE = { brut: 0.7, patronales: 0.3, net: 0.55, salariales: 0.15 };

// Mensualité d'un emprunt (taux mensuel en %, durée en mois), hors assurance.
export function mensualiteHorsAssurance(e) {
  const n = e.duree || 0, t = (e.taux || 0) / 100;
  if (n <= 0) return 0;
  return t > 0 ? (e.capital * t) / (1 - Math.pow(1 + t, -n)) : e.capital / n;
}
// Sortie de trésorerie du mois (assurance comprise) ; 0 avant le début ou après la fin.
export function mensualiteEmprunt(e, mi = null, yr = null) {
  if (mi != null) {
    const start = moisIndex(e.dateDebut);
    const cur = yr * 12 + mi;
    if (start != null && (cur < start || cur >= start + (e.duree || 0))) return 0;
  }
  return mensualiteHorsAssurance(e) + (e.assurance || 0);
}
export const chargeEmprunts = (emprunts, mi = null, yr = null) =>
  Math.round((emprunts || []).reduce((s, e) => s + mensualiteEmprunt(e, mi, yr), 0));
// Capital restant dû après `mois` échéances payées.
export function capitalRestant(e, mois) {
  const t = (e.taux || 0) / 100, m = mensualiteHorsAssurance(e);
  let r = e.capital;
  for (let i = 0; i < Math.min(mois, e.duree || 0); i++) r = Math.max(0, r - (m - r * t));
  return r;
}
// Nombre d'échéances déjà payées à la fin du mois (mi, yr).
export function echeancesPayees(e, mi, yr) {
  const start = moisIndex(e.dateDebut);
  if (start == null) return 0;
  return Math.max(0, Math.min(e.duree || 0, yr * 12 + mi - start + 1));
}

// Amortissement linéaire mensuel, à partir de la mise en service (sinon de l'achat).
const debutAmort = (inv) => moisIndex(inv.dateMEP) ?? moisIndex(inv.dateAchat);
export const amortMensuel = (inv) => (inv.montantHT || 0) / (inv.duree || 36);
// Mois déjà amortis à la fin du mois (mi, yr). Sans date, on considère le début de l'année.
export function moisAmortis(inv, mi, yr) {
  const n = inv.duree || 36;
  const start = debutAmort(inv) ?? yr * 12;
  return Math.max(0, Math.min(n, yr * 12 + mi - start + 1));
}
export function amortDuMois(inv, mi, yr) {
  const n = inv.duree || 36;
  const start = debutAmort(inv);
  if (start == null) return amortMensuel(inv);
  const cur = yr * 12 + mi;
  return cur >= start && cur < start + n ? amortMensuel(inv) : 0;
}
export const amortissements = (invs, mi, yr) => Math.round((invs || []).reduce((s, i) => s + amortDuMois(i, mi, yr), 0));
export const vnc = (inv, mi, yr) => Math.max(0, (inv.montantHT || 0) - amortMensuel(inv) * moisAmortis(inv, mi, yr));

// TVA d'un mois à partir des imports simplifiés : taux de chaque ligne (20 % par défaut).
const taux = (r) => (r.taux_tva != null && r.taux_tva !== "" && !isNaN(parseFloat(r.taux_tva)) ? parseFloat(r.taux_tva) : 20);
const n = (v) => parseFloat(v) || 0;
export function tvaImports(imports, key) {
  const rows = (type) => (imports || []).filter((i) => i.type === type && i.mois === key).flatMap((i) => i.rows || []);
  const ventes = rows("ventes_produits"), autres = rows("autres_ventes"), charges = rows("charges");
  const collectee = ventes.reduce((s, r) => s + (n(r.ca_ht) * taux(r)) / 100, 0) + autres.reduce((s, r) => s + (n(r.ca_ht) * taux(r)) / 100, 0);
  const deductible = charges.filter((r) => r.tva_recuperable === "oui").reduce((s, r) => s + (n(r.montant_ht) * taux(r)) / 100, 0)
    + ventes.reduce((s, r) => s + (n(r.cout_achat_ht) * taux(r)) / 100, 0);
  return { collectee: Math.round(collectee), deductible: Math.round(deductible), solde: Math.round(collectee - deductible), hasData: ventes.length + autres.length + charges.length > 0 };
}
