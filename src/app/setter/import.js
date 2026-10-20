// Déroulé complet de l'import d'un export Google Maps, côté navigateur :
// lecture du fichier → doublons (serveur) → base officielle → enregistrement (serveur).
// La base officielle est interrogée depuis le navigateur du setter : la limite de l'API
// (7 requêtes/s par adresse IP) s'applique alors à sa connexion, pas aux serveurs partagés
// de l'hébergeur, que l'API dit elle-même souvent saturés.
// Les prospects sont enregistrés par paquets au fil de la recherche : si la page se ferme en
// cours de route, ce qui est fait est gardé (et un nouvel import du fichier saute ces lignes).
import {
  lireTableau, preparerLignes, creerLimiteur, zoneDuPoint, rechercherEntreprise, faitsEntreprise, nettoyerNom,
} from "@/lib/setter-import";

const PAQUET = 20;

async function appelApi(chemin, jeton, corps) {
  const rep = await fetch(chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
    body: JSON.stringify(corps),
  });
  const json = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(json.error || `Erreur serveur (${rep.status})`);
  return json;
}

// Une ligne → ce qu'on envoie au serveur. Une panne de la base officielle n'arrête pas l'import :
// la ligne passe « à vérifier » et elle est comptée à part dans le rapport.
async function verifierLigne(p, appeler, zones) {
  let r = { certain: false }, zone = null, panne = false;
  try {
    zone = await zoneDuPoint(p, appeler, zones);
    r = await rechercherEntreprise(p, appeler, zone);
  } catch {
    panne = true;
  }
  const officiel = r.entreprise ? faitsEntreprise(r.entreprise) : null;
  return {
    panne,
    ligne: {
      ...p,
      nom: nettoyerNom(p.nom_maps, zone?.communes || []),
      certain: !!r.certain,
      entreprise: r.certain ? officiel : null,
      proposition: !r.certain && officiel ? {
        ...officiel,
        commune: r.etablissement?.libelle_commune || null,
        distance_km: r.distance != null ? Math.round(r.distance * 10) / 10 : null,
      } : null,
    },
  };
}

// jeton : fonction qui renvoie le jeton d'accès Supabase à jour.
// onProgres({ etape, fait, total }) : « lecture », « doublons », « recherche ».
// recherche : la recherche faite sur Google Maps (« plombier Bourg-en-Bresse »), pour les statistiques.
export async function importerFichier(fichier, jeton, onProgres = () => {}, recherche = "") {
  onProgres({ etape: "lecture" });
  const { prospects, ecartes } = preparerLignes(await lireTableau(fichier));
  if (!prospects.length && !ecartes.length) throw new Error("Aucune ligne trouvée dans ce fichier.");
  const rejetes = ecartes.map(e => ({ nom: e.nom, raison: e.raison }));

  // 1. Déjà dans l'outil (tous setters confondus) : inutile de les chercher.
  onProgres({ etape: "doublons" });
  const { existants } = await appelApi("/api/setter/doublons", jeton, { telephones: prospects.map(p => p.telephone) });
  const dejaLa = new Set(existants);
  const aChercher = [];
  for (const p of prospects) {
    if (dejaLa.has(p.telephone)) rejetes.push({ nom: p.nom, raison: "Déjà dans l'outil" });
    else aChercher.push(p);
  }

  // 2. Base officielle (4 recherches en parallèle, 5 requêtes par seconde au plus en tout),
  //    puis enregistrement du paquet : le serveur refait le calcul de la cible et écarte les
  //    doublons par SIREN.
  const appeler = creerLimiteur(5), zones = new Map();
  let qualifies = 0, aVerifier = 0, nonVerifies = 0, faits = 0, nouveaux = 0;

  // Recherche non notée par le setter : on la déduit du fichier (métier le plus fréquent + ville).
  if (!recherche.trim() && aChercher.length) {
    const compte = {};
    for (const p of aChercher) if (p.categorie) compte[p.categorie] = (compte[p.categorie] || 0) + 1;
    const metier = Object.entries(compte).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const avecGps = aChercher.find(p => p.latitude != null);
    const zone = avecGps ? await zoneDuPoint(avecGps, appeler, zones) : null;
    const petits = new Set(["en", "de", "du", "des", "la", "le", "les", "lès", "sur", "sous", "et", "aux"]);
    const ville = (zone?.communes?.[0] || "").toLowerCase().split(/([\s-])/)
      .map((m, i) => (i && petits.has(m)) || /[\s-]/.test(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)).join("");
    recherche = [metier, ville].filter(Boolean).join(" · ");
  }
  onProgres({ etape: "recherche", fait: 0, total: aChercher.length });
  for (let debut = 0; debut < aChercher.length; debut += PAQUET) {
    const paquet = aChercher.slice(debut, debut + PAQUET);
    const verifies = new Array(paquet.length);
    let suivant = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (suivant < paquet.length) {
        const i = suivant++;
        verifies[i] = await verifierLigne(paquet[i], appeler, zones);
        onProgres({ etape: "recherche", fait: ++faits, total: aChercher.length });
      }
    }));
    const lot = verifies.map(v => ({ ...v.ligne, source: "maps", recherche: recherche.trim() || null }));
    const { resultats } = await appelApi("/api/setter/import", jeton, { prospects: lot });
    resultats.forEach((r, k) => {
      if (r.telephone && r.statut !== "doublon") nouveaux++; // enregistré dans l'outil, dans la cible ou non
      if (r.statut === "qualifie") qualifies++;
      else if (r.statut === "a_verifier") { aVerifier++; if (verifies[k].panne) nonVerifies++; }
      else rejetes.push({ nom: lot[k].nom, raison: r.raison || "Rejeté" });
    });
  }
  const doublons = rejetes.filter(r => r.raison === "Déjà dans l'outil").length;
  if (recherche.trim()) {
    try {
      await appelApi("/api/setter/recherches", jeton, {
        recherche, lignes: prospects.length + ecartes.length, nouveaux, qualifies, a_verifier: aVerifier, doublons,
      });
    } catch { /* l'historique est un plus : un échec n'annule pas l'import */ }
  }
  return { fichier: fichier.name, recherche, qualifies, aVerifier, nonVerifies, rejetes };
}
