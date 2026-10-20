// Où chercher des prospects : les métiers conseillés aux setters (mêmes exemples que la page
// /espace-setter), avec leurs codes d'activité (NAF) pour la base officielle et les mots à
// taper dans Google Maps. Jamais un mot qui est aussi un nom de ville : « maçon » est lu comme
// Mâcon et Google Maps calcule un itinéraire (« maçon La Rochelle » → Mâcon - La Rochelle).

export const SECTEURS = [
  { id: "btp", label: "BTP", section: "F", maps: ["maçonnerie", "plombier", "électricien", "couvreur", "menuisier", "peintre en bâtiment", "chauffagiste"] },
  { id: "restaurants", label: "Restaurants", naf: ["56.10A", "56.10C", "56.30Z"], maps: ["restaurant", "pizzeria", "brasserie"] },
  { id: "transport", label: "Transport et logistique", naf: ["49.41A", "49.41B", "49.42Z", "52.29A", "52.10B"], maps: ["transporteur", "déménageur", "société de transport"] },
  { id: "garages", label: "Garages automobiles", naf: ["45.20A", "45.20B", "45.11Z", "45.32Z"], maps: ["garage automobile", "carrosserie"] },
  { id: "conciergeries", label: "Conciergeries", naf: ["68.32A", "55.20Z"], maps: ["conciergerie"] },
  { id: "commerces", label: "Commerces avec stock", naf: ["10.71C", "10.71D", "47.22Z", "47.24Z", "47.25Z", "47.29Z"], maps: ["boulangerie", "boucherie", "caviste", "épicerie fine"] },
  { id: "hotels", label: "Hôtels indépendants", naf: ["55.10Z"], maps: ["hôtel"] },
  { id: "nettoyage", label: "Nettoyage et services", naf: ["81.21Z", "81.22Z", "81.29B", "81.30Z"], maps: ["entreprise de nettoyage", "paysagiste"] },
  { id: "sante", label: "Cabinets dentaires et vétérinaires", naf: ["86.23Z", "75.00Z"], maps: ["cabinet dentaire", "vétérinaire"] },
];

// Tranches d'effectif salarié de la base officielle.
export const EFFECTIFS = {
  "00": "0 salarié", "01": "1 ou 2 salariés", "02": "3 à 5 salariés", "03": "6 à 9 salariés", "11": "10 à 19 salariés",
  "12": "20 à 49 salariés", "21": "50 à 99 salariés", "22": "100 à 199 salariés", "31": "200 à 249 salariés",
  "32": "250 à 499 salariés", "41": "500 à 999 salariés", "42": "1 000 à 1 999 salariés", "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés", "53": "10 000 salariés et plus", "NN": "sans salarié",
};
// La cible quand le CA n'est pas publié : une vraie PME, 1 à 49 salariés.
export const EFFECTIFS_CIBLE = ["01", "02", "03", "11", "12"];

export const lienMaps = recherche => `https://www.google.com/maps/search/${encodeURIComponent(recherche)}`;
// La fiche Google Maps de l'entreprise à son adresse exacte : le numéro s'affiche directement.
export const lienMapsEntreprise = (nom, adresse) => `https://www.google.com/maps/search/${encodeURIComponent(`${nom} ${adresse || ""}`.trim())}`;
export const lienRechercheNumero = (nom, commune) => `https://www.google.com/search?q=${encodeURIComponent(`${nom} ${commune || ""} téléphone`.trim())}`;

// Une recherche, sous la forme qui sert à reconnaître qu'elle a déjà été faite.
export const cleRecherche = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// Une recherche Google Maps déjà faite est reproposée après ce délai : de nouvelles entreprises
// apparaissent, et celles qui avaient moins de 3 ans entrent dans la cible.
export const REFAIRE_APRES_JOURS = 90;

// Nombre de recherches conseillées par ville (tous métiers confondus).
export const NB_RECHERCHES_PAR_VILLE = SECTEURS.reduce((n, s) => n + s.maps.length, 0);

const GEO = "https://geo.api.gouv.fr";
const distanceKm = ([lon1, lat1], [lon2, lat2]) => {
  const r = Math.PI / 180, a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

// Les villes où lancer les recherches Google Maps. Une recherche Maps ne renvoie qu'une centaine
// de résultats autour d'une ville : pour couvrir une zone, on cherche ville par ville. On ne garde
// que des villes de 2 000 habitants ou plus, à 8 km au moins les unes des autres (sinon leurs
// recherches se recouvrent et ne donnent que des doublons).
// Ville choisie : elle d'abord, puis celles de son département, des plus proches aux plus éloignées.
// Département : ses villes, des plus peuplées aux moins peuplées.
const ECART_KM = 8;
export async function villesDeLaZone(zone, max = 15) {
  if (!zone) return [];
  const json = url => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json(); });
  try {
    let depart = null, candidates;
    if (zone.type === "commune") {
      depart = await json(`${GEO}/communes/${zone.code}?fields=nom,code,centre,codeDepartement`);
      const toutes = await json(`${GEO}/departements/${depart.codeDepartement}/communes?fields=nom,code,centre,population`);
      candidates = toutes
        .filter(v => v.code !== depart.code && v.population >= 2000 && v.centre && depart.centre)
        .map(v => ({ ...v, km: distanceKm(depart.centre.coordinates, v.centre.coordinates) }))
        .sort((a, b) => a.km - b.km);
    } else {
      const toutes = await json(`${GEO}/departements/${zone.code}/communes?fields=nom,code,centre,population`);
      candidates = toutes.filter(v => v.population >= 2000 && v.centre).sort((a, b) => b.population - a.population);
    }
    const gardees = depart ? [depart] : [];
    for (const v of candidates) {
      if (gardees.length >= max) break;
      if (gardees.every(g => !g.centre || distanceKm(g.centre.coordinates, v.centre.coordinates) >= ECART_KM)) gardees.push(v);
    }
    return gardees.map(v => ({ code: v.code, nom: v.nom, km: depart ? Math.round(v.km || 0) : null }));
  } catch {
    return zone.type === "commune" ? [{ code: zone.code, nom: zone.nom, km: 0 }] : [];
  }
}

// Le secteur d'une recherche Google Maps déjà faite (« plombier Bourg-en-Bresse » → BTP).
export function secteurDe(recherche) {
  const r = String(recherche || "").toLowerCase();
  return SECTEURS.find(s => s.maps.some(m => r.startsWith(m.toLowerCase())))?.id || null;
}
