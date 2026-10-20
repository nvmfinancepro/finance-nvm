// Commissions des setters (20 %, page /espace-setter) et statistiques par setter.
// Fonctions pures, partagées par la page « Mes gains » du setter et l'espace admin.

export const FORMULES = {
  dashboard: { label: "Tableau de bord gratuit", court: "Tableau de bord", prix: "Gratuit" },
  mensuel: { label: "Pilotage mensuel", court: "Pilotage mensuel", prix: "490 € HT/mois", parMois: 98 },
  audit: { label: "Audit one-shot", court: "Audit", prix: "3 000 € HT", unique: 600 },
};

export const ISSUES = {
  en_attente: "En attente",
  signe: "Signé",
  perdu: "Perdu",
};

// « 2026-10 » pour une date (chaîne AAAA-MM-JJ ou Date).
export const moisDe = d => (typeof d === "string" ? d.slice(0, 7) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
export const moisCourant = () => moisDe(new Date());
const moisSuivant = m => { const [a, n] = m.split("-").map(Number); return n === 12 ? `${a + 1}-01` : `${a}-${String(n + 1).padStart(2, "0")}`; };
export const libelleMois = m => {
  const [a, n] = m.split("-").map(Number);
  const t = new Date(a, n - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const euros = n => `${Math.round(n).toLocaleString("fr-FR")} €`;

// Les commissions d'un RDV signé, mois par mois, jusqu'au mois « jusqua » inclus.
// Pilotage mensuel : chaque mois civil où le client est actif, du mois de signature au mois du
// départ inclus (le client était actif ce mois-là). Audit : une fois, le mois de signature.
export function commissionsDuRdv(rdv, jusqua = moisCourant()) {
  if (rdv.issue !== "signe" || !rdv.signe_le) return [];
  const f = FORMULES[rdv.formule];
  if (!f) return [];
  const debut = moisDe(rdv.signe_le);
  if (f.unique) return debut <= jusqua ? [{ mois: debut, montant: f.unique, rdv }] : [];
  if (!f.parMois) return [];
  const fin = rdv.parti_le && moisDe(rdv.parti_le) < jusqua ? moisDe(rdv.parti_le) : jusqua;
  const lignes = [];
  for (let m = debut; m <= fin; m = moisSuivant(m)) lignes.push({ mois: m, montant: f.parMois, rdv });
  return lignes;
}

// Ce que représente une ligne de commission, en clair.
export function detailLigne(l) {
  const f = FORMULES[l.rdv.formule];
  if (f?.unique) return "versement unique (mois de signature)";
  if (f?.parMois) {
    const [a1, m1] = moisDe(l.rdv.signe_le).split("-").map(Number), [a2, m2] = l.mois.split("-").map(Number);
    const n = (a2 - a1) * 12 + (m2 - m1) + 1;
    return `${n === 1 ? "1er" : `${n}e`} mois · ${f.parMois} €/mois`;
  }
  return "";
}

// Total d'un mois, séparé entre pilotage mensuel (récurrent) et audits (versement unique).
export const repartition = lignes => ({
  mensuel: lignes.filter(l => FORMULES[l.rdv.formule]?.parMois).reduce((t, l) => t + l.montant, 0),
  unique: lignes.filter(l => FORMULES[l.rdv.formule]?.unique).reduce((t, l) => t + l.montant, 0),
});

// Toutes les commissions, regroupées par mois (du plus récent au plus ancien).
export function historique(rdvs, jusqua = moisCourant()) {
  const parMois = new Map();
  for (const r of rdvs) for (const l of commissionsDuRdv(r, jusqua)) {
    if (!parMois.has(l.mois)) parMois.set(l.mois, { mois: l.mois, total: 0, lignes: [] });
    const m = parMois.get(l.mois);
    m.total += l.montant;
    m.lignes.push(l);
  }
  return [...parMois.values()].sort((a, b) => (a.mois < b.mois ? 1 : -1));
}

// Clients qui rapportent encore chaque mois (pilotage mensuel signé, pas parti).
export const clientsActifs = rdvs => rdvs.filter(r => r.issue === "signe" && r.formule === "mensuel" && (!r.parti_le || moisDe(r.parti_le) >= moisCourant()));

// Appel « décroché » : tous les résultats sauf « pas de réponse » et « faux numéro ».
export const estDecroche = a => a.resultat !== "pas_de_reponse" && a.resultat !== "faux_numero";

// Statistiques d'un setter sur une période [depuis, avant[ (dates ISO, null = sans limite).
export function statsSetter(appels, rdvs, depuis = null, avant = null) {
  const dansPeriode = d => !!d && (!depuis || d >= depuis) && (!avant || d < avant);
  const a = appels.filter(x => dansPeriode(x.created_at));
  const r = rdvs.filter(x => dansPeriode(x.created_at));
  const decroches = a.filter(estDecroche).length;
  const signes = rdvs.filter(x => x.issue === "signe" && dansPeriode(x.signe_le)).length;
  return {
    appels: a.length,
    decroches,
    rdv: r.length,
    signes,
    tauxRdv: decroches ? r.length / decroches : null,       // RDV posés / appels décrochés
    tauxSignature: r.length ? signes / r.length : null,     // clients signés / RDV posés
  };
}

export const pourcent = t => (t == null ? "—" : `${Math.round(100 * t)} %`);

// Les périodes proposées pour les statistiques.
export function periodes(maintenant = new Date()) {
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const iso = d => d.toISOString();
  return {
    mois: { label: "Ce mois-ci", depuis: iso(debutMois), avant: null },
    precedent: { label: "Mois dernier", depuis: iso(debutMoisPrec), avant: iso(debutMois) },
    tout: { label: "Depuis le début", depuis: null, avant: null },
  };
}
