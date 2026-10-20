// Import des prospects des setters : export Google Maps (Instant Data Scraper, .xlsx ou .csv)
// → lignes normalisées → entreprise retrouvée dans la base officielle → cible (ICP).
// Tout est en fonctions pures, utilisées par la page /setter (navigateur) et par la route
// /api/setter/import (serveur), qui refait le calcul de la cible elle-même.

// ─── Lecture du fichier ──────────────────────────────────────────────────────

// Un .xlsx est un zip : on lit son répertoire central et on décompresse les entrées voulues.
async function lireZip(buffer, noms) {
  const vue = new DataView(buffer);
  let fin = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("Fichier illisible : ce n'est pas un .xlsx valide.");
  const nb = vue.getUint16(fin + 10, true);
  let p = vue.getUint32(fin + 16, true);
  const octets = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8");
  const sortie = {};
  for (let k = 0; k < nb; k++) {
    if (vue.getUint32(p, true) !== 0x02014b50) break;
    const methode = vue.getUint16(p + 10, true);
    const taille = vue.getUint32(p + 20, true);
    const lNom = vue.getUint16(p + 28, true), lExtra = vue.getUint16(p + 30, true), lCom = vue.getUint16(p + 32, true);
    const local = vue.getUint32(p + 42, true);
    const nom = utf8.decode(octets.subarray(p + 46, p + 46 + lNom));
    p += 46 + lNom + lExtra + lCom;
    if (!noms(nom)) continue;
    const debut = local + 30 + vue.getUint16(local + 26, true) + vue.getUint16(local + 28, true);
    const brut = octets.subarray(debut, debut + taille);
    if (methode === 0) sortie[nom] = utf8.decode(brut);
    else if (methode === 8) {
      const flux = new Blob([brut]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      sortie[nom] = utf8.decode(await new Response(flux).arrayBuffer());
    }
  }
  return sortie;
}

const decoderXml = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Texte d'un nœud <si> ou <is> : concatène tous les <t>, y compris en texte enrichi (<r><t>…).
const texteXml = x => [...x.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decoderXml(m[1])).join("");

const indexColonne = ref => {
  const lettres = (ref.match(/^[A-Z]+/) || ["A"])[0];
  let n = 0;
  for (const c of lettres) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
};

async function lireXlsx(buffer) {
  const f = await lireZip(buffer, n => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(n));
  // Première feuille du classeur (pas forcément sheet1.xml).
  let feuille = "xl/worksheets/sheet1.xml";
  const rid = (f["xl/workbook.xml"] || "").match(/<sheet\b[^>]*\br:id="([^"]+)"/);
  if (rid) {
    const cible = (f["xl/_rels/workbook.xml.rels"] || "").match(new RegExp(`<Relationship\\b[^>]*Id="${rid[1]}"[^>]*Target="([^"]+)"`))
      || (f["xl/_rels/workbook.xml.rels"] || "").match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid[1]}"`));
    if (cible) feuille = "xl/" + cible[1].replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const xml = f[feuille] || Object.entries(f).find(([n]) => n.startsWith("xl/worksheets/"))?.[1];
  if (!xml) throw new Error("Aucune feuille trouvée dans ce fichier.");
  const partages = [...(f["xl/sharedStrings.xml"] || "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texteXml(m[1]));
  const lignes = [];
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const ligne = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], corps = c[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+)\d*"/) || [])[1];
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const v = (corps.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let val = "";
      if (type === "s") val = partages[+v] ?? "";
      else if (type === "inlineStr") val = texteXml(corps);
      else if (v != null) val = decoderXml(v);
      ligne[ref ? indexColonne(ref) : ligne.length] = val;
    }
    lignes.push(Array.from(ligne, x => (x == null ? "" : String(x).trim())));
  }
  return lignes;
}

function lireCsv(texte) {
  texte = texte.replace(/^﻿/, "");
  const premiere = texte.split(/\r?\n/, 1)[0];
  const sep = [",", ";", "\t"].map(s => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const lignes = [];
  let ligne = [], champ = "", guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const ch = texte[i];
    if (guillemets) {
      if (ch === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (ch === '"') guillemets = false;
      else champ += ch;
    } else if (ch === '"' && champ === "") guillemets = true;
    else if (ch === sep) { ligne.push(champ.trim()); champ = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ.trim()); lignes.push(ligne); ligne = []; champ = "";
    } else champ += ch;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ.trim()); lignes.push(ligne); }
  return lignes;
}

// Fichier (File/Blob avec un nom) → tableau de lignes de texte.
export async function lireTableau(fichier) {
  const buffer = await fichier.arrayBuffer();
  const octets = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (octets[0] === 0x50 && octets[1] === 0x4b) return lireXlsx(buffer);
  if (/\.xls$/i.test(fichier.name || "")) throw new Error("Ancien format .xls : téléchargez le fichier en .xlsx ou .csv.");
  let texte = new TextDecoder("utf-8").decode(buffer);
  if (texte.includes("�")) texte = new TextDecoder("windows-1252").decode(buffer);
  return lireCsv(texte);
}

// ─── Reconnaissance des colonnes par leur contenu ────────────────────────────

const RE_MAPS = /google\.[a-z.]+\/maps\/place\//i;
const RE_URL = /^(https?:\/\/|www\.)\S+$/i;
const RE_HORAIRES = /^·|\b(ouvert|ferm[ée]|ouvre|rouvre|24h)\b/i;

export function normaliserTelephone(valeur) {
  let d = String(valeur ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+33")) d = d.slice(3);
  else if (d.startsWith("0033")) d = d.slice(4);
  else if (/^33[1-9]\d{8}$/.test(d)) d = d.slice(2);
  if (/^0[1-9]\d{8}$/.test(d)) d = d.slice(1);
  if (!/^[1-9]\d{8}$/.test(d)) return null;
  return "+33" + d;
}

export function extraireTelephone(texte) {
  const direct = normaliserTelephone(texte);
  if (direct) return direct;
  const m = String(texte || "").match(/(?:\+33\s?\(?0?\)?\s?|0033\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/);
  return m ? normaliserTelephone(m[0]) : null;
}

export const formaterTelephone = e164 => {
  const d = "0" + String(e164 || "").replace(/^\+33/, "");
  return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, "$1 ") : String(e164 || "");
};

const nomDuLienMaps = url => {
  const m = String(url).match(/\/maps\/place\/([^/?]+)/);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); } catch { return ""; }
};

export const normaliserTexte = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

export function detecterColonnes(lignes) {
  const donnees = lignes.slice(1).filter(l => l.some(v => v));
  const nbCol = Math.max(0, ...lignes.map(l => l.length));
  const stats = [];
  for (let j = 0; j < nbCol; j++) {
    const vals = donnees.map(l => l[j] || "").filter(Boolean);
    const n = vals.length || 1;
    stats.push({
      j, vals,
      remplissage: vals.length / (donnees.length || 1),
      maps: vals.filter(v => RE_MAPS.test(v)).length / n,
      tel: vals.filter(v => normaliserTelephone(v) && v.replace(/\D/g, "").length <= 13).length / n,
      url: vals.filter(v => RE_URL.test(v)).length / n,
      horaires: vals.filter(v => RE_HORAIRES.test(v)).length / n,
      distinct: new Set(vals).size / n,
      longueur: vals.reduce((s, v) => s + v.length, 0) / n,
    });
  }
  const pris = new Set();
  const choisir = (filtre, tri) => {
    const c = stats.filter(s => !pris.has(s.j) && s.vals.length && filtre(s)).sort(tri)[0];
    if (!c) return -1;
    pris.add(c.j);
    return c.j;
  };
  const maps = choisir(s => s.maps >= 0.5, (a, b) => b.maps - a.maps);
  const telephone = choisir(s => s.tel >= 0.5, (a, b) => b.tel - a.tel);
  const site = choisir(s => s.url >= 0.5, (a, b) => b.vals.length - a.vals.length);
  const texte = s => s.url < 0.2 && s.tel < 0.2 && s.maps < 0.2 && s.horaires < 0.3;
  // Le nom : la colonne qui reprend le nom contenu dans le lien Maps, sinon le texte le plus varié.
  let nom = -1;
  if (maps >= 0) {
    const noms = donnees.map(l => normaliserTexte(nomDuLienMaps(l[maps] || "")));
    nom = choisir(s => texte(s) && donnees.filter((l, i) => noms[i] && normaliserTexte(l[s.j]) === noms[i]).length >= 0.5 * s.vals.length,
      (a, b) => b.vals.length - a.vals.length);
  }
  if (nom < 0) nom = choisir(s => texte(s) && s.remplissage >= 0.6, (a, b) => b.distinct - a.distinct || b.remplissage - a.remplissage);
  // La catégorie : peu de valeurs différentes, qui se répètent.
  const categorie = choisir(s => texte(s) && s.remplissage >= 0.5 && s.longueur < 60 && s.distinct < 0.8,
    (a, b) => a.distinct - b.distinct);
  return { maps, nom, categorie, telephone, site };
}

// ─── Normalisation d'une ligne ───────────────────────────────────────────────

export function lireGps(url) {
  const m = String(url || "").match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || String(url || "").match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

export function lireSite(valeur) {
  const v = String(valeur || "").trim();
  if (!RE_URL.test(v)) return null;
  if (/google\.[a-z.]+\/(aclk|maps|url)|googleadservices|doubleclick/i.test(v)) return null; // pub Google = pas de site
  return v.startsWith("www.") ? "https://" + v : v;
}

// Lignes du fichier → prospects normalisés + lignes écartées d'emblée (sans téléphone, en double).
export function preparerLignes(lignes) {
  const col = detecterColonnes(lignes);
  if (col.telephone < 0 && col.maps < 0) throw new Error("Impossible de reconnaître les colonnes : est-ce bien un export Google Maps ?");
  const prospects = [], ecartes = [], vus = new Set();
  lignes.forEach((l, i) => {
    if (!l.some(v => v)) return; // ligne vide
    const lien = col.maps >= 0 ? l[col.maps] || "" : "";
    const telBrut = col.telephone >= 0 ? l[col.telephone] || "" : "";
    if (i === 0 && !RE_MAPS.test(lien) && !normaliserTelephone(telBrut)) return; // en-têtes
    const nomMaps = (col.nom >= 0 ? l[col.nom] : "") || nomDuLienMaps(lien) || "";
    const telephone = normaliserTelephone(telBrut);
    const base = { ligne: i + 1, nom_maps: nomMaps, nom: nettoyerNom(nomMaps) };
    if (!telephone) return ecartes.push({ ...base, raison: "Pas de téléphone" });
    if (vus.has(telephone)) return ecartes.push({ ...base, raison: "En double dans le fichier" });
    vus.add(telephone);
    const gps = lireGps(lien);
    prospects.push({
      ...base,
      categorie: col.categorie >= 0 ? l[col.categorie] || null : null,
      telephone,
      site_web: col.site >= 0 ? lireSite(l[col.site]) : null,
      maps_url: RE_MAPS.test(lien) ? lien : null,
      latitude: gps?.lat ?? null,
      longitude: gps?.lng ?? null,
    });
  });
  return { colonnes: col, prospects, ecartes };
}

// ─── Nom affiché ─────────────────────────────────────────────────────────────

const echapperRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// « Nettoyage X - Bourg-en-Bresse » → « Nettoyage X ». Les communes à retirer viennent des
// établissements trouvés près du point Maps (base officielle), donc pas de liste à tenir à jour.
export function nettoyerNom(nom, communes = []) {
  let n = String(nom || "").split(/\s+\|\s+/)[0].trim();
  for (const c of communes) {
    const mots = normaliserTexte(c).split(" ").filter(Boolean);
    if (!mots.length) continue;
    // Tolère tirets, espaces, accents et « St » pour « Saint ».
    const motif = mots.map(m => (m === "saint" ? "(?:saint|st)" : m.split("").map(ch => `${echapperRe(ch)}[\\u0300-\\u036f]?`).join(""))).join("[\\s\\-’']+");
    const re = new RegExp(`(^|[\\s\\-–(,])${motif}(?=$|[\\s\\-–),])`, "gi");
    const sans = n.normalize("NFD").replace(re, "$1").normalize("NFC");
    if (normaliserTexte(sans).length >= 2) n = sans;
  }
  return n.replace(/\(\s*\)/g, "").replace(/(\s*[-–:]\s*){2,}/g, " - ").replace(/\s{2,}/g, " ").replace(/^[\s\-–:,]+|[\s\-–:,]+$/g, "").trim() || String(nom || "").trim();
}

// ─── Base officielle (recherche-entreprises.api.gouv.fr) ─────────────────────

export const API_ENTREPRISES = "https://recherche-entreprises.api.gouv.fr/search";

// L'API accepte au maximum 7 requêtes par seconde et par adresse IP : on en lance au plus 5,
// et on respecte l'en-tête Retry-After si elle répond 429.
export function creerLimiteur(parSeconde = 5) {
  let prochain = 0;
  return async function appeler(url) {
    for (let essai = 0; essai < 5; essai++) {
      const maintenant = Date.now();
      const attente = Math.max(0, prochain - maintenant);
      prochain = Math.max(prochain, maintenant) + 1000 / parSeconde;
      if (attente) await new Promise(r => setTimeout(r, attente));
      const rep = await fetch(url);
      if (rep.status === 429) {
        const pause = (Number(rep.headers.get("retry-after")) || 2) * 1000;
        prochain = Date.now() + pause;
        continue;
      }
      if (!rep.ok) throw Object.assign(new Error(`Base officielle indisponible (${rep.status})`), { statut: rep.status });
      return rep.json();
    }
    throw new Error("Base officielle saturée, réessayez dans une minute.");
  };
}

const distanceKm = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

export const departementDe = codeCommune => (String(codeCommune || "").startsWith("97") ? String(codeCommune).slice(0, 3) : String(codeCommune || "").slice(0, 2));

// Où se trouve le point Maps : département et communes alentour (2 km), d'après les établissements
// voisins de la base officielle. Mis en cache par carré d'environ 5 km : un export couvre souvent
// une seule ville, donc quelques appels pour tout le fichier.
export function zoneDuPoint(prospect, appeler, cache) {
  if (prospect.latitude == null) return Promise.resolve(null);
  const cle = `${Math.round(prospect.latitude / 0.05)}:${Math.round(prospect.longitude / 0.05)}`;
  if (!cache.has(cle)) {
    cache.set(cle, appeler(`${API_ENTREPRISES.replace("/search", "/near_point")}?lat=${prospect.latitude}&long=${prospect.longitude}&radius=2&per_page=25`)
      .then(rep => {
        const ets = (rep.results || []).flatMap(e => e.matching_etablissements || []);
        const compte = {};
        for (const et of ets) { const d = departementDe(et.commune); if (d) compte[d] = (compte[d] || 0) + 1; }
        const departement = Object.entries(compte).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        return { departement, communes: [...new Set(ets.map(et => et.libelle_commune).filter(Boolean))] };
      })
      .catch(() => null));
  }
  return cache.get(cle);
}

const MOTS_VIDES = new Set(("de du des la le les l d et a au aux en sur pour par the and sarl sas sasu eurl sa sci snc selarl scop " +
  "ets entreprise societe ste groupe agence cabinet rue avenue av bd boulevard place pl chemin route allee quai cours").split(" "));
const mots = s => normaliserTexte(s).split(" ").filter(m => m.length > 1 && !MOTS_VIDES.has(m));
// Même mot, ou pluriel / variante courte (« service » ~ « services ») ; pas « assu » ~ « association ».
const motsProches = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && Math.abs(a.length - b.length) <= 2 && (a.startsWith(b) || b.startsWith(a)));

// Retire du nom les mots de la catégorie Google (« Agence immobilière Laforêt » → « Laforêt ») :
// ils décrivent le métier, ils ne font en général pas partie de la raison sociale.
function sansMotsCategorie(nom, categorie) {
  const cat = mots(categorie).filter(m => m.length >= 4);
  if (!cat.length) return nom;
  return String(nom).split(/\s+/).filter(t => {
    const n = normaliserTexte(t);
    return !n || !cat.some(c => motsProches(n, c));
  }).join(" ").replace(/^[\s\-–:,&]+|[\s\-–:,&]+$/g, "").trim();
}

const RE_ADRESSE = /^(\d+\s*(bis|ter)?\s+)?(rue|avenue|av|bd|boulevard|place|pl|chemin|route|all[ée]e|quai|cours|impasse)\b/i;

// Les morceaux du nom Google : le nom entier, puis chaque partie séparée par « - », « | », « : »,
// des parenthèses… (sauf une adresse ou un simple métier comme « Agence immobilière »),
// chacun aussi sans les mots de la catégorie.
function morceauxDuNom(nom, categorie) {
  const parties = nom.split(/\s+[-–—:|/]\s+|\s*[()]\s*/).map(x => x.trim())
    .filter(x => mots(sansMotsCategorie(x, categorie)).length && !RE_ADRESSE.test(x));
  const v = [nom, sansMotsCategorie(nom, categorie)];
  for (const p of parties) if (p !== nom) v.push(p, sansMotsCategorie(p, categorie));
  return [...new Set(v.filter(x => mots(x).length))];
}

// Ressemblance entre un morceau du nom Google et un nom officiel : part des mots de chacun
// retrouvés dans l'autre (moyenne harmonique), de 0 à 1.
function ressemblance(a, b, ignore) {
  const colle = s => normaliserTexte(s).replace(/ /g, "");
  if (colle(a).length >= 5 && colle(a) === colle(b)) return 1; // même nom, espaces mis à part
  const ma = mots(a).filter(m => !ignore(m)), mb = mots(b).filter(m => !ignore(m));
  if (!ma.length || !mb.length) return 0;
  const ca = ma.filter(x => mb.some(y => motsProches(x, y))).length / ma.length;
  const cb = mb.filter(y => ma.some(x => motsProches(x, y))).length / mb.length;
  return ca && cb ? (2 * ca * cb) / (ca + cb) : 0;
}

const etablissementsDe = e => [e.siege, ...(e.matching_etablissements || [])].filter(Boolean);

// « NOM (SIGLE) » → les deux noms séparément.
const nomsDe = s => String(s || "").split(/\s*[()]\s*/).filter(Boolean);

function candidat(e, gps, morceaux, ignore) {
  // Distance au point Maps : établissements ouverts d'abord (un local fermé est souvent l'ancien occupant).
  const ets = etablissementsDe(e).filter(et => isFinite(parseFloat(et.latitude)) && isFinite(parseFloat(et.longitude)));
  const ouverts = ets.filter(et => et.etat_administratif === "A");
  let proche = null, dist = null;
  for (const et of gps ? (ouverts.length ? ouverts : ets) : []) {
    const d = distanceKm(gps, { lat: parseFloat(et.latitude), lng: parseFloat(et.longitude) });
    if (dist == null || d < dist) { dist = d; proche = et; }
  }
  proche = proche || e.siege || {};
  const noms = [e.nom_complet, e.nom_raison_sociale, e.sigle, proche.nom_commercial, ...(proche.liste_enseignes || []),
    e.siege?.nom_commercial, ...(e.siege?.liste_enseignes || [])].flatMap(nomsDe);
  let sim = 0, fort = false;
  for (const m of morceaux) for (const n of noms) {
    const r = ressemblance(m, n, ignore);
    if (r > sim) {
      const utiles = mots(m).filter(x => !ignore(x));
      sim = r; fort = utiles.length >= 2 || (utiles[0] || "").length >= 6;
    }
  }
  // Pour départager deux sociétés à la même adresse : part du nom Google retrouvée dans tous leurs noms.
  const tous = new Set(noms.flatMap(mots));
  const mg = mots(morceaux[0]).filter(m => !ignore(m));
  const couverture = mg.length ? mg.filter(m => [...tous].some(x => motsProches(m, x))).length / mg.length : 0;
  return { entreprise: e, etablissement: proche, distance: dist, sim, fort, couverture };
}

// Certitude : le nom colle ET un établissement est à l'adresse du point Maps (ou tout près).
// Plus loin que 300 m, il faut un nom distinctif (« fort » : 2 mots utiles ou un mot de 6 lettres).
const estCertain = c => c.distance != null && (
  (c.sim >= 0.6 && c.distance <= 0.3) || (c.sim >= 0.8 && c.fort && c.distance <= 3) || (c.sim >= 0.99 && c.fort && c.distance <= 10));

const actif = c => c.entreprise.etat_administratif !== "C";
const choisirCertain = candidats => candidats.filter(estCertain).sort((a, b) =>
  actif(b) - actif(a) || b.sim - a.sim || b.couverture - a.couverture || a.distance - b.distance)[0];
const URL_AUTOUR = API_ENTREPRISES.replace("/search", "/near_point");

// Retrouve l'entreprise d'une fiche Google Maps dans la base officielle :
// 1. par son nom, dans le département du point Maps, départagé par la distance ;
// 2. sinon par la position : les entreprises installées au point Maps (l'enseigne Google
//    diffère souvent de la raison sociale : « Laforêt » → MGI, « Allianz » → l'agent) ;
// 3. si la société trouvée est fermée, on cherche une société active de même activité à la
//    même adresse (c'est souvent le repreneur) avant de conclure « entreprise fermée ».
// Renvoie { certain, entreprise, etablissement, distance, sim } — entreprise absente si rien de plausible.
export async function rechercherEntreprise(prospect, appeler, zone) {
  const gps = prospect.latitude != null ? { lat: prospect.latitude, lng: prospect.longitude } : null;
  const nom = nettoyerNom(prospect.nom_maps || prospect.nom, zone?.communes || []);
  const morceaux = morceauxDuNom(nom, prospect.categorie);
  // Ignorés des deux côtés : la ville (« AZAE BOURG EN BRESSE ») et les mots du métier (« nettoyage »),
  // qui feraient ressembler deux entreprises différentes du même quartier.
  const villes = new Set((zone?.communes || []).flatMap(mots));
  const metier = mots(prospect.categorie).filter(m => m.length >= 4);
  const ignore = m => villes.has(m) || metier.some(c => motsProches(m, c));
  const evaluer = resultats => resultats.map(e => candidat(e, gps, morceaux, ignore));
  let meilleur = null;
  const retenir = candidats => {
    const plausible = candidats.filter(c => c.sim >= 0.6 && c.fort && (c.distance == null ? !gps : c.distance <= 50))
      .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || b.sim - a.sim)[0];
    if (plausible && (!meilleur || (plausible.distance ?? 1e9) < (meilleur.distance ?? 1e9))) meilleur = plausible;
  };

  // 3. Société fermée : repreneur actif au nom proche, ou autre société active de même activité sur place.
  const verifierActif = async (trouve, candidats) => {
    if (actif(trouve)) return { certain: true, ...trouve };
    const repreneur = candidats.find(c => actif(c) && c.sim >= 0.8 && (c.distance == null || c.distance <= 1));
    if (repreneur) return { certain: false, ...repreneur };
    if (!gps) return { certain: true, ...trouve };
    const naf = trouve.etablissement?.activite_principale || trouve.entreprise.activite_principale;
    const url = `${URL_AUTOUR}?lat=${gps.lat}&long=${gps.lng}&radius=0.1&per_page=25`;
    // Les vieilles sociétés ont parfois un code d'activité d'une ancienne nomenclature, que l'API refuse.
    const rep = await appeler(naf ? `${url}&activite_principale=${naf}` : url)
      .catch(e => (e.statut === 400 ? appeler(url) : Promise.reject(e)));
    const voisins = evaluer(rep.results || []).filter(actif);
    const successeur = choisirCertain(voisins);
    if (successeur) return { certain: true, ...successeur };
    const surPlace = voisins.filter(c => c.distance != null && c.distance <= 0.05).sort((a, b) => a.distance - b.distance)[0];
    if (surPlace) return { certain: false, ...surPlace };
    return { certain: true, ...trouve }; // personne d'autre à cette adresse : la société est bien fermée
  };

  const filtre = zone?.departement ? `&departement=${zone.departement}` : "";
  for (const q of morceaux.slice(0, 4)) {
    const rep = await appeler(`${API_ENTREPRISES}?q=${encodeURIComponent(q)}${filtre}&per_page=25&limite_matching_etablissements=20`);
    const candidats = evaluer(rep.results || []);
    const trouve = choisirCertain(candidats);
    if (trouve) return verifierActif(trouve, candidats);
    retenir(candidats);
  }

  if (gps) {
    const autour = [];
    for (let page = 1; page <= 4; page++) {
      const rep = await appeler(`${URL_AUTOUR}?lat=${gps.lat}&long=${gps.lng}&radius=0.05&per_page=25&page=${page}&limite_matching_etablissements=5`);
      autour.push(...(rep.results || []));
      if (page >= (rep.total_pages || 1)) break;
    }
    const candidats = evaluer(autour);
    const trouve = choisirCertain(candidats);
    if (trouve) return verifierActif(trouve, candidats);
    retenir(candidats);
  }
  return { certain: false, ...(meilleur || {}) };
}

// Une fiche trouvée dans un annuaire (Google Maps, TomTom…) est-elle bien cette entreprise ?
// Même exigence que pour l'import Google Maps : le nom colle ET la fiche est à l'adresse de
// l'établissement officiel (plus loin, seulement avec un nom distinctif).
// lead : { nom, raison_sociale, commune, latitude, longitude } ; fiche : { nom, latitude, longitude }.
export function ficheCorrespond(lead, fiche) {
  if (lead.latitude == null || fiche.latitude == null || !fiche.nom) return { ok: false, sim: 0, distance: null };
  const villes = new Set(mots(lead.commune));
  const ignore = m => villes.has(m);
  const noms = [lead.nom, lead.raison_sociale].flatMap(nomsDe);
  let sim = 0, fort = false;
  for (const m of morceauxDuNom(fiche.nom, "")) for (const n of noms) {
    const r = ressemblance(m, n, ignore);
    if (r > sim) {
      const utiles = mots(m).filter(x => !ignore(x));
      sim = r; fort = utiles.length >= 2 || (utiles[0] || "").length >= 6;
    }
  }
  const distance = distanceKm({ lat: lead.latitude, lng: lead.longitude }, { lat: fiche.latitude, lng: fiche.longitude });
  // L'annuaire ajoute souvent des mots au nom (« Vétérinaire de l'Arsenal Dr. Mighe », « Locations
  // Logis du Bourget ») : tous les mots d'un nom officiel distinctif retrouvés, à l'adresse, suffisent.
  const contenu = noms.some(n => {
    const m = mots(n).filter(x => !ignore(x));
    const f = mots(fiche.nom);
    return m.length >= 2 && m.every(x => f.some(y => motsProches(x, y)));
  });
  return { ok: estCertain({ sim, fort, distance }) || (contenu && distance <= 0.3), sim, distance };
}

// ─── Ce qu'on garde de l'entreprise et la cible ──────────────────────────────

const majuscules = s => String(s || "").toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

function dirigeantPrincipal(dirigeants = []) {
  const protege = v => /non[\s-]*diffusible/i.test(String(v || ""));
  const pp = dirigeants.filter(d => d.type_dirigeant === "personne physique" && (d.prenoms || d.nom) && !protege(d.prenoms) && !protege(d.nom));
  const d = pp.find(x => /g[ée]rant|pr[ée]sident|directeur g[ée]n[ée]ral/i.test(x.qualite || "")) || pp[0];
  if (!d) return { prenom: null, nom: null };
  return {
    prenom: majuscules(String(d.prenoms || "").split(/[\s,]+/)[0]) || null,
    nom: majuscules(String(d.nom || "").replace(/\s*\(.*\)\s*$/, "")) || null,
  };
}

// Dernier CA publié. Un CA à 0 accompagné d'un résultat signifie « non déclaré », pas « zéro ».
function dernierCa(finances) {
  const annees = Object.keys(finances || {}).filter(a => finances[a]?.ca > 0).sort();
  const a = annees[annees.length - 1];
  return a ? { ca: Math.round(finances[a].ca), ca_annee: +a } : { ca: null, ca_annee: null };
}

// Les faits officiels gardés sur le prospect (ce sont eux que le serveur juge).
export function faitsEntreprise(e) {
  const dir = dirigeantPrincipal(e.dirigeants);
  return {
    siren: e.siren,
    raison_sociale: e.nom_raison_sociale || e.nom_complet || null,
    nature_juridique: e.nature_juridique || null,
    date_creation: e.date_creation || null,
    etat_administratif: e.etat_administratif || null,
    ...dernierCa(e.finances),
    dirigeant_prenom: dir.prenom,
    dirigeant_nom: dir.nom,
    effectif: e.tranche_effectif_salarie || null,           // tranche INSEE (« 03 » = 6 à 9 salariés)
    categorie_entreprise: e.categorie_entreprise || null,   // PME, ETI ou GE (au niveau du groupe)
    activite: e.activite_principale || null,                // code NAF
  };
}

// Métiers à beaucoup de personnel, souvent à temps partiel, pour un CA modeste (nettoyage, aide à
// domicile, action sociale, intérim, sécurité) : 50 à 99 salariés y font couramment moins de 3 M€.
const METIERS_MAIN_D_OEUVRE = ["78", "80", "81", "87", "88", "97"];
// Seuil de « grande structure » : 100 salariés (tranche « 22 ») pour ces métiers, 50 (« 21 ») sinon.
const tropDeSalaries = (tranche, naf) => {
  if (!/^\d\d$/.test(String(tranche || ""))) return null;
  const seuil = METIERS_MAIN_D_OEUVRE.includes(String(naf || "").slice(0, 2)) ? 22 : 21;
  return Number(tranche) >= seuil ? (seuil === 22 ? 100 : 50) : null;
};

export const montantCourt = n => (n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€`);

// Cible de la page setter. Renvoie la raison du rejet, ou null si l'entreprise est dans la cible.
export function raisonHorsCible(f, aujourdhui = new Date()) {
  if (String(f.nature_juridique || "").startsWith("1")) return "Entrepreneur individuel / micro-entreprise";
  if (f.etat_administratif === "C") return "Entreprise fermée";
  if (f.date_creation) {
    const limite = new Date(aujourdhui); limite.setFullYear(limite.getFullYear() - 3);
    if (new Date(f.date_creation) > limite) {
      return `Créée il y a moins de 3 ans (${new Date(f.date_creation).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})`;
    }
  }
  if (f.ca != null && f.ca < 20000) return `CA ${f.ca_annee} : ${montantCourt(f.ca)} (sous 20 k€)`;
  if (f.ca != null && f.ca > 3000000) return `CA ${f.ca_annee} : ${montantCourt(f.ca)} (au-dessus de 3 M€)`;
  // CA non publié : on juge la taille. Une grande entreprise, ou la filiale d'un grand groupe (l'INSEE
  // classe l'entreprise au niveau de son groupe), a sa propre direction financière et un dirigeant
  // injoignable (MAIF, Harmonie Mutuelle…).
  if (f.ca == null && ["ETI", "GE"].includes(f.categorie_entreprise)) return "Grande entreprise ou filiale d'un grand groupe";
  const seuil = f.ca == null ? tropDeSalaries(f.effectif, f.activite) : null;
  if (seuil) return `Grande structure (${seuil} salariés et plus)`;
  return null;
}

// ─── Trouver des prospects directement dans la base officielle ───────────────

// Paris, Lyon et Marseille : les établissements portent le code de leur arrondissement.
const ARRONDISSEMENTS = { 75056: /^751\d\d$/, 69123: /^6938\d$/, 13055: /^132\d\d$/ };
const dansLaZone = (codeCommune, zone) => {
  const c = String(codeCommune || "");
  if (zone.type === "departement") return departementDe(c) === zone.code;
  return c === zone.code || !!ARRONDISSEMENTS[zone.code]?.test(c);
};

// Plusieurs sociétés d'un même groupe à la même adresse (« SOLEMBRA SUD », « SOLEMBRA NORD »…) :
// un seul interlocuteur, donc un seul prospect proposé.
export const cleGroupe = lead => `${normaliserTexte(lead.adresse || "")}|${mots(lead.faits.raison_sociale || lead.nom)[0] || lead.faits.siren}`;

// Les entreprises d'un métier dans une zone, déjà dans la cible : société active depuis 3 ans
// ou plus, et soit un CA publié entre 20 k€ et 3 M€, soit un CA non publié mais 1 à 49 salariés.
// secteur : { section }, { naf: [...] } ou { filtre } (critère brut de l'API, « est_rge=true ») ;
// zone : { type: "commune" | "departement", code }.
// Renvoie { resultats, encore } — encore : il reste des pages à charger.
export async function chercherDansLaBase(secteur, zone, page, appeler, effectifsCible) {
  const activite = secteur.filtre || (secteur.section ? `section_activite_principale=${secteur.section}` : `activite_principale=${secteur.naf.join(",")}`);
  const lieu = zone.type === "commune" ? `code_commune=${zone.code}` : `departement=${zone.code}`;
  const base = `${API_ENTREPRISES}?${activite}&${lieu}&etat_administratif=A&per_page=25&page=${page}&limite_matching_etablissements=3`;
  const [avecCa, pme] = await Promise.all([
    appeler(`${base}&ca_min=20000&ca_max=3000000`),
    appeler(`${base}&tranche_effectif_salarie=${effectifsCible.join(",")}`),
  ]);
  const vus = new Set(), resultats = [];
  for (const e of [...(avecCa.results || []), ...(pme.results || [])]) {
    if (vus.has(e.siren)) continue;
    vus.add(e.siren);
    const faits = faitsEntreprise(e);
    if (raisonHorsCible(faits)) continue; // entrepreneur individuel, moins de 3 ans, CA hors cible…
    if (faits.ca == null && !effectifsCible.includes(e.tranche_effectif_salarie)) continue;
    // L'établissement actif de la zone (l'enseigne connue localement) ; aucun : l'entreprise n'y est plus.
    const et = [...(e.matching_etablissements || []), e.siege].find(x => x && x.etat_administratif === "A" && dansLaZone(x.commune, zone));
    if (!et) continue;
    const enseigne = et.nom_commercial || (et.liste_enseignes || [])[0] || null;
    resultats.push({
      faits,
      nom: majuscules(enseigne || faits.raison_sociale || ""),
      commune: majuscules(et.libelle_commune || ""),
      adresse: et.adresse || null,
      latitude: isFinite(parseFloat(et.latitude)) ? parseFloat(et.latitude) : null,
      longitude: isFinite(parseFloat(et.longitude)) ? parseFloat(et.longitude) : null,
      effectif: e.tranche_effectif_salarie || null,
    });
  }
  // D'abord celles dont on connaît le prénom du dirigeant (l'accroche est personnalisée).
  resultats.sort((a, b) => !!b.faits.dirigeant_prenom - !!a.faits.dirigeant_prenom);
  const encore = page < Math.max(avecCa.total_pages || 0, pme.total_pages || 0);
  return { resultats, encore };
}
