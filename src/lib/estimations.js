// Emprunts et investissements saisis par le conseiller : mensualités, capital restant,
// intérêts, amortissements et valeur restante. Fonctions pures, utilisées par le
// moteur (src/lib/donnees.js) et les vues.

const moisIndex = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.getFullYear() * 12 + d.getMonth() : null;
};

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


// Capital d'emprunt remboursé pendant le mois (mi, yr) : sortie de trésorerie qui
// n'est pas une charge (seuls les intérêts le sont).
export const capitalRembourseMois = (e, mi, yr) => {
  if (!mensualiteEmprunt(e, mi, yr)) return 0;
  const k = echeancesPayees(e, mi, yr);
  return capitalRestant(e, Math.max(0, k - 1)) - capitalRestant(e, k);
};
export const capitalRembourse = (emprunts, mi, yr) => Math.round((emprunts || []).reduce((s, e) => s + capitalRembourseMois(e, mi, yr), 0));
