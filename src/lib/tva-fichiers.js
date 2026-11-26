// Logiciel TVA, côté navigateur : lecture des fichiers déposés (Excel .xls / .xlsx, texte tabulé
// UTF-16 exporté de SAP sous le nom .xls, CSV, PDF de la CA3) et export du classeur Excel tel que
// le client le tient : pour chaque mois, l'onglet « mars 2026 » (comptes, lignes de régularisation,
// TOTAL, bloc de recherche dans la balance) suivi de l'onglet « Export Mars » (la balance SAP
// telle quelle), puis le « Récapitulatif ». Mêmes formules que son fichier : RECHERCHEV vers le bloc
// du bas, RECHERCHEX vers l'onglet Export, TVA = base × taux, total balance, écart. SheetJS et
// pdf.js sont chargés à la demande (gros modules).
import { BASES, CONTROLES, GRILLE, ORDRE_Q, SPECIALES, calculerGrille, controlesCa3, lignesFbl3n, nomExport, nomMois, resumeMois } from "./tva.js";
import { compteDe, formuleExcel, nombre, norm, pageDepuisPdfjs } from "./tva-lecture.js";

let PDFJS = null;
async function chargerPdfjs() {
  if (!PDFJS) {
    PDFJS = (async () => {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
      if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = worker;
      return import("pdfjs-dist");
    })();
  }
  return PDFJS;
}

// { pdf: true, pages: [[texte…]…] } ou { feuilles: [{ nom, lignes }] }.
export async function lireFichierDepose(fichier) {
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const estPdf = /\.pdf$/i.test(fichier.name) || (octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46);
  if (estPdf) {
    const pdfjs = await chargerPdfjs();
    const pdf = await pdfjs.getDocument({ data: octets, isEvalSupported: false, useSystemFonts: false }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) pages.push(pageDepuisPdfjs((await (await pdf.getPage(i)).getTextContent()).items));
    await pdf.destroy();
    return { pdf: true, pages };
  }
  const XLSX = await import("xlsx");
  // raw : les montants écrits en texte (« 1.234,56- ») restent tels quels, lus ensuite par nombre().
  const wb = XLSX.read(octets, { type: "array", raw: true, cellDates: false });
  return { feuilles: wb.SheetNames.map((nom) => ({ nom, lignes: XLSX.utils.sheet_to_json(wb.Sheets[nom], { header: 1, raw: true, defval: "" }) })) };
}

// ─── Export Excel ─────────────────────────────────────────────────────────────────────────────
const COMPTA = '_-* #,##0.00\\ _€_-;\\-* #,##0.00\\ _€_-;_-* "-"??\\ _€_-;_-@_-'; // format du client
const NOMBRE = "#,##0.00";
const LARGEURS = [20.36, 16.09, 15, 14, 16.73, 14, 15, 14, 15.36, 14.91, 15, 15, 15, 15, 15.09, 16.73, 16.09, 16.09, 40];
const PREMIERE = 8; // première ligne de compte, comme dans le fichier du client
// Sous le TOTAL, les libellés du fichier du client (anciens numéros de ligne de la CA3).
const CASE_SOUS = { C: "ligne 14", E: "ligne 09", G: "ligne 08", K: "ligne 04", M: "ligne 06", N: "ligne 05" };

function poser(ws, adresse, valeur, { f, z } = {}) {
  if ((valeur == null || valeur === "") && !f) return;
  const nombreOuFormule = typeof valeur === "number" || f;
  const c = nombreOuFormule ? { t: "n", v: typeof valeur === "number" ? valeur : 0 } : { t: "s", v: String(valeur) };
  if (f) c.f = f;
  if (nombreOuFormule) c.z = z || COMPTA;
  ws[adresse] = c;
}
// Note d'une cellule → commentaire Excel (masqué, triangle rouge comme dans le fichier du client).
function noter(ws, adresse, note) {
  if (!note) return;
  if (!ws[adresse]) ws[adresse] = { t: "s", v: "" };
  ws[adresse].c = [{ a: "Note", t: note }];
  ws[adresse].c.hidden = true;
}
const val = (ws, a) => (typeof ws[a]?.v === "number" ? ws[a].v : 0);
const citer = (nom) => `'${nom.replace(/'/g, "''")}'`;
const dateExcel = (cle) => (Date.UTC(Number(cle.slice(0, 4)), Number(cle.slice(5, 7)) - 1, 1) - Date.UTC(1899, 11, 30)) / 86400000;

// Onglet « Export » : la balance SAP telle qu'exportée, en-tête en ligne 2 comme chez le client.
// Le n° de compte et les colonnes de montants sont écrits en nombres pour que les formules
// de recherche fonctionnent. Rend la feuille et les plages utilisées par les formules.
function ongletExport(XLSX, balance) {
  const ws = {};
  const entete = balance.brut[0] || [];
  const montant = entete.map((h) => /balance|debit|credit|solde/.test(norm(h)));
  balance.brut.forEach((ligne, i) => {
    const r = i + 2;
    ligne.forEach((x, j) => {
      const a = `${XLSX.utils.encode_col(j)}${r}`;
      if (x === "" || x == null) return;
      if (i > 0 && j === balance.colonnes.compte && compteDe(x)) { ws[a] = { t: "n", v: Number(compteDe(x)) }; return; }
      if (i > 0 && montant[j] && nombre(x) != null) { ws[a] = { t: "n", v: nombre(x), z: NOMBRE }; return; }
      ws[a] = typeof x === "number" ? { t: "n", v: x } : { t: "s", v: String(x) };
    });
  });
  const derniere = balance.brut.length + 1;
  const largeur = Math.max(...balance.brut.map((l) => l.length), 1);
  ws["!ref"] = `A1:${XLSX.utils.encode_col(largeur - 1)}${derniere}`;
  const L = (j) => XLSX.utils.encode_col(j);
  const plage = (j) => `$${L(j)}$3:$${L(j)}$${derniere}`;
  return { ws, compte: plage(balance.colonnes.compte), debit: plage(balance.colonnes.debit), credit: plage(balance.colonnes.credit) };
}

// Onglet d'un mois. `comptes` : liste commune à tous les onglets (mêmes lignes partout, pour que
// le récapitulatif additionne cellule à cellule). `exp` : plages de l'onglet Export, ou null.
function ongletMois(cle, m, regles, comptes, societe, exp) {
  const g = calculerGrille(m, regles, comptes);
  const ws = {};
  const n = comptes.length;
  const ligneSpe = (i) => PREMIERE + n + i;
  const rangDe = Object.fromEntries(SPECIALES.map((sp, i) => [sp.id, ligneSpe(i)]));
  const derniereCompte = PREMIERE + n - 1;
  const derniereSpe = ligneSpe(SPECIALES.length - 1);
  const T = derniereSpe + 2; // TOTAL
  const b0 = T + 4; // bloc de recherche dans la balance
  const b1 = b0 + n - 1;
  const ligneSomme = b1 + 2;
  const ligneControle = b1 + 5;
  const nomExp = exp ? citer(nomExport(cle)) : null;

  poser(ws, "A2", societe || "");
  poser(ws, "A3", dateExcel(cle), { z: "mmm-yy" });
  for (const c of GRILLE) { if (c.codes) poser(ws, `${c.l}4`, c.codes); poser(ws, `${c.l}5`, c.titre); }
  poser(ws, "A5", "Cpte SAP"); poser(ws, "B5", "balance générale"); poser(ws, "S5", "Commentaire");

  // Bases saisies ou reprises des fichiers : une saisie « 40822,82 + 328649,52 » devient la formule
  // « =40822.82+328649.52 », comme le client les tape ; un zéro reste une cellule vide.
  const base = (ligne, lettre, r) => {
    const c = ligne.cells[lettre];
    // Repris de plusieurs codes (B5 : A6 + E2…) : la somme est écrite code par code, comme le client.
    const detail = !c.saisi && c.source?.detail?.length > 1 ? c.source.detail.map((x, i) => `${i && x.montant >= 0 ? "+" : ""}${x.montant}`).join("") : null;
    const f = c.saisi ? formuleExcel(c.expr) : detail;
    if (f) poser(ws, `${lettre}${r}`, c.valeur, { f });
    else if (Math.abs(c.valeur) >= 0.005) poser(ws, `${lettre}${r}`, c.valeur);
  };
  const tva = (r) => {
    for (const c of GRILLE) if (c.de) poser(ws, `${c.l}${r}`, val(ws, `${c.de}${r}`) * c.taux, { f: `${c.de}${r}*${c.taux}` });
  };
  g.lignes.forEach((l, i) => {
    const r = PREMIERE + i;
    poser(ws, `A${r}`, Number(l.compte));
    if (l.cells.B.saisi) base(l, "B", r);
    else poser(ws, `B${r}`, l.cells.B.valeur, { f: `VLOOKUP(A${r},$A$${b0}:$B$${b1},2,FALSE)` });
    for (const lettre of BASES) base(l, lettre, r);
    tva(r);
    poser(ws, `Q${r}`, ORDRE_Q.reduce((s, k) => s + val(ws, `${k}${r}`), 0), { f: ORDRE_Q.map((k) => `${k}${r}`).join("+") });
    poser(ws, `R${r}`, val(ws, `B${r}`) - val(ws, `Q${r}`), { f: `B${r}-Q${r}` });
    const notes = [];
    if (l.auto?.classement === "nd") notes.push("reste sans code TVA mis en non déclarable");
    if (l.auto?.classement === "expliquer") notes.push("reste sans code TVA à expliquer");
    if (l.auto?.horsBalance) notes.push("dans le FBL3N mais pas dans la balance");
    if (notes.length) poser(ws, `S${r}`, notes.join(" ; "));
  });
  SPECIALES.forEach((sp, i) => {
    const r = ligneSpe(i);
    const l = g.parId[sp.id];
    poser(ws, `A${r}`, sp.libelle);
    for (const lettre of BASES) if (!sp.formules?.[lettre]) base(l, lettre, r);
    for (const [lettre, f] of Object.entries(sp.formules || {})) {
      if (l.cells[lettre]?.inactif) continue; // contrôle A3 sans montant en G de LIGNE 02 : case vide
      const formule = f.replace(/\{(\w+)\}/g, (_, id) => rangDe[id]);
      poser(ws, `${lettre}${r}`, l.cells[lettre].valeur, { f: formule });
    }
    tva(r);
    if (sp.q) {
      const lettres = sp.q === "sansI" ? ORDRE_Q.filter((k) => k !== "I") : ORDRE_Q;
      poser(ws, `Q${r}`, lettres.reduce((s, k) => s + val(ws, `${k}${r}`), 0), { f: lettres.map((k) => `${k}${r}`).join("+") });
    }
  });
  // Notes saisies dans l'outil → commentaires Excel sur les mêmes cellules.
  [...g.lignes, ...SPECIALES.map((sp) => g.parId[sp.id])].forEach((l, i) => {
    for (const [lettre, c] of Object.entries(l.cells)) noter(ws, `${lettre}${PREMIERE + i}`, c?.note);
  });
  const somme = (lettre, de, a) => { let s = 0; for (let r = de; r <= a; r++) s += val(ws, `${lettre}${r}`); return s; };
  poser(ws, `A${T}`, "TOTAL");
  poser(ws, `B${T}`, somme("B", PREMIERE, derniereCompte), { f: `SUM(B${PREMIERE}:B${derniereCompte})` });
  for (const c of GRILLE) {
    // Q : comptes + première ligne spéciale (SUM(Q8:Q210) chez le client) ; R : comptes.
    const fin = c.l === "Q" ? derniereCompte + 1 : c.l === "R" ? derniereCompte : derniereSpe;
    poser(ws, `${c.l}${T}`, somme(c.l, PREMIERE, fin), { f: `SUM(${c.l}${PREMIERE}:${c.l}${fin})` });
  }
  for (const [lettre, texte] of Object.entries(CASE_SOUS)) poser(ws, `${lettre}${T + 1}`, texte);

  // Bloc du bas : chaque compte et son montant du mois, cherché dans l'onglet Export (crédit − débit).
  g.lignes.forEach((l, i) => {
    const r = b0 + i;
    poser(ws, `A${r}`, Number(l.compte), { z: "General" });
    const auto = l.auto ? l.auto.balance : 0;
    if (exp) {
      const cherche = (plage) => `_xlfn.XLOOKUP(A${r},${nomExp}!${exp.compte},${nomExp}!${plage},0,0)`;
      poser(ws, `B${r}`, auto, { f: `${cherche(exp.credit)}-${cherche(exp.debit)}`, z: NOMBRE });
    } else poser(ws, `B${r}`, auto, { z: NOMBRE });
  });
  poser(ws, `B${ligneSomme}`, somme("B", b0, b1), { f: `SUM(B${b0}:B${b1})`, z: NOMBRE });
  // Contrôle : total des comptes du tableau − total de l'export (crédits − débits). Différent de 0
  // si l'export contient un compte absent du tableau.
  const totalExport = m.balance?.total ?? somme("B", b0, b1);
  if (exp) poser(ws, `B${ligneControle}`, totalExport, { f: `SUM(${nomExp}!${exp.credit})-SUM(${nomExp}!${exp.debit})`, z: NOMBRE });
  else poser(ws, `B${ligneControle}`, totalExport, { z: NOMBRE });
  poser(ws, `B${T + 2}`, val(ws, `B${T}`) - val(ws, `B${ligneControle}`), { f: `+B${T}-B${ligneControle}`, z: NOMBRE });

  // Contrôle avec la CA3 déposée (ajout de l'outil, sous le bloc du client).
  let r = ligneControle + 3;
  const controles = controlesCa3(g, m.ca3);
  poser(ws, `A${r}`, `Contrôle avec la CA3 déposée${m.ca3?.fichier ? ` (${m.ca3.fichier})` : ""}`);
  r++;
  ["Case", "Libellé", "Tableau", "CA3 déposée", "Écart (CA3 − tableau)"].forEach((t, j) => poser(ws, `${"ABCDE"[j]}${r}`, t));
  r++;
  for (const c of controles) {
    const ref = c.a3 ? `I${rangDe.l02}+G${rangDe.l3b}` : c.speciale ? `${c.lettre}${rangDe[c.speciale]}` : `${c.lettre}${T}`;
    poser(ws, `A${r}`, c.case); poser(ws, `B${r}`, c.libelle);
    poser(ws, `C${r}`, c.calc, { f: ref });
    if (c.declare != null) { poser(ws, `D${r}`, c.declare); poser(ws, `E${r}`, c.ecart, { f: `D${r}-C${r}` }); }
    r++;
  }
  ws["!ref"] = `A1:S${r}`;
  ws["!cols"] = LARGEURS.map((wch) => ({ wch }));
  return { ws, T, derniereCompte, derniereSpe, rangDe, controles };
}

function recapitulatif(onglets, comptes, societe) {
  const ws = {};
  const premier = onglets[0];
  const n = comptes.length;
  poser(ws, "A2", societe || "");
  poser(ws, "A3", "Récapitulatif");
  for (const c of GRILLE) { if (c.codes) poser(ws, `${c.l}4`, c.codes); poser(ws, `${c.l}5`, c.titre); }
  poser(ws, "A5", "Cpte SAP"); poser(ws, "B5", "balance générale");
  // Chaque cellule additionne la même cellule des onglets mensuels.
  const cumul = (adresse) => poser(ws, adresse, onglets.reduce((s, o) => s + val(o.feuille, adresse), 0), { f: onglets.map((o) => `${citer(o.nom)}!${adresse}`).join("+") });
  const tva = (r) => { for (const c of GRILLE) if (c.de) poser(ws, `${c.l}${r}`, val(ws, `${c.de}${r}`) * c.taux, { f: `${c.de}${r}*${c.taux}` }); };
  comptes.forEach((c, i) => {
    const r = PREMIERE + i;
    poser(ws, `A${r}`, Number(c.compte));
    for (const lettre of ["B", ...BASES]) cumul(`${lettre}${r}`);
    tva(r);
    poser(ws, `Q${r}`, ORDRE_Q.reduce((s, k) => s + val(ws, `${k}${r}`), 0), { f: ORDRE_Q.map((k) => `${k}${r}`).join("+") });
    poser(ws, `R${r}`, val(ws, `B${r}`) - val(ws, `Q${r}`), { f: `B${r}-Q${r}` });
  });
  SPECIALES.forEach((sp, i) => {
    const r = PREMIERE + n + i;
    poser(ws, `A${r}`, sp.libelle);
    for (const lettre of BASES) cumul(`${lettre}${r}`);
    if (sp.formules?.R) cumul(`R${r}`);
    tva(r);
    if (sp.q) {
      const lettres = sp.q === "sansI" ? ORDRE_Q.filter((k) => k !== "I") : ORDRE_Q;
      poser(ws, `Q${r}`, lettres.reduce((s, k) => s + val(ws, `${k}${r}`), 0), { f: lettres.map((k) => `${k}${r}`).join("+") });
    }
  });
  const somme = (lettre, de, a) => { let s = 0; for (let r = de; r <= a; r++) s += val(ws, `${lettre}${r}`); return s; };
  const { T, derniereCompte, derniereSpe } = premier;
  poser(ws, `A${T}`, "TOTAL");
  poser(ws, `B${T}`, somme("B", PREMIERE, derniereCompte), { f: `SUM(B${PREMIERE}:B${derniereCompte})` });
  for (const c of GRILLE) {
    const fin = c.l === "Q" ? derniereCompte + 1 : c.l === "R" ? derniereCompte : derniereSpe;
    poser(ws, `${c.l}${T}`, somme(c.l, PREMIERE, fin), { f: `SUM(${c.l}${PREMIERE}:${c.l}${fin})` });
  }
  for (const [lettre, texte] of Object.entries(CASE_SOUS)) poser(ws, `${lettre}${T + 1}`, texte);
  // Écarts avec la CA3, mois par mois.
  let r = T + 4;
  poser(ws, `A${r}`, "Écarts avec la CA3 (CA3 déposée − tableau), par mois");
  r++;
  poser(ws, `A${r}`, "Mois");
  const colonnes = "BCDEFGHIJKLM";
  CONTROLES.forEach((c, j) => poser(ws, `${colonnes[j]}${r}`, `${c.case} ${c.libelle}`));
  r++;
  for (const o of onglets) {
    poser(ws, `A${r}`, o.nom);
    o.controles.forEach((c, j) => { if (c.ecart != null) poser(ws, `${colonnes[j]}${r}`, c.ecart); });
    r++;
  }
  ws["!ref"] = `A1:S${r}`;
  ws["!cols"] = LARGEURS.map((wch) => ({ wch }));
  return ws;
}

// Classeur de tous les mois qui ont un fichier ou une saisie (testable dans Node).
export async function construireClasseur({ memoire, moisListe }) {
  const XLSX = await import("xlsx");
  const mois = moisListe.filter((k) => resumeMois(memoire.mois?.[k], memoire.regles).etat !== "vide");
  if (!mois.length) throw new Error("Aucun mois n'a encore de fichier.");
  // Liste commune des comptes : balance et FBL3N (comptes 7) de tous les mois exportés.
  const comptes = new Map();
  for (const k of mois) {
    const m = memoire.mois[k];
    for (const c of m.balance?.comptes || []) if (!comptes.get(c.compte)) comptes.set(c.compte, c.libelle);
    for (const f of lignesFbl3n(m)) if (f.compte.startsWith("7") && !comptes.has(f.compte)) comptes.set(f.compte, "");
    for (const id of Object.keys(m.saisies || {})) if (/^\d+$/.test(id) && !comptes.has(id)) comptes.set(id, "");
  }
  const liste = [...comptes].map(([compte, libelle]) => ({ compte, libelle })).sort((a, b) => a.compte.localeCompare(b.compte));
  const wb = XLSX.utils.book_new();
  const onglets = [];
  for (const k of mois) {
    const m = memoire.mois[k];
    const exp = m.balance?.brut?.length ? ongletExport(XLSX, m.balance) : null;
    const o = ongletMois(k, m, memoire.regles, liste, memoire.config?.societe, exp);
    XLSX.utils.book_append_sheet(wb, o.ws, nomMois(k));
    if (exp) XLSX.utils.book_append_sheet(wb, exp.ws, nomExport(k));
    onglets.push({ nom: nomMois(k), feuille: o.ws, ...o });
  }
  XLSX.utils.book_append_sheet(wb, recapitulatif(onglets, liste, memoire.config?.societe), "Récapitulatif");
  const nom = `Rapprochement CA CA3 ${memoire.config?.societe || ""} ${mois[0]} à ${mois[mois.length - 1]}`.replace(/\s+/g, " ").trim();
  return { wb, nom, mois: mois.length };
}

// Téléchargement du classeur (navigateur).
export async function exporterExcel(params) {
  const XLSX = await import("xlsx");
  const { wb, nom, mois } = await construireClasseur(params);
  XLSX.writeFile(wb, `${nom}.xlsx`);
  return mois;
}
