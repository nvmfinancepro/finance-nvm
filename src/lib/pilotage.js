// Moteur de contrôle de gestion à partir de la comptabilité importée (FEC).
// Les imports « fec » stockent, mois par mois, les mouvements de chaque compte
// (src/lib/fec.js). Ce module en tire le compte de résultat par grands postes,
// les soldes intermédiaires de gestion, le bilan à n'importe quelle fin de mois,
// le BFR, la trésorerie réelle et les ratios de pilotage.
// Tout est pur (aucun accès réseau) : ce sont des lectures de client.imports.

export const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export const monthKey = (mi, yr) => `${yr}-${String(mi + 1).padStart(2, "0")}`;
export const shiftKey = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
export const monthEnd = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const keyLabel = (key, long = true) => {
  const [y, m] = key.split("-").map(Number);
  return `${(long ? MOIS_LONGS : MOIS_COURTS)[m - 1]} ${y}`;
};

// ── Plan comptable : libellés lisibles pour un dirigeant (préfixe le plus long).
const PCG = {
  "10": "Capital et réserves", "101": "Capital social", "104": "Primes d'émission", "106": "Réserves", "108": "Compte de l'exploitant",
  "11": "Report à nouveau", "12": "Résultat de l'exercice précédent", "13": "Subventions d'investissement", "14": "Provisions réglementées",
  "15": "Provisions pour risques et charges", "16": "Emprunts", "164": "Emprunts bancaires", "165": "Dépôts reçus", "168": "Autres emprunts", "1688": "Intérêts courus sur emprunts", "17": "Dettes rattachées à des participations",
  "20": "Immobilisations incorporelles", "205": "Logiciels et licences", "206": "Droit au bail", "207": "Fonds commercial",
  "21": "Immobilisations corporelles", "211": "Terrains", "213": "Constructions", "215": "Matériel et outillage", "218": "Autres immobilisations corporelles",
  "2181": "Agencements et installations", "2182": "Véhicules", "2183": "Matériel informatique et de bureau", "2184": "Mobilier",
  "23": "Immobilisations en cours", "26": "Participations", "27": "Immobilisations financières", "275": "Dépôts et cautionnements versés",
  "28": "Amortissements des immobilisations", "29": "Dépréciations des immobilisations",
  "31": "Stock de matières premières", "32": "Stock d'autres approvisionnements", "33": "En-cours de production", "35": "Stock de produits", "37": "Stock de marchandises", "39": "Dépréciations des stocks",
  "401": "Fournisseurs", "403": "Effets à payer", "404": "Fournisseurs d'immobilisations", "408": "Factures fournisseurs non parvenues", "409": "Avances versées aux fournisseurs",
  "411": "Clients", "413": "Effets à recevoir", "416": "Clients douteux", "418": "Factures clients à établir", "419": "Avances reçues des clients",
  "42": "Personnel", "421": "Salaires à payer", "425": "Avances au personnel", "428": "Charges de personnel à payer",
  "43": "Organismes sociaux", "431": "URSSAF", "437": "Autres organismes sociaux", "438": "Charges sociales à payer",
  "44": "État", "444": "Impôt sur les sociétés", "445": "TVA", "4455": "TVA à payer", "4456": "TVA déductible", "44567": "Crédit de TVA", "4457": "TVA collectée", "447": "Autres impôts et taxes",
  "455": "Comptes courants d'associés", "46": "Débiteurs et créditeurs divers", "47": "Comptes d'attente", "486": "Charges constatées d'avance", "487": "Produits constatés d'avance",
  "491": "Dépréciation des comptes clients",
  "50": "Placements de trésorerie", "512": "Banque", "514": "Chèques postaux", "517": "Autres organismes financiers", "519": "Concours bancaires courants", "53": "Caisse", "58": "Virements internes",
  "601": "Achats de matières premières", "602": "Achats d'approvisionnements", "603": "Variation des stocks", "6037": "Variation du stock de marchandises",
  "604": "Sous-traitance et prestations achetées", "605": "Achats de matériel et travaux", "606": "Achats non stockés (énergie, fournitures…)", "6061": "Eau, énergie, carburant", "6063": "Petit équipement", "6064": "Fournitures administratives",
  "607": "Achats de marchandises", "608": "Frais accessoires d'achat", "609": "Rabais obtenus sur achats",
  "611": "Sous-traitance générale", "612": "Crédit-bail", "613": "Locations et loyers", "6135": "Logiciels et locations de matériel", "614": "Charges locatives", "615": "Entretien et réparations", "616": "Assurances", "617": "Études et recherches", "618": "Documentation et formations",
  "621": "Personnel extérieur (intérim)", "622": "Honoraires (expert-comptable, avocat…)", "623": "Publicité et communication", "624": "Transports", "625": "Déplacements, missions et réceptions", "626": "Frais postaux et télécoms", "627": "Frais bancaires", "628": "Cotisations et frais divers",
  "63": "Impôts et taxes", "631": "Taxes sur les salaires", "633": "Taxes sur les salaires (formation…)", "635": "Impôts locaux (CFE, taxe foncière…)", "637": "Autres impôts et taxes",
  "641": "Salaires du personnel", "644": "Rémunération du dirigeant", "645": "Charges sociales patronales", "646": "Cotisations sociales du dirigeant", "647": "Autres charges sociales", "648": "Autres charges de personnel",
  "651": "Redevances et licences", "654": "Créances clients perdues", "658": "Charges diverses de gestion",
  "661": "Intérêts des emprunts", "665": "Escomptes accordés", "666": "Pertes de change", "668": "Autres charges financières",
  "671": "Charges exceptionnelles de gestion", "675": "Valeur des immobilisations cédées", "678": "Autres charges exceptionnelles",
  "681": "Dotations aux amortissements et provisions", "686": "Dotations financières", "687": "Dotations exceptionnelles",
  "691": "Participation des salariés", "695": "Impôt sur les sociétés",
  "701": "Ventes de produits finis", "702": "Ventes de produits intermédiaires", "703": "Ventes de produits résiduels", "704": "Travaux", "705": "Études", "706": "Prestations de services", "707": "Ventes de marchandises", "708": "Produits des activités annexes", "709": "Rabais accordés",
  "71": "Production stockée", "72": "Production immobilisée", "74": "Subventions d'exploitation", "75": "Autres produits de gestion",
  "76": "Produits financiers", "77": "Produits exceptionnels", "775": "Produits de cession d'immobilisations", "777": "Quote-part des subventions d'investissement",
  "78": "Reprises sur amortissements et provisions", "79": "Transferts de charges",
};
export function pcgLabel(compte) {
  for (let n = Math.min(compte.length, 5); n >= 2; n--) {
    const l = PCG[compte.slice(0, n)];
    if (l) return l;
  }
  return "";
}
// Racine de regroupement lisible : 4 chiffres quand le plan comptable la nomme (6061, 6135…), sinon 3.
export function pcgRacine(compte) {
  for (const n of [4, 3]) if (PCG[compte.slice(0, n)]) return compte.slice(0, n);
  return compte.slice(0, 3);
}
// Libellé du fichier s'il est parlant, sinon celui du plan comptable.
export function accountLabel(compte, fileLabel) {
  const f = String(fileLabel || "").trim();
  if (f && f.length > 2 && !/^\d+$/.test(f)) return f;
  return pcgLabel(compte) || `Compte ${compte}`;
}

// ── Postes du compte de résultat
export const POSTES = {
  ventesMarch: "Ventes de marchandises",
  prodVendue: "Production vendue (biens et services)",
  prodStockee: "Production stockée",
  prodImmo: "Production immobilisée",
  subventions: "Subventions d'exploitation",
  autresProduits: "Autres produits de gestion",
  reprises: "Reprises et transferts de charges",
  achatsMarch: "Achats de marchandises",
  varStockMarch: "Variation du stock de marchandises",
  achatsMat: "Achats de matières et approvisionnements",
  varStockMat: "Variation du stock de matières",
  chargesExternes: "Charges externes",
  impotsTaxes: "Impôts et taxes",
  salaires: "Salaires",
  chargesSociales: "Charges sociales",
  dotations: "Dotations aux amortissements et provisions",
  autresCharges: "Autres charges de gestion",
  prodFin: "Produits financiers",
  chargesFin: "Charges financières",
  prodExc: "Produits exceptionnels",
  chargesExc: "Charges exceptionnelles",
  participation: "Participation des salariés",
  is: "Impôt sur les sociétés",
};
const RULES = [
  ["6031", "varStockMat"], ["6032", "varStockMat"], ["6037", "varStockMarch"], ["603", "varStockMat"],
  ["607", "achatsMarch"], ["6087", "achatsMarch"], ["6097", "achatsMarch"],
  ["601", "achatsMat"], ["602", "achatsMat"], ["6081", "achatsMat"], ["6082", "achatsMat"], ["6091", "achatsMat"], ["6092", "achatsMat"],
  ["60", "chargesExternes"], ["61", "chargesExternes"], ["62", "chargesExternes"],
  ["63", "impotsTaxes"],
  ["641", "salaires"], ["642", "salaires"], ["643", "salaires"], ["644", "salaires"], ["64", "chargesSociales"],
  ["65", "autresCharges"], ["66", "chargesFin"], ["67", "chargesExc"],
  ["686", "chargesFin"], ["687", "chargesExc"], ["68", "dotations"],
  ["691", "participation"], ["69", "is"],
  ["707", "ventesMarch"], ["7097", "ventesMarch"], ["70", "prodVendue"],
  ["71", "prodStockee"], ["72", "prodImmo"], ["73", "prodVendue"],
  ["74", "subventions"], ["75", "autresProduits"], ["76", "prodFin"], ["77", "prodExc"],
  ["786", "prodFin"], ["796", "prodFin"], ["787", "prodExc"], ["797", "prodExc"], ["78", "reprises"], ["79", "reprises"],
].sort((a, b) => b[0].length - a[0].length);
export function posteOf(compte) {
  for (const [p, poste] of RULES) if (compte.startsWith(p)) return poste;
  return compte[0] === "7" ? "autresProduits" : "chargesExternes";
}

const emptyPL = () => ({ ...Object.fromEntries(Object.keys(POSTES).map((k) => [k, 0])), accounts: new Map() });

// Compte de résultat d'une liste de lignes de mouvements { c, l, d, cr }.
function plFromAccounts(acc) {
  const pl = emptyPL();
  for (const a of acc) {
    const cls = a.c[0];
    if (cls !== "6" && cls !== "7") continue;
    const v = cls === "6" ? a.d - a.cr : a.cr - a.d;
    if (!v) continue;
    const poste = posteOf(a.c);
    pl[poste] += v;
    const x = pl.accounts.get(a.c) || { c: a.c, l: accountLabel(a.c, a.l), v: 0, poste };
    x.v += v;
    pl.accounts.set(a.c, x);
  }
  return pl;
}
export function sumPL(pls) {
  const out = emptyPL();
  for (const pl of pls) {
    for (const k of Object.keys(POSTES)) out[k] += pl[k];
    for (const [c, a] of pl.accounts) {
      const x = out.accounts.get(c) || { ...a, v: 0 };
      x.v += a.v;
      out.accounts.set(c, x);
    }
  }
  return out;
}

// Soldes intermédiaires de gestion
export function sigOf(pl) {
  const ca = pl.ventesMarch + pl.prodVendue;
  const consommations = pl.achatsMarch + pl.varStockMarch + pl.achatsMat + pl.varStockMat;
  const margeCommerciale = pl.ventesMarch - pl.achatsMarch - pl.varStockMarch;
  const production = pl.prodVendue + pl.prodStockee + pl.prodImmo;
  const margeBrute = ca + pl.prodStockee + pl.prodImmo - consommations;
  const valeurAjoutee = margeBrute - pl.chargesExternes;
  const personnel = pl.salaires + pl.chargesSociales;
  const ebe = valeurAjoutee + pl.subventions - pl.impotsTaxes - personnel;
  const rex = ebe + pl.reprises + pl.autresProduits - pl.dotations - pl.autresCharges;
  const resFin = pl.prodFin - pl.chargesFin;
  const rcai = rex + resFin;
  const resExc = pl.prodExc - pl.chargesExc;
  const rn = rcai + resExc - pl.participation - pl.is;
  const acc = (p) => [...pl.accounts.values()].filter((a) => a.c.startsWith(p)).reduce((s, a) => s + a.v, 0);
  // CAF (méthode additive) : dotations ajoutées, reprises et plus-values de cession retirées
  const caf = rn + acc("68") - acc("78") + acc("675") - acc("775") - acc("777");
  return { ca, consommations, margeCommerciale, production, margeBrute, valeurAjoutee, personnel, ebe, rex, resFin, rcai, resExc, rn, caf };
}

// Impôt sur les sociétés estimé : taux réduit PME de 15 % jusqu'à 42 500 € de
// bénéfice, 25 % au-delà (CA < 10 M€, capital libéré et détenu à 75 % par des personnes physiques).
export function estimateIS(benefice, tauxReduit = true) {
  const b = Math.max(0, benefice);
  if (!tauxReduit) return Math.round(b * 0.25);
  return Math.round(Math.min(b, 42500) * 0.15 + Math.max(0, b - 42500) * 0.25);
}

// ── Index des imports FEC d'un client (mémoïsé sur le tableau d'imports)
const cache = new WeakMap();
export function fecIndex(client) {
  const imports = client?.imports || [];
  const hit = cache.get(imports);
  if (hit) return hit;
  const months = new Map();
  const tiers = [];
  let lastImport = null;
  for (const imp of imports) {
    if (imp.type === "fec") {
      const rows = imp.rows || [];
      const meta = rows.find((r) => r.k === "m") || {};
      months.set(imp.mois, {
        key: imp.mois, meta, importedAt: imp.importedAt,
        acc: rows.filter((r) => r.k === "a"),
        cli: rows.filter((r) => r.k === "c"),
        fou: rows.filter((r) => r.k === "f"),
      });
      if (!lastImport || (meta.fin || "") > (lastImport.fin || "")) lastImport = { ...meta, importedAt: imp.importedAt };
    } else if (imp.type === "fec_tiers") {
      const rows = imp.rows || [];
      tiers.push({ key: imp.mois, meta: rows.find((r) => r.k === "m") || {}, rows: rows.filter((r) => r.k === "t") });
    }
  }
  const keys = [...months.keys()].sort();
  tiers.sort((a, b) => (a.key < b.key ? -1 : 1));
  const idx = { months, keys, tiers, has: keys.length > 0, first: keys[0] || null, last: keys[keys.length - 1] || null, lastImport };
  cache.set(imports, idx);
  return idx;
}
export const hasFec = (client) => fecIndex(client).has;

export function monthPL(idx, key) {
  const m = idx.months.get(key);
  if (!m) return null;
  if (!m._pl) m._pl = plFromAccounts(m.acc);
  return m._pl;
}

// Mois de l'exercice jusqu'à `key` inclus (exercice de l'import qui contient key).
export function ytdKeys(idx, key) {
  const m = idx.months.get(key);
  if (!m) return [];
  const start = (m.meta.ex || key).slice(0, 7);
  return idx.keys.filter((k) => k >= start && k <= key);
}
// Même période un an plus tôt, si elle est entièrement disponible.
export function sameKeysN1(idx, keys) {
  const k1 = keys.map((k) => shiftKey(k, -12));
  return k1.length && k1.every((k) => idx.months.has(k)) ? k1 : null;
}
export function plOver(idx, keys) {
  return sumPL(keys.map((k) => monthPL(idx, k)).filter(Boolean));
}
// 12 derniers mois disponibles finissant à key (moins si l'historique est court).
export function ttmKeys(idx, key) {
  const out = [];
  for (let i = 11; i >= 0; i--) { const k = shiftKey(key, -i); if (idx.months.has(k)) out.push(k); }
  return out;
}

// ── TVA d'un mois (comptes 445). Montants bruts : l'écriture de déclaration
// mensuelle vide 4457 et 4456 dans 4455, le solde net du mois serait nul.
export function tvaOfMonth(idx, key) {
  const m = idx.months.get(key);
  if (!m) return null;
  let collectee = 0, deductible = 0, payee = 0, credit = 0;
  for (const a of m.acc) {
    if (a.c.startsWith("4457")) collectee += a.cr;
    else if (a.c.startsWith("44567")) credit += a.d - a.cr;
    else if (a.c.startsWith("4456")) deductible += a.d;
    else if (a.c.startsWith("4455")) payee += a.d;
  }
  return { collectee, deductible, net: collectee - deductible, payee, credit };
}

// ── Bilan à la fin d'un mois
// anOnly : bilan d'ouverture (à-nouveaux du mois `key` seuls).
function balancesAt(idx, key, anOnly = false) {
  const keys = anOnly ? [key] : idx.keys.filter((k) => k <= key);
  if (!keys.length) return null;
  let start = keys[0];
  for (const k of keys) if (idx.months.get(k).meta.an) start = k;
  const sol = new Map();
  let r67 = 0;
  for (const k of keys) {
    if (k < start) continue;
    for (const a of idx.months.get(k).acc) {
      const s = (anOnly ? 0 : a.d - a.cr) + (k === start ? a.ad - a.ac : 0);
      if (!s) continue;
      if (a.c[0] === "6" || a.c[0] === "7") { r67 += s; continue; }
      const x = sol.get(a.c) || { c: a.c, l: accountLabel(a.c, a.l), s: 0 };
      x.s += s;
      sol.set(a.c, x);
    }
  }
  return { sol, start, resultatFenetre: -r67 };
}

const BILAN_LABELS = {
  immoNet: "Immobilisations (valeur nette)", stocks: "Stocks", clients: "Créances clients", autresCreances: "Autres créances (TVA, avances…)", cca: "Charges payées d'avance", dispo: "Disponibilités",
  capitaux: "Capital et réserves", resultat: "Résultat de l'exercice en cours", provisions: "Provisions", dettesFin: "Emprunts bancaires", associes: "Comptes courants d'associés", concours: "Découverts bancaires",
  fournisseurs: "Dettes fournisseurs", fiscalSocial: "Dettes fiscales et sociales", autresDettes: "Autres dettes", pca: "Produits encaissés d'avance",
};
export { BILAN_LABELS };

// { ouverture: true } : bilan au premier jour de l'exercice qui contient key
// (à-nouveaux seuls), pour expliquer la variation de trésorerie depuis le début.
export function bilanAt(client, key, { ouverture = false } = {}) {
  const idx = fecIndex(client);
  let k = [...idx.keys].reverse().find((x) => x <= key);
  if (!k) return null;
  if (ouverture) {
    k = ytdKeys(idx, k)[0];
    if (!idx.months.get(k)?.meta.an) return null;
  }
  const b = balancesAt(idx, k, ouverture);
  const resultatEx = ouverture ? 0 : sigOf(plOver(idx, ytdKeys(idx, k))).rn;
  const p = Object.fromEntries(Object.keys(BILAN_LABELS).map((x) => [x, 0]));
  const detail = Object.fromEntries(Object.keys(BILAN_LABELS).map((x) => [x, []]));
  let immoBrut = 0, amortImmo = 0;
  const put = (poste, v, a) => { p[poste] += v; detail[poste].push({ c: a.c, l: a.l, v }); };
  for (const a of b.sol.values()) {
    const c = a.c, s = a.s;
    if (Math.abs(s) < 0.005) continue;
    const r2 = c.slice(0, 2), r3 = c.slice(0, 3);
    if (c[0] === "1") {
      if (r2 === "15") put("provisions", -s, a);
      else if (r2 === "16" || r2 === "17") put("dettesFin", -s, a);
      else if (r3 === "109") put("autresCreances", s, a);
      else if (r2 === "18") put("autresDettes", -s, a);
      else put("capitaux", -s, a);
    } else if (c[0] === "2") {
      if (r2 === "28" || r2 === "29") amortImmo -= s; else immoBrut += s;
      put("immoNet", s, a);
    } else if (c[0] === "3") put("stocks", s, a);
    else if (c[0] === "4") {
      if (r3 === "409") put(s >= 0 ? "autresCreances" : "fournisseurs", s >= 0 ? s : -s, a);
      else if (r3 === "419") put("autresDettes", -s, a);
      else if (r3 === "404") put(s >= 0 ? "autresCreances" : "autresDettes", s >= 0 ? s : -s, { ...a, l: a.l || "Fournisseurs d'immobilisations" });
      else if (r2 === "40") put(s >= 0 ? "autresCreances" : "fournisseurs", s >= 0 ? s : -s, a);
      else if (r2 === "41") put(s >= 0 ? "clients" : "autresDettes", s >= 0 ? s : -s, a);
      else if (r3 === "491") put("clients", s, a);
      else if (r3 === "486") put("cca", s, a);
      else if (r3 === "487") put("pca", -s, a);
      else if (r3 === "455") put(s >= 0 ? "autresCreances" : "associes", s >= 0 ? s : -s, a);
      else if (r2 === "42" || r2 === "43" || r2 === "44") put(s >= 0 ? "autresCreances" : "fiscalSocial", s >= 0 ? s : -s, a);
      else put(s >= 0 ? "autresCreances" : "autresDettes", s >= 0 ? s : -s, a);
    } else if (c[0] === "5") {
      if (r3 === "519") put("concours", -s, a);
      else if (r2 === "51" && s < 0) put("concours", -s, a);
      else put("dispo", s, a);
    }
  }
  // Résultats de périodes antérieures pas encore reportés (FEC sans à-nouveaux)
  const anterieur = b.resultatFenetre - resultatEx;
  if (Math.abs(anterieur) > 0.5) { p.capitaux += anterieur; detail.capitaux.push({ c: "12", l: "Résultats antérieurs non encore affectés", v: anterieur }); }
  p.resultat = resultatEx;
  if (!ouverture) detail.resultat.push({ c: "12", l: "Résultat depuis le début de l'exercice", v: resultatEx });

  const actif = p.immoNet + p.stocks + p.clients + p.autresCreances + p.cca + p.dispo;
  const capitauxPropres = p.capitaux + p.resultat;
  const passif = capitauxPropres + p.provisions + p.dettesFin + p.associes + p.concours + p.fournisseurs + p.fiscalSocial + p.autresDettes + p.pca;
  const tresoNette = p.dispo - p.concours;
  const bfr = p.stocks + p.clients + p.autresCreances + p.cca - (p.fournisseurs + p.fiscalSocial + p.autresDettes + p.pca);
  const fr = capitauxPropres + p.provisions + p.dettesFin + p.associes - p.immoNet;
  for (const x of Object.values(detail)) x.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return {
    key: k, exact: k === key, ...p, detail, immoBrut, amortImmo, actif, passif, capitauxPropres,
    tresoNette, bfr, fr, ecart: actif - passif, an: b.start,
  };
}

// Trésorerie nette réelle (banques + caisse − découverts) en fin de mois.
export function tresoAt(client, key) {
  const idx = fecIndex(client);
  if (!idx.months.has(key)) return null;
  return bilanAt(client, key).tresoNette;
}

// ── Indicateurs du mois au format de calcMonthKpis (NVMFinance.jsx)
export function fecMonthKpis(client, mi, yr, { tauxReduit = true } = {}) {
  const idx = fecIndex(client);
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
    hasData: true, source: "fec", partial: (m.meta.fin || "") < monthEnd(key), sig, pl,
  };
}

// ── Clients et fournisseurs
// Soldes ouverts au plus tard à key, avec ventilation par ancienneté.
export function tiersAt(client, key, side) {
  const idx = fecIndex(client);
  const snap = [...idx.tiers].reverse().find((t) => t.key <= key);
  if (!snap) return null;
  const list = snap.rows.filter((t) => t.s === side);
  const buckets = [
    { id: "b30", label: "Moins de 30 jours", max: 30, v: 0 },
    { id: "b60", label: "31 à 60 jours", max: 60, v: 0 },
    { id: "b90", label: "61 à 90 jours", max: 90, v: 0 },
    { id: "b90p", label: "Plus de 90 jours", max: Infinity, v: 0 },
  ];
  for (const t of list) for (const it of t.items) buckets.find((b) => it.age <= b.max).v += it.m;
  const total = list.reduce((s, t) => s + t.solde, 0);
  return { key: snap.key, date: snap.meta.fin, total, list, buckets };
}
// Concentration : part des plus gros clients dans le CA d'une période.
export function topTiers(client, keys, kind) {
  const idx = fecIndex(client);
  const map = new Map();
  for (const k of keys) {
    const m = idx.months.get(k);
    if (!m) continue;
    for (const r of kind === "c" ? m.cli : m.fou) {
      const x = map.get(r.n) || { n: r.n, l: r.l, v: 0 };
      x.v += r.v;
      map.set(r.n, x);
    }
  }
  return [...map.values()].sort((a, b) => b.v - a.v);
}

// ── Ratios de pilotage à la fin d'un mois
export function ratiosAt(client, key) {
  const idx = fecIndex(client);
  if (!idx.months.has(key)) return null;
  const bil = bilanAt(client, key);
  const ttm = ttmKeys(idx, key);
  const f = 12 / Math.max(1, ttm.length); // annualisation si moins de 12 mois
  const pl = plOver(idx, ttm);
  const sig = sigOf(pl);
  let tvaColl = 0, tvaDed = 0;
  for (const k of ttm) { const t = tvaOfMonth(idx, k); tvaColl += t.collectee; tvaDed += t.deductible; }
  const caTTC = (sig.ca + tvaColl) * f;
  const achatsTTC = (sig.consommations + pl.chargesExternes + tvaDed) * f;
  const fournisseurs401 = bil.detail.fournisseurs.reduce((s, a) => s + a.v, 0);
  const dso = caTTC > 0 ? (bil.clients / caTTC) * 365 : null;
  const dpo = achatsTTC > 0 ? (fournisseurs401 / achatsTTC) * 365 : null;
  const conso = (pl.achatsMarch + pl.achatsMat) * f;
  const dio = bil.stocks > 0 && conso > 0 ? (bil.stocks / conso) * 365 : null;
  // Dépenses courantes mensuelles (3 derniers mois) pour mesurer l'autonomie de trésorerie
  const last3 = ttm.slice(-3);
  const pl3 = plOver(idx, last3);
  const depensesMois = (pl3.achatsMarch + pl3.achatsMat + pl3.chargesExternes + pl3.impotsTaxes + pl3.salaires + pl3.chargesSociales + pl3.chargesFin) / Math.max(1, last3.length);
  const cafAn = sig.caf * f;
  // Point mort : charges variables = achats consommés + sous-traitance
  const sousTraitance = [...pl.accounts.values()].filter((a) => a.c.startsWith("604") || a.c.startsWith("611")).reduce((s, a) => s + a.v, 0);
  const variables = sig.consommations + sousTraitance;
  const tauxMCV = sig.ca > 0 ? (sig.ca - variables) / sig.ca : null;
  const fixes = (sig.ca - variables) - sig.rcai;
  const pointMort = tauxMCV && tauxMCV > 0 ? (fixes / tauxMCV) * f : null;
  return {
    key, mois: ttm.length, caAnnuel: sig.ca * f, ebeAnnuel: sig.ebe * f, rnAnnuel: sig.rn * f, cafAnnuelle: cafAn,
    dso, dpo, dio, depensesMois,
    autonomieTreso: depensesMois > 0 ? bil.tresoNette / depensesMois : null,
    autonomieFinanciere: bil.passif > 0 ? bil.capitauxPropres / bil.passif : null,
    endettement: bil.capitauxPropres > 0 ? (bil.dettesFin + bil.concours - bil.dispo) / bil.capitauxPropres : null,
    capaciteRemboursement: cafAn > 0 ? bil.dettesFin / cafAn : null,
    pointMort, tauxMCV, margeSecurite: pointMort != null ? sig.ca * f - pointMort : null,
    bfrJoursCA: sig.ca > 0 ? (bil.bfr / (sig.ca * f)) * 365 : null,
  };
}

// ── Points d'attention tirés de la comptabilité (même format que calcAlertes)
const eurTxt = (n) => `${n < 0 ? "−" : ""}${new Intl.NumberFormat("fr-FR").format(Math.round(Math.abs(n)))} €`;
const pctTxt = (n) => `${Math.round(n)} %`;
export function fecAlertes(client, key) {
  const idx = fecIndex(client);
  if (!idx.months.has(key)) return [];
  const out = [];
  const cli = tiersAt(client, key, "C");
  if (cli && cli.total > 0) {
    const vieux = cli.buckets[2].v + cli.buckets[3].v;
    const part = (vieux / cli.total) * 100;
    if (vieux > 1000 && part > 15) {
      const top = cli.list.map((t) => ({ l: t.l, v: t.items.filter((it) => it.age > 60).reduce((s, it) => s + it.m, 0) })).sort((a, b) => b.v - a.v)[0];
      out.push({
        level: part > 30 ? "red" : "orange", kpi: "Créances échues > 60 jours", current: eurTxt(vieux), threshold: "< 15 % de l'encours",
        msg: `${eurTxt(vieux)} de créances clients ont plus de 60 jours, soit ${pctTxt(part)} de l'encours${top && top.v > 0 ? ` (dont ${top.l} : ${eurTxt(top.v)})` : ""}.`,
        action: "Relancer en priorité les plus gros montants libère de la trésorerie sans rien changer à l'activité.",
      });
    }
  }
  const r = ratiosAt(client, key);
  if (r?.dso != null && r.dso > 60) out.push({
    level: r.dso > 90 ? "red" : "orange", kpi: "DSO élevé", current: `${Math.round(r.dso)} jours`, threshold: "< 60 jours",
    msg: `DSO de ${Math.round(r.dso)} jours. Chaque jour gagné libère environ ${eurTxt(r.caAnnuel / 365)} de trésorerie.`,
    action: "Des conditions de paiement plus courtes, un acompte à la commande ou une relance systématique à l'échéance font baisser ce délai.",
  });
  const ytd = ytdKeys(idx, key);
  const n1 = sameKeysN1(idx, ytd);
  if (n1) {
    const s = sigOf(plOver(idx, ytd)), s1 = sigOf(plOver(idx, n1));
    const pl = plOver(idx, ytd), pl1 = plOver(idx, n1);
    const evoCA = s1.ca > 0 ? (s.ca / s1.ca - 1) * 100 : null;
    if (evoCA != null && evoCA < -10) out.push({
      level: evoCA < -20 ? "red" : "orange", kpi: "CA en recul", current: pctTxt(evoCA), threshold: "vs N-1",
      msg: `CA cumul exercice inférieur de ${pctTxt(-evoCA)} à N-1 sur la même période (${eurTxt(s.ca)} contre ${eurTxt(s1.ca)}).`,
      action: "Regarder ensemble quels clients ou quelles prestations expliquent l'écart permet de cibler les relances commerciales.",
    });
    const t = s.ca > 0 ? (s.margeBrute / s.ca) * 100 : null, t1 = s1.ca > 0 ? (s1.margeBrute / s1.ca) * 100 : null;
    if (t != null && t1 != null && t1 - t > 3) out.push({
      level: t1 - t > 6 ? "red" : "orange", kpi: "Taux de marge brute en baisse", current: pctTxt(t), threshold: `${pctTxt(t1)} en N-1`,
      msg: `Taux de marge brute de ${pctTxt(t)} contre ${pctTxt(t1)} en N-1, soit environ ${eurTxt((t1 - t) / 100 * s.ca)} de marge en moins sur l'exercice.`,
      action: "Les prix d'achat ont peut-être augmenté plus vite que vos prix de vente : c'est le premier levier à vérifier.",
    });
    const evoExt = pl1.chargesExternes > 0 ? (pl.chargesExternes / pl1.chargesExternes - 1) * 100 : null;
    if (evoExt != null && evoExt > 15 && evoExt - (evoCA || 0) > 10 && pl.chargesExternes - pl1.chargesExternes > 2000) {
      const hausse = [...pl.accounts.values()].filter((a) => a.poste === "chargesExternes")
        .map((a) => ({ l: a.l, d: a.v - (pl1.accounts.get(a.c)?.v || 0) })).sort((a, b) => b.d - a.d)[0];
      out.push({
        level: "orange", kpi: "Charges externes en hausse", current: `+${pctTxt(evoExt)}`, threshold: `CA : ${evoCA >= 0 ? "+" : ""}${pctTxt(evoCA || 0)}`,
        msg: `Charges externes en hausse de ${pctTxt(evoExt)} vs N-1, plus vite que le CA${hausse && hausse.d > 0 ? `. La plus forte hausse : ${hausse.l} (+${eurTxt(hausse.d)})` : ""}.`,
        action: "Une revue des contrats et abonnements (loyer, assurances, logiciels, sous-traitance) permet souvent de récupérer quelques points.",
      });
    }
  }
  return out;
}

// ── Pourquoi la trésorerie a bougé entre deux bilans (tableau de flux simplifié).
// La somme des lignes est exactement la variation de trésorerie nette.
export function fluxTresorerie(client, keys, debut, fin) {
  const idx = fecIndex(client);
  const pl = plOver(idx, keys);
  const s = sigOf(pl);
  const d = (x) => fin[x] - debut[x];
  const amort = s.caf - s.rn;
  const bfr = {
    clients: -d("clients"), stocks: -d("stocks"), autresCreances: -(d("autresCreances") + d("cca")),
    fournisseurs: d("fournisseurs"), fiscalSocial: d("fiscalSocial"), autresDettes: d("autresDettes") + d("pca"),
  };
  const lignes = [
    { id: "rn", label: "Résultat net", v: s.rn, aide: "" },
    { id: "amort", label: "Dotations nettes", v: amort, aide: "Charges calculées non décaissées, réintégrées pour obtenir la CAF." },
    { id: "bfr", label: "Variation du BFR", v: -(fin.bfr - debut.bfr), aide: "Trésorerie consommée (ou libérée) par les décalages d'encaissement et de paiement.", detail: [
      { label: "Créances clients", v: bfr.clients },
      { label: "Stocks", v: bfr.stocks },
      { label: "Autres créances", v: bfr.autresCreances },
      { label: "Dettes fournisseurs", v: bfr.fournisseurs },
      { label: "Dettes fiscales et sociales", v: bfr.fiscalSocial },
      { label: "Autres dettes", v: bfr.autresDettes },
    ] },
    { id: "invest", label: "Investissements nets", v: -(d("immoNet") + amort) + d("provisions"), aide: "Acquisitions d'immobilisations nettes des cessions." },
    { id: "emprunts", label: "Financement externe", v: d("dettesFin") + d("associes"), aide: "Nouveaux emprunts et apports en compte courant, nets des remboursements." },
    { id: "capitaux", label: "Capitaux propres", v: d("capitauxPropres") - s.rn, aide: "Augmentations de capital nettes des dividendes versés." },
  ];
  const variation = fin.tresoNette - debut.tresoNette;
  const ecart = variation - lignes.reduce((t, l) => t + l.v, 0);
  if (Math.abs(ecart) >= 1) lignes.push({ id: "autres", label: "Autres mouvements", v: ecart, aide: "" });
  return { lignes, variation, debut: debut.tresoNette, fin: fin.tresoNette };
}

// Point mort annuel sur des mois (ramenés à 12) : charges variables = achats consommés
// et sous-traitance ; tout le reste est considéré comme fixe.
export function pointMort(idx, keys) {
  if (!keys.length) return null;
  const pl = plOver(idx, keys), s = sigOf(pl), f = 12 / keys.length;
  const sousTraitance = [...pl.accounts.values()].filter((a) => a.c.startsWith("604") || a.c.startsWith("611")).reduce((t, a) => t + a.v, 0);
  const variables = s.consommations + sousTraitance;
  const taux = s.ca > 0 ? (s.ca - variables) / s.ca : 0;
  if (taux <= 0) return null;
  const seuil = ((s.ca - variables - s.rcai) / taux) * f;
  return { seuil, ca: s.ca * f, marge: s.ca * f - seuil, mois: keys.length };
}
