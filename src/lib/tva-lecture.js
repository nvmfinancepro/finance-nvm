// Logiciel TVA (rapprochement CA / CA3) : lecture des exports SAP et de la déclaration CA3.
// Fonctions pures sur des tableaux de lignes (cellules déjà lues depuis Excel ou CSV par
// tva-fichiers.js) ou sur les textes du PDF de la CA3 : testables dans Node (banc
// donnees-prospect/tva). Chaque lecteur rend null quand le tableau n'est pas de son type, ce qui
// permet à `reconnaitre` de deviner seul ce que la cliente a déposé.

const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export const norm = (s) => sansAccent(s).toLowerCase().replace(/\s+/g, " ").trim();
export const arrondi = (n) => Math.round((n || 0) * 100) / 100;

// Montant tel que SAP l'écrit : « 15.560.009,14- » (crédit), « 1.657.939,00 », « 1 234,56 »,
// « (1,234.56) », ou déjà un nombre. null si la cellule n'est pas un montant.
export function nombre(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").replace(/[\s  ]/g, "").replace(/€|EUR$/gi, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.endsWith("-")) { neg = !neg; s = s.slice(0, -1); }
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); } else if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,']+$/.test(s) || !/\d/.test(s)) return null;
  s = s.replace(/'/g, "");
  const p = s.lastIndexOf("."), c = s.lastIndexOf(",");
  if (p >= 0 && c >= 0) {
    const dec = p > c ? "." : ",";
    s = s.split(dec === "." ? "," : ".").join("").replace(dec, ".");
  } else if (c >= 0) {
    s = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (p >= 0) {
    // « 1.657.939 » ou « 12.500 » : séparateurs de milliers ; « 12.5 » : décimales.
    const morceaux = s.split(".");
    if (morceaux.length > 2 || morceaux[1].length === 3) s = morceaux.join("");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

// Numéro de compte (cellule texte ou nombre) : 5 à 10 chiffres, sinon null.
export function compteDe(v) {
  const s = String(v ?? "").trim().replace(/\.0+$/, "");
  return /^\d{5,10}$/.test(s) ? s : null;
}

const texte = (v) => String(v ?? "").trim();
const etoiles = (ligne) => Math.max(0, ...ligne.slice(0, 3).map((x) => (/^\*+$/.test(texte(x)) ? texte(x).length : 0)));

// Ligne d'en-tête : la première (dans les 40 premières) où chaque champ requis trouve une colonne.
function entete(lignes, requis, options = {}) {
  for (let i = 0; i < Math.min(lignes.length, 40); i++) {
    const cells = (lignes[i] || []).map(norm);
    const col = {};
    const prises = new Set();
    for (const [nom, test] of Object.entries({ ...requis, ...options })) {
      const j = cells.findIndex((c, k) => c && !prises.has(k) && test(c));
      if (j >= 0) { col[nom] = j; prises.add(j); }
    }
    if (Object.keys(requis).every((n) => n in col)) return { i, col };
  }
  return null;
}

// ─── Balance (S_ALR_87012277 / FS10N exportée en tableur) ─────────────────────────────────────
// Colonnes reconnues : n° de compte, libellé, débit et crédit de la période. Montant du mois =
// crédit − débit (un produit est positif, comme dans le tableau Excel du client). Seuls les
// comptes de classe 7 sont gardés.
export function lireBalance(lignes) {
  const e = entete(lignes, {
    compte: (c) => /^(g\/l acc(oun)?t|g\/l|compte( general| g\/l)?|account|n° (de )?compte|numero de compte)$/.test(c),
    debit: (c) => /debit/.test(c) && !/cumul|accumul|prev|anterieur|carryforward|report a nouveau/.test(c),
    credit: (c) => /credit/.test(c) && !/cumul|accumul|prev|anterieur|carryforward|report a nouveau/.test(c),
  }, { libelle: (c) => /short text|libelle|texte|description|intitule/.test(c) });
  if (!e) return null;
  const parCompte = new Map();
  let ignores = 0;
  for (const l of lignes.slice(e.i + 1)) {
    const compte = compteDe(l[e.col.compte]);
    if (!compte) continue;
    if (!compte.startsWith("7")) { ignores++; continue; }
    const montant = (nombre(l[e.col.credit]) || 0) - (nombre(l[e.col.debit]) || 0);
    const x = parCompte.get(compte) || { compte, libelle: "", montant: 0 };
    x.montant += montant;
    if (!x.libelle && e.col.libelle != null) x.libelle = texte(l[e.col.libelle]);
    parCompte.set(compte, x);
  }
  if (!parCompte.size) return null;
  const comptes = [...parCompte.values()].map((x) => ({ ...x, montant: arrondi(x.montant) })).sort((a, b) => a.compte.localeCompare(b.compte));
  // `brut` : l'export tel quel à partir de sa ligne d'en-tête, recopié dans l'onglet « Export » du
  // classeur exporté (les formules de recherche du mois pointent dessus, comme dans le fichier du client).
  const brut = lignes.slice(e.i).map((l) => l.map((c) => (typeof c === "string" ? c.trim() : c)));
  while (brut.length && brut[brut.length - 1].every((c) => c === "" || c == null)) brut.pop();
  return { type: "balance", comptes, ignores, total: arrondi(comptes.reduce((s, x) => s + x.montant, 0)), brut, colonnes: { compte: e.col.compte, debit: e.col.debit, credit: e.col.credit } };
}

// ─── FBL3N (postes de comptes généraux, avec le code TVA) ─────────────────────────────────────
// Détail des écritures ou présentation résumée (une ligne « * » par compte et code, sous-totaux
// « ** » et total « *** » ignorés). Le montant gardé est celui de SAP (crédit négatif) ; le sens
// du tableau est appliqué par la ventilation.
export function lireFbl3n(lignes) {
  const e = entete(lignes, {
    compte: (c) => /^(g\/l|g\/l acc(oun)?t|compte|compte general|account|cpte|cpte gen\.?)$/.test(c),
    montant: (c) => /amount in (local|lc)|montant en devise (interne|societe)|^montant|^amount$/.test(c),
    code: (c) => /^(tx|tax code|code tva|code taxe|code de taxe|ct|cd\.? ?tva)$/.test(c),
  });
  if (!e) return null;
  const brutes = [];
  for (const l of lignes.slice(e.i + 1)) {
    const n = etoiles(l);
    if (n >= 2) continue;
    const compte = compteDe(l[e.col.compte]);
    const montant = nombre(l[e.col.montant]);
    if (!compte || montant == null) continue;
    brutes.push({ compte, code: texte(l[e.col.code]).toUpperCase(), montant, n });
  }
  // Détail présent : les lignes « * » sont ses sous-totaux, on ne les recompte pas.
  const detail = brutes.filter((x) => x.n === 0);
  const gardees = detail.length ? detail : brutes;
  const somme = new Map();
  for (const x of gardees) {
    const k = `${x.compte}|${x.code}`;
    somme.set(k, (somme.get(k) || 0) + x.montant);
  }
  if (!somme.size) return null;
  const res = [...somme].map(([k, m]) => { const [compte, code] = k.split("|"); return { compte, code, montantSap: arrondi(m) }; });
  return { type: "fbl3n", lignes: res.sort((a, b) => a.compte.localeCompare(b.compte) || a.code.localeCompare(b.code)), nbLignes: gardees.length };
}

// ─── RFUMSV00 (déclaration préalable TVA : base par clé d'opération et code) ─────────────────
// Clés d'opération : ESA / ESE (autoliquidation, collectée / déductible), MWS (ventes), VST
// (achats). La base est rendue dans le sens « opération » : positive pour une vente, un achat
// ou une autoliquidation.
export function lireRfumsv(lignes) {
  const e = entete(lignes, {
    code: (c) => /^(tx|code tva|code taxe|tax code|ct)$/.test(c),
    base: (c) => /tax base|base (imposable|hors taxe|ht|de taxe)|^base$/.test(c),
  }, {
    trs: (c) => /^(trs|transaction|cle d'?operation|cle)$/.test(c),
    taxe: (c) => /to be paid|tax amount|taxe due|montant (de )?taxe|a payer/.test(c),
  });
  if (!e) return null;
  // Une colonne « compte » ferait de ce tableau un FBL3N.
  if ((lignes[e.i] || []).some((c) => /^(g\/l|compte|account)/.test(norm(c)))) return null;
  const res = [];
  for (const l of lignes.slice(e.i + 1)) {
    const code = texte(l[e.col.code]).toUpperCase();
    const base = nombre(l[e.col.base]);
    if (!/^[0-9A-Z]{2}$/.test(code) || base == null) continue;
    const trs = e.col.trs != null ? texte(l[e.col.trs]).toUpperCase() : "";
    const sens = trs === "ESA" || trs === "MWS" ? -1 : trs ? 1 : Math.sign(base) || 1;
    res.push({ trs, code, base: arrondi(sens * base), taxe: e.col.taxe != null ? Math.abs(nombre(l[e.col.taxe]) || 0) : null });
  }
  return res.length ? { type: "rfumsv", lignes: res } : null;
}

// Bases nettes par code (première occurrence, ESA en priorité pour l'autoliquidation).
export function basesNettes(lignes) {
  const o = {};
  for (const l of [...lignes].sort((a, b) => (a.trs === "ESA" ? 0 : 1) - (b.trs === "ESA" ? 0 : 1))) {
    if (!(l.code in o)) o[l.code] = l.base;
  }
  return o;
}

// ─── Rapport de déclaration TVA (montants par case de la CA3, code TVA, facture ou avoir) ─────
// Format encore inconnu (vu en photo seulement) : les colonnes sont reconnues par leur contenu —
// la case (« A1 », « B5 », « 08-A »), le code TVA, Cr / Inv, la nature du montant et le montant.
const RE_CASE = /^(A[1-5]|B[1-5]|E[1-6]|F[1-9]|0[89]|9B|1[0-9]|2[0-9]|3[0-2]|I[1-6]|T[1-9]|5B|2C|X[1-5]|Y[1-5]|Z[1-5]|AA|AB)(?:[-\s]?([A-D]))?$/;
const valeurCase = (v) => { const t = texte(v).toUpperCase(); return /^\d$/.test(t) ? `0${t}` : t; };

function colonneParContenu(lignes, test, exclues = []) {
  const n = Math.max(0, ...lignes.slice(0, 500).map((r) => r.length));
  let meilleure = -1, score = 0;
  for (let j = 0; j < n; j++) {
    if (exclues.includes(j)) continue;
    let ok = 0, tot = 0;
    for (const r of lignes.slice(0, 500)) {
      const v = texte(r[j]);
      if (!v) continue;
      tot++;
      if (test(v, r[j])) ok++;
    }
    if (ok >= 3 && ok / tot > score) { score = ok / tot; meilleure = j; }
  }
  return score >= 0.5 ? meilleure : -1;
}

export function lireRapportTva(lignes) {
  const cCase = colonneParContenu(lignes, (v) => RE_CASE.test(valeurCase(v)));
  if (cCase < 0) return null;
  const cType = colonneParContenu(lignes, (v) => /^(cr|inv|credit note|invoice|avoir|facture)$/i.test(v), [cCase]);
  const cCode = colonneParContenu(lignes, (v) => /^([0-9][A-Z]|[A-Z][0-9A-Z]|IMPORT ?\d+|VAT BOX)$/i.test(v), [cCase, cType]);
  const cInfo = colonneParContenu(lignes, (v) => /taxable|vat amount|base|montant de tva|tax amount/i.test(v), [cCase, cType, cCode]);
  // Montant : la colonne numérique la plus à droite.
  let cMontant = -1;
  const n = Math.max(0, ...lignes.slice(0, 500).map((r) => r.length));
  for (let j = n - 1; j >= 0 && cMontant < 0; j--) {
    if ([cCase, cType, cCode, cInfo].includes(j)) continue;
    let ok = 0, tot = 0;
    for (const r of lignes.slice(0, 500)) { const v = texte(r[j]); if (!v) continue; tot++; if (nombre(r[j]) != null) ok++; }
    if (ok >= 3 && ok / tot >= 0.5) cMontant = j;
  }
  // Sans colonne Cr / Inv ni nature du montant, un FBL3N (colonne des codes A1, E6…) passerait
  // pour un rapport.
  if (cMontant < 0 || (cType < 0 && cInfo < 0)) return null;
  const res = [];
  for (const l of lignes) {
    const m = RE_CASE.exec(valeurCase(l[cCase]));
    const montant = nombre(l[cMontant]);
    if (!m || montant == null) continue;
    const info = norm(cInfo >= 0 ? l[cInfo] : "");
    const type = norm(cType >= 0 ? l[cType] : "");
    res.push({
      case: m[1],
      suffixe: m[2] || "",
      code: cCode >= 0 ? texte(l[cCode]).toUpperCase() : "",
      type: /^(cr|avoir|credit)/.test(type) ? "Cr" : /^(inv|facture|invoice)/.test(type) ? "Inv" : "",
      info: /non.?deductible/.test(info) ? "tva_nd" : /vat amount|tax amount|montant de tva|^tva/.test(info) ? "tva" : /taxable|base/.test(info) ? "base" : "",
      montant: arrondi(montant),
    });
  }
  return res.length >= 3 ? { type: "rapport", lignes: res } : null;
}

// ─── Déclaration CA3 (PDF « Synthèse de la déclaration » d'impots.gouv) ───────────────────────
// `pages` : pour chaque page, les morceaux de texte de pdf.js, « \n » marquant une fin de ligne
// (`pageDepuisPdfjs`). Selon l'outil qui a imprimé le PDF, un morceau porte une case entière
// (mars 2026) ou des bouts de mots (« A|1| |Ve|nt|e|s », août 2026) : chaque ligne est donc
// recollée, sa case lue au début et ses montants à la fin (les montants restent des morceaux
// entiers dans les deux cas). Une case dont le libellé passe à la ligne garde les montants des
// lignes suivantes. L'identification (page 1), l'encadré « pour information » et l'annexe 3310-A
// (taxes assimilées) sont ignorés.
const CASES_BASE_TAXE = new Set(["08", "09", "9B", "10", "11", "13", "14", "I1", "I2", "I3", "I4", "I5", "I6", "T1", "T2", "T3", "T4", "T5", "T6", "T7"]);
const RE_CASE_CA3 = /^(A[1-5]|B[1-5]|E[1-6]|F[1-9]|0[89]|9B|1[0-9]|2[0-9]|3[0-2]|I[1-6]|T[1-9]|TD|5B|2C|X[1-5]|Y[1-5]|Z[1-5]|AA|AB)$/;
const RE_MONTANT_CA3 = /^-?\d{1,3}(?:[\s\u00a0\u202f]\d{3})*(?:,\d+)?$/;
const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

export const pageDepuisPdfjs = (items) => items.flatMap((it) => (it.hasEOL ? [it.str || "", "\n"] : [it.str || ""]));

function lignesDePage(page) {
  const avecFins = page.includes("\n"); // ancien format : un morceau par ligne
  const lignes = [];
  let cur = [];
  for (const x of page) {
    if (x === "\n") { lignes.push(cur); cur = []; continue; }
    cur.push(String(x ?? ""));
    if (!avecFins) { lignes.push(cur); cur = []; }
  }
  if (cur.length) lignes.push(cur);
  return lignes.map((morceaux) => {
    const montants = [];
    for (let i = morceaux.length - 1; i >= 0; i--) {
      const m = morceaux[i].trim();
      if (!m) continue;
      if (RE_MONTANT_CA3.test(m)) montants.unshift(nombre(m)); else break;
    }
    return { texte: morceaux.join("").replace(/\s+/g, " ").trim(), montants };
  });
}

export function lireCa3(pages) {
  const parPage = pages.map(lignesDePage);
  const tout = parPage.flat().map((l) => l.texte).join(" ");
  if (!/3310\s*[-−–]?\s*CA\s*3/i.test(tout)) return null;
  const valeurs = {};
  let formulaire = false;
  for (const lignes of parPage) {
    if (lignes.some((l) => /imprime a fournir en annexe/.test(norm(l.texte)))) continue;
    let cur = null;
    for (const l of lignes) {
      const t = norm(l.texte);
      if (/montant des operations realisees/.test(t)) formulaire = true;
      if (/pour information/.test(t)) { formulaire = false; cur = null; }
      if (!formulaire) continue;
      const debut = l.texte.match(/^([A-Z0-9]{1,2})(?:\s|$)/);
      if (debut && RE_CASE_CA3.test(debut[1]) && !RE_MONTANT_CA3.test(l.texte)) {
        cur = debut[1];
        valeurs[cur] = valeurs[cur] || [];
      }
      if (cur) valeurs[cur].push(...l.montants);
    }
  }
  const cases = {}, taxes = {};
  for (const [c, v] of Object.entries(valeurs)) {
    if (!v.length) continue;
    cases[c] = v[0];
    if (CASES_BASE_TAXE.has(c) && v.length > 1) taxes[c] = v[1];
  }
  const siren = (tout.match(/SIREN\s*:\s*(\d[\d\s]{7,12}\d)/) || [])[1]?.replace(/\s/g, "") || "";
  const per = norm(tout).match(/periode declaree\s*:\s*([a-z]+)\s+(\d{4})/);
  const periode = per && MOIS.includes(per[1]) ? `${per[2]}-${String(MOIS.indexOf(per[1]) + 1).padStart(2, "0")}` : "";
  const lignes = parPage.flat();
  const i = lignes.findIndex((l) => /pour le compte de/.test(norm(l.texte)));
  const societe = i >= 0 ? (lignes.slice(i + 1).find((l) => l.texte)?.texte || "") : "";
  return Object.keys(cases).length ? { type: "ca3", cases, taxes, siren, periode, societe } : null;
}

// ─── Saisie dans une cellule : un montant ou une petite somme, comme dans Excel ───────────────
// « 40 822,82 + 328 649,52 », « =12500-560,14 », « (1 000 + 2,5) * 2 ». null si illisible.
const jetons = (texte) => String(texte ?? "").replace(/^\s*=/, "").replace(/[\s  ]/g, "").match(/[\d.,]+|[-+*/()]|./g) || [];
export function evaluer(texte) {
  const t = jetons(texte);
  if (!t.length) return null;
  let i = 0;
  const facteur = () => {
    const x = t[i++];
    if (x === "-") { const v = facteur(); return v == null ? null : -v; }
    if (x === "+") return facteur();
    if (x === "(") { const v = somme(); if (t[i++] !== ")") return null; return v; }
    return x != null && /^[\d.,]+$/.test(x) ? nombre(x) : null;
  };
  const produit = () => {
    let v = facteur();
    while (v != null && (t[i] === "*" || t[i] === "/")) { const op = t[i++]; const w = facteur(); if (w == null || (op === "/" && w === 0)) return null; v = op === "*" ? v * w : v / w; }
    return v;
  };
  const somme = () => {
    let v = produit();
    while (v != null && (t[i] === "+" || t[i] === "-")) { const op = t[i++]; const w = produit(); if (w == null) return null; v = op === "+" ? v + w : v - w; }
    return v;
  };
  const v = somme();
  return v == null || i !== t.length ? null : arrondi(v);
}
// La même saisie écrite en formule Excel (« =40822.82+328649.52 »), ou le nombre seul.
export function formuleExcel(texte) {
  const t = jetons(texte);
  const nb = (x) => /^[\d.,]+$/.test(x || "");
  if ((t.length === 1 && nb(t[0])) || (t.length === 2 && t[0] === "-" && nb(t[1]))) return null;
  return t.map((x) => (/^[\d.,]+$/.test(x) ? String(nombre(x)) : x)).join("");
}

// ─── Reconnaissance d'un fichier déposé ───────────────────────────────────────────────────────
// `feuilles` : [{ nom, lignes }]. Rend, pour chaque feuille reconnue, son type et sa lecture.
// Ordre : du format le plus particulier au plus général.
const LECTEURS = [lireRapportTva, lireRfumsv, lireFbl3n, lireBalance];
export function reconnaitre(feuilles) {
  const res = [];
  for (const f of feuilles) {
    for (const lire of LECTEURS) {
      const r = lire(f.lignes || []);
      if (r) { res.push({ feuille: f.nom, ...r }); break; }
    }
  }
  return res;
}

// Plusieurs feuilles du même type dans un classeur (ex. ancien fichier Excel avec un onglet
// « Export » par mois) : celle dont le nom porte le mois voulu, sinon la seule.
export function choisirFeuille(candidats, moisCle) {
  if (candidats.length <= 1) return candidats[0] || null;
  const nomMois = MOIS[Number(moisCle.slice(5, 7)) - 1];
  return candidats.find((c) => norm(c.feuille).replace(/[^a-z]/g, " ").split(" ").includes(nomMois)) || null;
}
