// Stock de leads prêts à sortir (migrations 041-042) : pour chaque métier conseillé, les
// entreprises d'un département déjà dans la cible, rangées en base et données aux setters par
// paquets, chaque lead à un seul setter. Le navigateur charge la liste d'un métier par lots
// (pages suivantes de la base officielle, API publique sans clé) et y ajoute le numéro quand une
// liste ouverte le publie : liste RGE de l'ADEME pour le bâtiment, fichier FINESS pour les
// pharmacies. Pour les autres métiers, le setter trouve le numéro lui-même.
import { chercherDansLaBase, cleGroupe, departementDe, lireSite } from "./setter-import";
import { EFFECTIFS_CIBLE, SECTEURS } from "./setter-secteurs";

export const LEADS_PAR_CLIC = 50;
// Au-delà (leads jamais appelés + numéros à trouver), le setter traite d'abord ce qu'il a :
// personne ne garde un gros paquet pour lui.
export const MAX_EN_ATTENTE = 100;
// Une liste complète est reprise du début au bout de ce délai (nouvelles entreprises, CA publiés).
export const REMPLIR_APRES_JOURS = 30;

// Les métiers du stock. numero : d'où vient le téléphone (sinon, à trouver par le setter).
// court : le libellé gardé sur le prospect (« Bâtiment RGE · Charente-Maritime »).
export const SECTEURS_STOCK = [
  { id: "btp_rge", label: "Bâtiment · rénovation énergétique", court: "Bâtiment RGE", filtre: "est_rge=true", numero: "rge" },
  { id: "pharmacies", label: "Pharmacies", court: "Pharmacies", naf: ["47.73Z"], numero: "finess" },
  ...SECTEURS.map(s => (s.id === "btp"
    // Les artisans RGE sont déjà dans « Bâtiment · rénovation énergétique », avec leur numéro.
    ? { id: s.id, label: "Bâtiment · autres artisans", court: "BTP", filtre: "section_activite_principale=F&est_rge=false" }
    : { id: s.id, label: s.label, court: s.label, section: s.section, naf: s.naf })),
];
export const IDS_SECTEURS_STOCK = SECTEURS_STOCK.map(s => s.id);

export const RE_DEPARTEMENT = /^(\d{2}|2A|2B|97\d)$/;

// Le département d'une zone choisie dans ChampZone (une ville ou un département).
export const departementDeLaZone = zone => (!zone ? null : zone.type === "departement" ? zone.code : departementDe(zone.code));

const RGE = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";

// Les qualifications RGE (« Pompe à chaleur : chauffage »…) résumées en quelques métiers.
const METIERS_RGE = [
  [/isolation/i, "isolation"],
  [/pompe|chaudi|po[êe]le|chauffe|chauffage|radiateur/i, "chauffage"],
  [/fen[êe]tre|volet|porte/i, "menuiseries"],
  [/solaire|photovolta/i, "solaire"],
  [/ventilation/i, "ventilation"],
  [/audit|[ée]tude/i, "études énergétiques"],
  [/architecte/i, "architecte"],
];
const metierRge = domaines => {
  const m = METIERS_RGE.filter(([re]) => domaines.some(d => re.test(d))).map(([, label]) => label);
  return `Bâtiment RGE${m.length ? ` · ${m.slice(0, 3).join(", ")}` : ""}`;
};

// Téléphone, e-mail, site et qualifications de chaque SIREN dans la liste RGE. Une entreprise a
// une ligne par qualification et par établissement : on préfère un établissement du département.
async function contactsRge(sirens, departement) {
  const prefixe = /^2[AB]$/.test(departement) ? "20" : departement;
  const paquets = [];
  for (let i = 0; i < sirens.length; i += 40) paquets.push(sirens.slice(i, i + 40));
  const contacts = new Map();
  for (let i = 0; i < paquets.length; i += 4) {
    const reponses = await Promise.all(paquets.slice(i, i + 4).map(async paquet => {
      const params = new URLSearchParams({
        qs: paquet.map(s => `siret:${s}*`).join(" OR "),
        select: "siret,telephone,email,site_internet,domaine,code_postal",
        size: "3000",
      });
      const rep = await fetch(`${RGE}?${params}`);
      if (!rep.ok) throw new Error("Liste RGE de l'ADEME indisponible, réessayez dans une minute.");
      return (await rep.json()).results || [];
    }));
    for (const l of reponses.flat()) {
      const siren = String(l.siret || "").slice(0, 9);
      const c = contacts.get(siren) || { domaines: [] };
      if (l.domaine) c.domaines.push(l.domaine);
      const ici = String(l.code_postal || "").startsWith(prefixe);
      if (l.telephone && (!c.telephone || (ici && !c.ici))) {
        Object.assign(c, { telephone: l.telephone, email: l.email || null, site_web: lireSite(l.site_internet), ici });
      }
      contacts.set(siren, c);
    }
  }
  return contacts;
}

// Numéros des pharmacies du département (fichier FINESS, lu par le serveur : 35 Mo).
const finess = new Map();
function contactsFiness(departement, jeton) {
  if (!finess.has(departement)) {
    finess.set(departement, (async () => {
      const rep = await fetch(`/api/setter/finess?departement=${departement}`, { headers: { Authorization: `Bearer ${await jeton()}` } });
      if (!rep.ok) throw new Error("Fichier des pharmacies indisponible, réessayez dans une minute.");
      return new Map(Object.entries((await rep.json()).numeros || {}).map(([siren, telephone]) => [siren, { telephone }]));
    })().catch(e => { finess.delete(departement); throw e; }));
  }
  return finess.get(departement);
}

// Un lot de la liste d'un métier dans un département : les pages suivantes de la base officielle
// à partir de la page « depuis » (entreprises dans la cible, une par groupe à la même adresse),
// avec le numéro quand une liste ouverte le donne. Renvoie { leads, page, fin } — page : la
// dernière page lue ; fin : la liste est complète.
const LOT = 40, PAGES_PAR_LOT = 4;
export async function preparerLot(secteur, departement, depuis, appeler, jeton) {
  const zone = { type: "departement", code: departement };
  const trouves = [], vus = new Set(), groupes = new Set();
  let page = depuis, encore = true;
  while (encore && trouves.length < LOT && page < depuis + PAGES_PAR_LOT) {
    const r = await chercherDansLaBase(secteur, zone, ++page, appeler, EFFECTIFS_CIBLE);
    encore = r.encore;
    for (const l of r.resultats) {
      if (vus.has(l.faits.siren) || groupes.has(cleGroupe(l))) continue;
      vus.add(l.faits.siren);
      groupes.add(cleGroupe(l));
      trouves.push(l);
    }
  }
  const contacts = secteur.numero === "rge" ? await contactsRge([...vus], departement)
    : secteur.numero === "finess" ? await contactsFiness(departement, jeton)
    : new Map();
  const leads = trouves.map(l => {
    const c = contacts.get(l.faits.siren) || {};
    return {
      faits: l.faits, telephone: c.telephone || null, email: c.email || null, site_web: c.site_web || null,
      metier: secteur.numero === "rge" ? metierRge(c.domaines || []) : secteur.numero === "finess" ? "Pharmacie" : secteur.label,
      nom: l.nom, commune: l.commune, adresse: l.adresse, latitude: l.latitude, longitude: l.longitude,
    };
  });
  return { leads, page, fin: !encore };
}
