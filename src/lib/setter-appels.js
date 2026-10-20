// Suivi des appels des setters : résultats possibles, relances automatiques, ordre de la file
// et agenda. Fonctions pures, utilisées par la page /setter (et testables à part).
// Les heures sont celles du navigateur du setter (en France).

export const CALENDLY = "https://calendly.com/nvmfinance-pro/30min";
export const SITE = "https://www.nvm-finance.fr";

// Où en est le prospect (colonne setter_prospects.statut).
export const STATUTS_APPEL = {
  a_appeler: { label: "À appeler", court: "À appeler" },
  rappel: { label: "Rappel prévu", court: "Rappels" },
  pas_de_reponse: { label: "Pas de réponse", court: "Relances" },
  rdv: { label: "RDV posé", court: "RDV posés" },
  pas_interesse: { label: "Pas intéressé", court: "Pas intéressés" },
  pas_la_cible: { label: "Pas la cible", court: "Pas la cible" },
  faux_numero: { label: "Faux numéro", court: "Faux numéros" },
  injoignable: { label: "Injoignable", court: "Injoignables" },
  ne_plus_appeler: { label: "Ne plus appeler", court: "Ne plus appeler" },
};

// Résultat d'un appel (colonne setter_appels.resultat).
export const RESULTATS = {
  pas_de_reponse: "Pas de réponse",
  rappel: "Rappel daté",
  rdv: "RDV posé",
  pas_interesse: "Pas intéressé",
  pas_la_cible: "Pas la cible",
  faux_numero: "Faux numéro",
  ne_plus_appeler: "Ne plus m'appeler",
};

export const RAISONS_PAS_INTERESSE = [
  "Déjà bien accompagné",
  "Son comptable s'en occupe",
  "Pas le temps, pas la priorité",
  "Ne veut pas être démarché",
];

export const RAISONS_PAS_LA_CIBLE = [
  "Micro-entreprise / auto-entrepreneur",
  "Trop grosse structure ou groupe",
  "Activité arrêtée ou en vente",
  "Pas de dirigeant joignable ici (franchise, siège ailleurs)",
];

export const MAX_SANS_REPONSE = 3;

// Jours fériés en France (dates fixes, et celles qui suivent Pâques).
function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}
const feries = new Map();
function estFerie(d) {
  const annee = d.getFullYear();
  if (!feries.has(annee)) {
    const p = paques(annee), apres = n => { const x = new Date(p); x.setDate(x.getDate() + n); return `${x.getMonth() + 1}-${x.getDate()}`; };
    feries.set(annee, new Set(["1-1", "5-1", "5-8", "7-14", "8-15", "11-1", "11-11", "12-25", apres(1), apres(39), apres(50)]));
  }
  return feries.get(annee).has(`${d.getMonth() + 1}-${d.getDate()}`);
}
// Pas de relance ni de rappel proposé le week-end ou un jour férié.
const estWeekEnd = d => d.getDay() === 0 || d.getDay() === 6 || estFerie(d);
const debutJour = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// « Pas de réponse » : nouvel essai le jour ouvré suivant, à l'autre moment de la journée
// (appelé le matin → l'après-midi à 14 h ; appelé l'après-midi → le matin à 9 h 30).
// Trois appels sans réponse d'affilée : injoignable (appliqué par la base).
export function prochainEssai(depuis = new Date()) {
  const d = new Date(depuis);
  const leMatin = d.getHours() < 13;
  do d.setDate(d.getDate() + 1); while (estWeekEnd(d));
  if (leMatin) d.setHours(14, 0, 0, 0);
  else d.setHours(9, 30, 0, 0);
  return d;
}

// Raccourcis proposés pour un rappel daté (jours ouvrés).
export function raccourcisRappel(maintenant = new Date()) {
  const suivant = new Date(maintenant);
  do suivant.setDate(suivant.getDate() + 1); while (estWeekEnd(suivant));
  const nomJour = Math.round((debutJour(suivant) - debutJour(maintenant)) / 86400000) === 1
    ? "Demain" : suivant.toLocaleDateString("fr-FR", { weekday: "long" }).replace(/^./, c => c.toUpperCase());
  const a = (jour, h, m) => { const d = new Date(jour); d.setHours(h, m, 0, 0); return d; };
  const semaine = new Date(maintenant);
  semaine.setDate(semaine.getDate() + 7);
  while (estWeekEnd(semaine)) semaine.setDate(semaine.getDate() + 1);
  semaine.setMinutes(Math.round(semaine.getMinutes() / 15) * 15, 0, 0);
  return [
    { label: `${nomJour} matin`, date: a(suivant, 9, 30) },
    { label: `${nomJour} après-midi`, date: a(suivant, 14, 0) },
    { label: "Dans une semaine", date: semaine },
  ];
}

const due = (p, maintenant) => p.prochain_appel && new Date(p.prochain_appel) <= maintenant;
const parDate = (a, b) => new Date(a.prochain_appel) - new Date(b.prochain_appel);

// La file « prochain à appeler » : rappels arrivés à échéance, puis nouveaux qualifiés
// (dans l'ordre d'import), puis « pas de réponse » à retenter.
export function fileDAppels(prospects, maintenant = new Date()) {
  const qualifies = prospects.filter(p => p.verification === "qualifie");
  return [
    ...qualifies.filter(p => p.statut === "rappel" && due(p, maintenant)).sort(parDate),
    ...qualifies.filter(p => p.statut === "a_appeler").sort((a, b) => a.id - b.id),
    ...qualifies.filter(p => p.statut === "pas_de_reponse" && due(p, maintenant)).sort(parDate),
  ];
}


// Agenda : rappels, relances et RDV, groupés par jour. Ce qui est en retard est
// regroupé sous « En retard » (c'est déjà dans la file d'appels).
export function agenda(prospects, rdvs, maintenant = new Date()) {
  const parId = new Map(prospects.map(p => [p.id, p]));
  const items = [
    ...prospects
      .filter(p => p.verification === "qualifie" && (p.statut === "rappel" || p.statut === "pas_de_reponse") && p.prochain_appel)
      .map(p => ({ type: p.statut, date: new Date(p.prochain_appel), prospect: p })),
    ...rdvs
      .filter(r => parId.has(r.prospect_id) && new Date(r.rdv_le) >= debutJour(maintenant))
      .map(r => ({ type: "rdv", date: new Date(r.rdv_le), prospect: parId.get(r.prospect_id), rdv: r })),
  ].sort((a, b) => a.date - b.date);
  const aujourdhui = debutJour(maintenant);
  const groupes = [];
  for (const it of items) {
    const enRetard = it.type !== "rdv" && it.date < aujourdhui;
    const cle = enRetard ? "retard" : debutJour(it.date).toISOString();
    let g = groupes.find(x => x.cle === cle);
    if (!g) groupes.push(g = { cle, jour: enRetard ? null : debutJour(it.date), items: [] });
    g.items.push(it);
  }
  return groupes.sort((a, b) => (a.cle === "retard" ? -1 : b.cle === "retard" ? 1 : a.jour - b.jour));
}

// Recherche par nom, dirigeant, raison sociale ou numéro (quel que soit le format tapé).
export function correspond(p, recherche) {
  const q = String(recherche || "").trim().toLowerCase();
  if (!q) return true;
  const chiffres = q.replace(/\D/g, "");
  if (chiffres.length >= 4) {
    const tel = String(p.telephone || "").replace(/^\+33/, "0");
    if (tel.includes(chiffres.replace(/^33/, "0")) || tel.includes(chiffres)) return true;
  }
  const sansAccents = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const texte = sansAccents([p.nom, p.nom_maps, p.raison_sociale, p.dirigeant_prenom, p.dirigeant_nom, p.categorie].join(" "));
  return sansAccents(q).split(/\s+/).every(m => texte.includes(m));
}

export const nomDirigeant = p => [p.dirigeant_prenom, p.dirigeant_nom].filter(Boolean).join(" ");

// Lien Calendly pré-rempli avec le nom du dirigeant et son email.
export function lienCalendly(p, email) {
  const params = new URLSearchParams();
  const nom = nomDirigeant(p) || p.nom;
  if (nom) params.set("name", nom);
  if (email) params.set("email", email.trim());
  const qs = params.toString();
  return qs ? `${CALENDLY}?${qs}` : CALENDLY;
}

// Remplace les champs du script par ce qu'on sait. Ce qui reste inconnu reste entre crochets.
export function personnaliser(texte, { prenomDirigeant, prenomSetter }) {
  let t = String(texte);
  t = prenomDirigeant
    ? t.replace("[Prénom du dirigeant]", prenomDirigeant)
    : t.replace("Bonjour [Prénom du dirigeant], ", "Bonjour, ");
  if (prenomSetter) t = t.replace("[ton prénom]", prenomSetter);
  return t;
}

export const formaterQuand = d => {
  const date = new Date(d);
  const jour = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jour} à ${heure}`;
};

export const formaterJour = d => {
  const date = debutJour(d), auj = debutJour(new Date());
  const ecart = Math.round((date - auj) / 86400000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Demain";
  const t = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// Valeur d'un <input type="datetime-local"> (heure locale) ↔ Date.
export const versChampDate = d => {
  const x = new Date(d);
  const deux = n => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${deux(x.getMonth() + 1)}-${deux(x.getDate())}T${deux(x.getHours())}:${deux(x.getMinutes())}`;
};
