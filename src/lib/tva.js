// Logiciel TVA : le tableau mensuel de rapprochement CA / CA3, identique au fichier Excel du client
// (mêmes colonnes C à R, mêmes lignes de régularisation, mêmes formules), rempli d'après les
// exports SAP et complété à la main. Pur, testable dans Node (banc donnees-prospect/tva).
//
// Sens des montants : celui du tableau du client — un produit est positif, soit l'inverse du
// montant SAP (où un crédit s'écrit « … - »). Les bases des achats autoliquidés sont positives.
//
// Rappel métier : SAP déclare les avoirs à part (B5 pour les opérations taxées, leur TVA allant
// en ligne 21 ; F8 pour les non taxées). Les bases de la CA3 sont donc brutes alors que le grand
// livre est net : les lignes « ligne B5 » et « ligne F8 » du tableau, saisies à la main d'après
// l'état de déclaration, réintègrent ces avoirs dans les colonnes.

import { arrondi, basesNettes, evaluer } from "./tva-lecture.js";

// Colonnes de ventilation (bases) et codes TVA SAP qui y mènent.
export const COLONNES = [
  { id: "c10", lettre: "C", codes: ["A7", "3O"] },
  { id: "c55", lettre: "E", codes: ["A6"] },
  { id: "c196", lettre: "G", codes: ["A5"] },
  { id: "c20", lettre: "I", codes: ["3F"] },
  { id: "exp", lettre: "K", codes: ["A2"] },
  { id: "etr", lettre: "L", codes: ["Z3", "Z4", "Z9"] },
  { id: "intra", lettre: "M", codes: ["E6", "EA"] },
  { id: "autres", lettre: "N", codes: ["A1", "A0", "EG"] },
  { id: "nd", lettre: "O", codes: ["3X"] },
  { id: "reclass", lettre: "P", codes: [] },
];
const COL_DU_CODE = Object.fromEntries(COLONNES.flatMap((c) => c.codes.map((k) => [k, c.id])));
export const colonneDuCode = (code, regles = {}) => regles[code] || COL_DU_CODE[code] || null;
// Codes d'achats autoliquidés : pris dans la ligne « Acquisitions intra-communautaires » même
// s'ils sont passés sur un compte 7 (ex. 731500 en 3I).
const CODES_ACHATS = new Set(["3I", "E2", "3A", "3B", "3C"]);

// Colonnes du tableau, dans l'ordre de l'Excel : [lettre, titre (ligne 5), codes (ligne 4), libellé court].
export const GRILLE = [
  { l: "C", titre: "base imposable 10 %", codes: "A7/3O", court: "Base 10 %", saisie: true },
  { l: "D", titre: "TVA 10 %", court: "TVA 10 %", de: "C", taux: 0.1 },
  { l: "E", titre: "base imposable 5,5 %", codes: "A6", court: "Base 5,5 %", saisie: true },
  { l: "F", titre: "TVA à 5,5 %", court: "TVA 5,5 %", de: "E", taux: 0.055 },
  { l: "G", titre: "base imposable 19,6%", codes: "A5", court: "Base 19,6 %", saisie: true },
  { l: "H", titre: "TVA à 19,60%", court: "TVA 19,6 %", de: "G", taux: 0.196 },
  { l: "I", titre: "base imposable 20%", codes: "3F", court: "Base 20 %", saisie: true },
  { l: "J", titre: "TVA à 20%", court: "TVA 20 %", de: "I", taux: 0.2 },
  { l: "K", titre: "Exportations", codes: "A2", court: "Exportations", saisie: true },
  { l: "L", titre: "CODE tva Z3 et Z4\n7R = code tva étrangère", codes: "FBL3N Z3 & Z4/Z9", court: "Z3 / Z4", saisie: true },
  { l: "M", titre: "Livraisons intra-communautaires", codes: "E6/EA", court: "Livr. intra", saisie: true },
  { l: "N", titre: "autres opérations non imposables", codes: "A1/A0/EG", court: "Autres non imp.", saisie: true },
  { l: "O", titre: "non déclarable", court: "Non déclarable", saisie: true },
  { l: "P", titre: "reclassement\nligne F8 régul", court: "Reclassement", saisie: true },
  { l: "Q", titre: "total balance", court: "Total balance" },
  { l: "R", titre: "écart", court: "Écart" },
];
export const BASES = GRILLE.filter((c) => c.saisie).map((c) => c.l); // C E G I K L M N O P
export const ORDRE_Q = ["C", "K", "G", "E", "M", "N", "O", "P", "L", "I"]; // ordre de la formule du client

// Lignes de régularisation sous les comptes (libellés du fichier du client). `q` : formule de la
// colonne Q de cette ligne dans l'onglet de mars (« complet », « sansI » = sans la colonne I, ou
// aucune) ; le TOTAL de Q ne reprend que les comptes et la première ligne. `auto` : valeur
// reprise des fichiers tant que rien n'est saisi ; `formules` : cellules calculées (lettre →
// expression où {id} est remplacé par le numéro de ligne de cette ligne spéciale).
export const SPECIALES = [
  { id: "prov", libelle: "290300 & diverses prov", q: "complet" },
  { id: "avoirSansBase", libelle: "avoir TVA (sans base)", q: "complet" },
  { id: "gratuites", libelle: "Gratuités", q: "sansI" },
  { id: "l02", libelle: "LIGNE 02 + 02A", aide: "Colonne I : bases 3A + 3B (+ 3C) du RFUMSV00 (section ESA). Colonne G : case A3 de la CA3, reprise du PDF.", auto: { G: "ca3:A3", I: "rfumsv:3A+3B+3C" }, q: "sansI" },
  { id: "acqIntra", libelle: "Acquisitions intra-communautaires", aide: "Colonne I : total 3I, colonne E : total E2, repris du FBL3N (sinon du RFUMSV00). Colonne G = G (LIGNE 02) − I (LIGNE 02).", auto: { E: "achat:E2", I: "achat:3I" }, formules: { G: "G{l02}-I{l02}" }, q: "sansI" },
  { id: "l3b", libelle: "prestataires non établis en France ligne 3B", aide: "Colonne G : avoirs 3A / 3B déclarés en B5, repris de l'état de déclaration TVA.", auto: { G: "rapport:B5:3A+3B+3C" }, q: "sansI" },
  { id: "f8", libelle: "ligne F8 régularisation ITC CN", aide: "Avoirs déclarés en F8, repris de l'état de déclaration TVA : A2 en K, E6 + EA en M, A0 + A1 + EG en N, 3X en O. Colonne G = contrôle de la case A3 (doit être à 0). Colonne R = total F8.", auto: { K: "rapport:F8:A2", M: "rapport:F8:E6+EA", N: "rapport:F8:A0+A1+EG", O: "rapport:F8:3X" }, formules: { G: "G{acqIntra}-G{l3b}", R: "K{f8}+M{f8}+N{f8}+O{f8}" }, q: "sansI" },
  { id: "creances", libelle: "cpte 654 = créances irrécouvrables cpte 832210" },
  { id: "b5", libelle: "ligne B5 réintégration ITC CN déclaré ligne 21", aide: "Avoirs déclarés en B5, repris de l'état de déclaration TVA : A7 / 3O en C, A6 + E2 en E, 3F + 3I + 3A + 3B en I. Colonne R = E + I, comme dans le fichier (le contrôle B5 ajoute la colonne C).", auto: { C: "rapport:B5:A7+3O", E: "rapport:B5:A6+E2", I: "rapport:B5:3F+3I+3A+3B+3C" }, formules: { R: "E{b5}+I{b5}" } },
  { id: "deb", libelle: "DEB déclarée à part (PRI)", aide: "Livraisons intracommunautaires déclarées à part (DEB), en M : montant à saisir, il ne figure dans aucun export SAP." },
  { id: "regul", libelle: "régul" },
];

// Familles de comptes dont le reste sans code TVA n'est sans doute pas à déclarer (lu sur les
// libellés SAP du client, 24 nov. 2026) : simple indication à l'écran, le reste reste en écart
// tant que la cliente ne classe pas le compte.
export const FAMILLES = [
  { id: "remises", libelle: "Remises et coopération commerciale provisionnées", test: (c) => /^700[46]/.test(c) },
  { id: "reprises", libelle: "Reprises de provisions", test: (c) => /^74/.test(c) },
  { id: "financier", libelle: "Produits financiers et de change", test: (c) => /^7[56]/.test(c) },
  { id: "divers", libelle: "Produits divers hors champ de la TVA", test: (c) => /^(7315|732)/.test(c) },
];
export const familleDe = (compte) => FAMILLES.find((f) => f.test(compte)) || null;
export const TOLERANCE = 1; // la CA3 est en euros entiers

// Lignes FBL3N du mois (un ou plusieurs fichiers : 3F, 3I, Z3 et Z4…).
export const lignesFbl3n = (m) => Object.values(m?.fbl3n?.parFichier || {}).flat();

// ─── Ventilation automatique des comptes 7 ────────────────────────────────────────────────────
// Chaque compte : montant de la balance, réparti par colonne selon les codes TVA du FBL3N. Un code
// de vente présent dans le RFUMSV00 mais dans aucun FBL3N (le 3O à 10 % en mars 2026) est placé
// sur le compte dont le reste sans code est exactement ce montant (731540 : 1 658,83). Le reste
// sans code va ensuite en « non déclarable » (famille connue ou choix de la cliente) ou en écart.
export function ventiler(m, regles = {}) {
  const regComptes = regles.comptes || {};
  const regCodes = regles.codes || {};
  const vide = () => Object.fromEntries(COLONNES.map((c) => [c.id, 0]));
  const parCompte = new Map();
  const ligne = (compte, libelle = "") => {
    if (!parCompte.has(compte)) parCompte.set(compte, { compte, libelle, balance: 0, cols: vide(), inconnu: 0, codes: {}, dansBalance: false });
    const l = parCompte.get(compte);
    if (!l.libelle && libelle) l.libelle = libelle;
    return l;
  };
  for (const c of m?.balance?.comptes || []) { const l = ligne(c.compte, c.libelle); l.balance += c.montant; l.dansBalance = true; }
  const achats = {};
  const codesInconnus = [];
  const codesFbl = new Set();
  for (const f of lignesFbl3n(m)) {
    if (f.code) codesFbl.add(f.code);
    if (!f.compte.startsWith("7") || CODES_ACHATS.has(f.code)) {
      if (f.code) achats[f.code] = arrondi((achats[f.code] || 0) + f.montantSap);
      continue;
    }
    if (!f.code) continue; // sans code TVA : retrouvé par différence avec la balance
    const l = ligne(f.compte);
    const montant = -f.montantSap;
    l.codes[f.code] = arrondi((l.codes[f.code] || 0) + montant);
    const col = colonneDuCode(f.code, regCodes);
    if (col) l.cols[col] += montant;
    else { l.inconnu += montant; codesInconnus.push({ compte: f.compte, code: f.code, montant: arrondi(montant) }); }
  }
  const reste = (l) => arrondi(l.balance - Object.values(l.cols).reduce((s, x) => s + x, 0) - l.inconnu);
  const places = [];
  const sansCompte = [];
  for (const r of (m?.rfumsv?.lignes || []).filter((x) => x.trs === "MWS" && !codesFbl.has(x.code) && Math.abs(x.base) >= 0.005)) {
    const col = colonneDuCode(r.code, regCodes);
    if (!col) continue;
    const l = [...parCompte.values()].find((x) => x.dansBalance && Math.abs(reste(x) - r.base) < 0.01);
    if (l) {
      l.cols[col] += r.base;
      l.codes[r.code] = arrondi((l.codes[r.code] || 0) + r.base);
      l.places = [...(l.places || []), r.code];
      places.push({ compte: l.compte, code: r.code, montant: r.base });
    } else sansCompte.push({ code: r.code, montant: r.base });
  }
  const lignes = [...parCompte.values()].sort((a, b) => a.compte.localeCompare(b.compte)).map((l) => {
    const sansCode = reste(l);
    const famille = familleDe(l.compte);
    let classement = null;
    if (Math.abs(sansCode) >= 0.005) {
      // Comme dans le fichier du client : le reste sans code reste en écart (colonne R), sauf si
      // la cliente classe le compte en non déclarable (choix retenu pour les mois suivants).
      classement = regComptes[l.compte] || "expliquer";
      if (classement === "nd") l.cols.nd += sansCode;
    }
    return {
      compte: l.compte, libelle: l.libelle, balance: arrondi(l.balance),
      cols: Object.fromEntries(Object.entries(l.cols).map(([k, x]) => [k, arrondi(x)])),
      codes: l.codes, places: l.places || [], sansCode, famille: famille?.id || null, classement, horsBalance: !l.dansBalance,
    };
  });
  return { lignes, achats, codesInconnus, places, sansCompte };
}

// Calcul d'une valeur reprise des fichiers, écrit comme dans Excel (« 4459723,63+9002350,39 ») :
// le détail par code quand il y en a plusieurs, sinon le montant.
const nombreFr = (n) => String(arrondi(n)).replace(".", ",");
export function exprDe(auto, source) {
  const d = (source?.detail || []).filter((x) => Math.abs(x.montant) >= 0.005);
  if (d.length > 1) return d.map((x, i) => `${x.montant < 0 ? "-" : i ? "+" : ""}${nombreFr(Math.abs(x.montant))}`).join("");
  return auto && Math.abs(auto) >= 0.005 ? nombreFr(auto) : "";
}

// ─── Tableau du mois ──────────────────────────────────────────────────────────────────────────
// `saisies` : { [ligne]: { [lettre]: { expr, valeur } } }, ligne = n° de compte ou « s:<id> ».
// Une saisie remplace la valeur reprise des fichiers ; sans saisie, la cellule garde l'automatique.
// `comptes` : liste des comptes à afficher (par défaut ceux du mois ; l'export passe la liste
// commune à tous les mois pour que les lignes tombent au même endroit dans chaque onglet).
export function calculerGrille(m, regles = {}, comptes = null) {
  const v = ventiler(m, regles);
  const parCompte = new Map(v.lignes.map((l) => [l.compte, l]));
  const saisies = m?.saisies || {};
  const notes = m?.notes || {};
  const ca3 = m?.ca3?.cases || {};
  // Une saisie remplace la valeur des fichiers (`expr`) ou s'y ajoute (`ajout`, « +7604 » : la
  // cellule vaut alors la valeur des fichiers + l'ajout, même si l'export change ensuite).
  const cellule = (id, lettre, auto, source = null) => {
    const s = saisies[id]?.[lettre];
    const exprAuto = exprDe(auto, source);
    const note = notes[id]?.[lettre] || null;
    if (s?.ajout) return { valeur: arrondi((auto || 0) + (evaluer(`0${s.ajout}`) || 0)), expr: `${exprAuto || "0"}${s.ajout}`, ajout: s.ajout, saisi: true, auto: auto ?? null, exprAuto, source, note };
    return s ? { valeur: s.valeur, expr: s.expr, saisi: true, auto: auto ?? null, exprAuto, source, note } : { valeur: auto || 0, saisi: false, auto: auto ?? null, exprAuto, source, note };
  };
  // Montants par code de l'état de déclaration (lignes de base, sans les montants de TVA) et du RFUMSV00.
  const rapport = m?.rapport?.lignes || [];
  const parCase = (cas) => {
    const o = {};
    for (const r of rapport) if (r.case === cas && r.info !== "tva" && r.info !== "tva_nd") o[r.code] = arrondi((o[r.code] || 0) + r.montant);
    return o;
  };
  const rf = m?.rfumsv ? basesNettes(m.rfumsv.lignes.filter((l) => l.trs !== "MWS" && l.trs !== "VST")) : {};
  // « rapport:B5:A6+E2 », « rfumsv:3A+3B+3C », « achat:3I », « ca3:A3 » → { valeur, detail, origine }.
  const sourceAuto = (def) => {
    if (!def) return null;
    const [type, a, b] = def.split(":");
    if (type === "ca3") return a in ca3 ? { valeur: ca3[a], detail: [], origine: "CA3 déposée" } : null;
    if (type === "achat") {
      if (a in v.achats) return { valeur: v.achats[a], detail: [], origine: "FBL3N" };
      return a in rf ? { valeur: rf[a], detail: [], origine: "RFUMSV00" } : null;
    }
    const [codes, montants, origine] = type === "rapport" ? [b.split("+"), parCase(a), `état de déclaration, case ${a}`] : [a.split("+"), rf, "RFUMSV00"];
    if (type === "rapport" ? !m?.rapport : !m?.rfumsv) return null;
    const detail = codes.filter((c) => montants[c]).map((c) => ({ code: c, montant: montants[c] }));
    return { valeur: arrondi(detail.reduce((s, x) => s + x.montant, 0)), detail, origine };
  };
  const completer = (ligne) => {
    // TVA = base × taux, sans arrondi (comme la formule du client) : seul le total est arrondi.
    for (const c of GRILLE) if (c.de) ligne.cells[c.l] = { valeur: (ligne.cells[c.de].valeur || 0) * c.taux, calcule: true, note: notes[ligne.id]?.[c.l] || null };
    return ligne;
  };
  const liste = comptes || v.lignes.map((l) => ({ compte: l.compte, libelle: l.libelle }));
  const lignes = liste.map(({ compte, libelle }) => {
    const a = parCompte.get(compte);
    const cells = { B: cellule(compte, "B", a ? a.balance : 0) };
    for (const col of COLONNES) {
      const place = a?.places.find((code) => colonneDuCode(code, regles.codes) === col.id);
      const source = place ? { detail: [], origine: `RFUMSV00, code ${place} absent du FBL3N : placé sur ce compte, dont le reste sans code est ce montant` } : null;
      cells[col.lettre] = cellule(compte, col.lettre, a ? a.cols[col.id] : 0, source);
    }
    const l = completer({ id: compte, type: "compte", compte, libelle: a?.libelle || libelle || "", cells, auto: a || null });
    l.cells.Q = { valeur: arrondi(ORDRE_Q.reduce((s, k) => s + l.cells[k].valeur, 0)), calcule: true, note: notes[compte]?.Q || null };
    l.cells.R = { valeur: arrondi(l.cells.B.valeur - l.cells.Q.valeur), calcule: true, note: notes[compte]?.R || null };
    return l;
  });
  const speciales = [];
  const parId = {};
  for (const sp of SPECIALES) {
    const id = `s:${sp.id}`;
    const cells = {};
    for (const lettre of BASES) {
      const source = sourceAuto(sp.auto?.[lettre]);
      cells[lettre] = cellule(id, lettre, source ? source.valeur : 0, source);
    }
    const l = completer({ id, type: "speciale", cle: sp.id, libelle: sp.libelle, aide: sp.aide, cells });
    parId[sp.id] = l;
    speciales.push(l);
  }
  // Cellules calculées des lignes spéciales (formules du client), dans l'ordre des lignes.
  for (const sp of SPECIALES) {
    for (const [lettre, f] of Object.entries(sp.formules || {})) {
      const valeur = f.split(/(?=[+-])/).reduce((s, terme) => {
        const m2 = terme.match(/^([+-]?)([A-R])\{(\w+)\}$/);
        const x = m2 ? parId[m2[3]].cells[m2[2]]?.valeur || 0 : 0;
        return s + (m2?.[1] === "-" ? -x : x);
      }, 0);
      parId[sp.id].cells[lettre] = { valeur: arrondi(valeur), calcule: true, formule: f, note: notes[`s:${sp.id}`]?.[lettre] || null };
    }
    completer(parId[sp.id]); // la TVA suit les cellules calculées (colonne G)
  }
  for (const sp of SPECIALES) {
    if (!sp.q) continue;
    const lettres = sp.q === "sansI" ? ORDRE_Q.filter((k) => k !== "I") : ORDRE_Q;
    parId[sp.id].cells.Q = { valeur: arrondi(lettres.reduce((s, k) => s + (parId[sp.id].cells[k]?.valeur || 0), 0)), calcule: true, note: notes[`s:${sp.id}`]?.Q || null };
  }
  // Total : B, R sur les comptes ; Q sur les comptes et la première ligne spéciale (SUM(Q8:Q210)
  // du client) ; bases et TVA sur comptes + lignes spéciales.
  const total = { B: 0, Q: parId[SPECIALES[0].id].cells.Q?.valeur || 0, R: 0 };
  for (const l of lignes) for (const k of ["B", "Q", "R"]) total[k] += l.cells[k].valeur;
  for (const c of GRILLE) if (c.saisie || c.de) total[c.l] = [...lignes, ...speciales].reduce((s, l) => s + (l.cells[c.l]?.valeur || 0), 0);
  for (const k in total) total[k] = arrondi(total[k]);
  return { lignes, speciales, parId, total, v };
}

// ─── Contrôle avec la CA3 déposée ─────────────────────────────────────────────────────────────
// Totaux du tableau face aux cases de la CA3 (bases puis TVA) et lignes B5 / F8 / A3.
export const CONTROLES = [
  { case: "9B", libelle: "Base 10 %", lettre: "C" },
  { case: "09", libelle: "Base 5,5 %", lettre: "E" },
  { case: "08", libelle: "Base 20 %", lettre: "I" },
  { case: "E1", libelle: "Exportations hors UE", lettre: "K" },
  { case: "F2", libelle: "Livraisons intracommunautaires", lettre: "M" },
  { case: "E2", libelle: "Autres opérations non imposables", lettre: "N" },
  { case: "B5", libelle: "Régularisations (opérations taxées)", speciale: "b5", lettre: "R" },
  { case: "F8", libelle: "Régularisations (opérations non taxées)", speciale: "f8", lettre: "R" },
  { case: "A3", libelle: "Achats de services autoliquidés", a3: true },
  { case: "9B", libelle: "TVA 10 %", lettre: "D", taxe: true },
  { case: "09", libelle: "TVA 5,5 %", lettre: "F", taxe: true },
  { case: "08", libelle: "TVA 20 %", lettre: "J", taxe: true },
];
export function controlesCa3(g, ca3) {
  const cases = ca3?.cases || {};
  const taxes = ca3?.taxes || {};
  return CONTROLES.map((c) => {
    let calc;
    if (c.a3) calc = arrondi((g.parId.l02.cells.I.valeur || 0) + (g.parId.l3b.cells.G.valeur || 0));
    else if (c.speciale === "b5") calc = arrondi(["C", "E", "I"].reduce((s, k) => s + g.parId.b5.cells[k].valeur, 0));
    else if (c.speciale) calc = g.parId[c.speciale].cells[c.lettre].valeur;
    else calc = g.total[c.lettre];
    const declare = c.taxe ? taxes[c.case] ?? null : cases[c.case] ?? null;
    const ecart = declare == null ? null : arrondi(declare - calc);
    const tolerance = c.taxe ? 2 : TOLERANCE;
    return { ...c, calc, declare, ecart, statut: declare == null ? "attente" : Math.abs(ecart) <= tolerance ? "ok" : "ecart" };
  });
}

// ─── Synthèse d'un mois ───────────────────────────────────────────────────────────────────────
export function resumeMois(m, regles) {
  const vide = !m || (!m.balance && !lignesFbl3n(m).length && !m.ca3 && !Object.keys(m.saisies || {}).length && !Object.keys(m.notes || {}).length);
  if (vide) return { etat: "vide" };
  const g = calculerGrille(m, regles);
  const controles = controlesCa3(g, m.ca3);
  const enEcart = controles.filter((c) => c.statut === "ecart").length;
  const aExpliquer = g.lignes.filter((l) => Math.abs(l.cells.R.valeur) >= 0.005).length;
  const etat = !m.balance || !lignesFbl3n(m).length || !m.ca3 ? "incomplet" : enEcart || aExpliquer || g.v.codesInconnus.length ? "ecart" : "ok";
  return { etat, g, controles, enEcart, aExpliquer };
}

// Mois de l'exercice (« AAAA-MM ») à partir de son premier mois.
export function moisExercice(debut) {
  const [a, m] = debut.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => { const d = new Date(a, m - 1 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
}
const NOMS_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const nomMois = (cle) => `${NOMS_MOIS[Number(cle.slice(5, 7)) - 1]} ${cle.slice(0, 4)}`;
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const nomMoisCourt = (cle) => `${MOIS_COURTS[Number(cle.slice(5, 7)) - 1]} ${cle.slice(2, 4)}`;
// Nom de l'onglet « Export » du mois, comme dans le fichier du client (« Export Mars »).
export const nomExport = (cle) => { const n = NOMS_MOIS[Number(cle.slice(5, 7)) - 1]; return `Export ${n[0].toUpperCase()}${n.slice(1)}`; };

// Comptes vus dans la balance des autres mois (pour signaler un compte nouveau).
export function comptesConnus(tousMois, sauf) {
  const s = new Set();
  for (const [cle, m] of Object.entries(tousMois || {})) if (cle !== sauf) for (const c of m.balance?.comptes || []) s.add(c.compte);
  return s;
}
