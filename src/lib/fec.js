// Lecture du FEC (Fichier des Écritures Comptables) pour l'import mensuel.
// Le FEC est l'export normalisé que tout logiciel comptable français sait produire
// (art. A47 A-1 du LPF) : une ligne par mouvement, 18 colonnes séparées par une
// tabulation ou un « | ». Tout est lu dans le navigateur ; seuls des agrégats
// mensuels par compte (et les soldes clients / fournisseurs) sont enregistrés dans
// imports_csv, jamais le fichier brut.

import { decodeBankFile, parseAmount, parseBankDate } from "./bank-statement.js";

export const decodeFecFile = decodeBankFile;

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const r2 = (n) => Math.round(n * 100) / 100;

// Noms de colonnes officiels, plus les variantes rencontrées dans les exports.
const FIELDS = {
  journalCode: ["journalcode", "codejournal"],
  journalLib: ["journallib", "libellejournal"],
  ecritureNum: ["ecriturenum", "numeroecriture", "numecriture"],
  ecritureDate: ["ecrituredate", "dateecriture"],
  compteNum: ["comptenum", "numerocompte", "numcompte"],
  compteLib: ["comptelib", "libellecompte"],
  compAuxNum: ["compauxnum", "numcompteaux", "compteauxiliaire"],
  compAuxLib: ["compauxlib", "libellecompteaux"],
  pieceRef: ["pieceref", "referencepiece", "numpiece"],
  pieceDate: ["piecedate", "datepiece"],
  ecritureLib: ["ecriturelib", "libelleecriture"],
  debit: ["debit", "montantdebit"],
  credit: ["credit", "montantcredit"],
  ecritureLet: ["ecriturelet", "lettrage"],
  montant: ["montant"],
  sens: ["sens"],
};

function mapHeader(headers) {
  const h = headers.map(norm);
  const cols = {};
  for (const [key, names] of Object.entries(FIELDS)) {
    const i = h.findIndex((x) => names.includes(x));
    if (i > -1) cols[key] = i;
  }
  return cols;
}

// "123456789FEC20251231.txt" → { siren, cloture: "2025-12-31" }
export function fecFileInfo(fileName) {
  const m = String(fileName || "").match(/(\d{9})\s*FEC\s*(\d{8})/i);
  if (!m) return { siren: null, cloture: null };
  return { siren: m[1], cloture: parseBankDate(m[2]) };
}

const unquote = (v) => {
  const s = v.trim();
  return s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/""/g, '"').trim() : s;
};

// Lit le texte du FEC → { lines, errors, columns } ; lève une erreur si le format
// n'est pas reconnu (pas d'en-tête, colonnes indispensables absentes).
export function parseFec(text) {
  const raw = text.replace(/^﻿/, "").split(/\r?\n/);
  const first = raw.findIndex((l) => l.trim());
  if (first < 0) throw new Error("Le fichier est vide.");
  const headerLine = raw[first];
  const sep = ["\t", "|", ";"].sort((a, b) => headerLine.split(b).length - headerLine.split(a).length)[0];
  const cols = mapHeader(headerLine.split(sep).map(unquote));
  const hasAmounts = (cols.debit != null && cols.credit != null) || (cols.montant != null && cols.sens != null);
  if (cols.compteNum == null || cols.ecritureDate == null || !hasAmounts) {
    throw new Error("Ce fichier ne ressemble pas à un FEC : les colonnes CompteNum, EcritureDate, Debit et Credit sont introuvables. Exportez le « Fichier des écritures comptables » depuis votre logiciel comptable (format texte, séparateur tabulation ou |).");
  }
  const get = (vals, key) => (cols[key] != null ? unquote(vals[cols[key]] ?? "") : "");
  const lines = [];
  const errors = [];
  for (let i = first + 1; i < raw.length; i++) {
    const l = raw[i];
    if (!l.trim()) continue;
    const vals = l.split(sep);
    if (vals.every((v) => !unquote(v))) continue;
    const compte = get(vals, "compteNum").replace(/\s/g, "").toUpperCase();
    const date = parseBankDate(get(vals, "ecritureDate"));
    let debit, credit;
    if (cols.debit != null) {
      debit = parseAmount(get(vals, "debit")) ?? 0;
      credit = parseAmount(get(vals, "credit")) ?? 0;
    } else {
      const m = Math.abs(parseAmount(get(vals, "montant")) ?? 0);
      const s = norm(get(vals, "sens"));
      const isDebit = s === "d" || s === "1" || s === "debit";
      debit = isDebit ? m : 0;
      credit = isDebit ? 0 : m;
    }
    if (!compte || !date) {
      if (errors.length < 200) errors.push({ line: i + 1, msg: !compte ? "numéro de compte manquant" : "date d'écriture illisible" });
      continue;
    }
    lines.push({
      j: get(vals, "journalCode"),
      jl: get(vals, "journalLib"),
      num: get(vals, "ecritureNum"),
      date,
      compte,
      compteLib: get(vals, "compteLib"),
      aux: get(vals, "compAuxNum").replace(/\s/g, ""),
      auxLib: get(vals, "compAuxLib"),
      piece: get(vals, "pieceRef"),
      pieceDate: parseBankDate(get(vals, "pieceDate")),
      lib: get(vals, "ecritureLib"),
      debit,
      credit,
    });
  }
  return { lines, errors, sep };
}

// ── Écritures particulières
// À-nouveaux : soldes d'ouverture de l'exercice (journal AN / RAN / « A nouveaux »).
const AN_CODES = new Set(["an", "ran", "ano", "anouveau", "anouveaux", "ouv", "ouverture", "rn"]);
function isOpening(lines) {
  const l = lines[0];
  const code = norm(l.j), lib = norm(l.jl);
  return AN_CODES.has(code) || lib.includes("anouveau") || lib.includes("ouverture") || lib.includes("reportanouveau");
}
// Clôture : écriture qui solde les comptes de charges et produits dans le résultat
// (12x). Elle annulerait l'activité du dernier mois : on l'écarte.
function isClosing(lines) {
  let has12 = false, has67 = false;
  for (const l of lines) {
    if (l.compte.startsWith("12")) has12 = true;
    else if (l.compte[0] === "6" || l.compte[0] === "7") has67 = true;
  }
  return has12 && has67;
}

// Comptes de tiers regroupés sur leur racine (401, 411…) : le détail par client ou
// fournisseur est conservé à part, inutile de multiplier les lignes de balance.
const TIERS_ROOTS = /^4[01]/;
export const accountKey = (compte) => (TIERS_ROOTS.test(compte) ? compte.slice(0, 3) : compte);

const CLIENT_ROOTS = ["411", "413", "416"];
const SUPPLIER_ROOTS = ["401", "403", "404"];
const isClientAcc = (c) => CLIENT_ROOTS.some((r) => c.startsWith(r));
const isSupplierAcc = (c) => SUPPLIER_ROOTS.some((r) => c.startsWith(r));
// Identité d'un tiers : compte auxiliaire, sinon sous-compte (411DUPONT, 41100012).
function tiersId(l) {
  if (l.aux) return { n: l.aux, l: l.auxLib || l.aux };
  const rest = l.compte.slice(3).replace(/^0+$/, "");
  if (!rest) return null; // compte collectif sans détail
  return { n: l.compte, l: l.compteLib || l.compte };
}

const monthEnd = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
const nextMonth = (key) => {
  let [y, m] = key.split("-").map(Number);
  m++; if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
};
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// Résume le FEC : mouvements par compte et par mois, CA par client et achats par
// fournisseur, soldes ouverts des tiers à la date d'arrêté, et contrôles.
export function summarizeFec(parsed, { fileName = "" } = {}) {
  const { lines } = parsed;
  if (!lines.length) throw new Error("Aucune écriture lisible dans ce fichier.");

  // 1. Regroupement par écriture (journal + numéro)
  const ecritures = new Map();
  for (const l of lines) {
    const key = `${l.j}|${l.num || l.date + "|" + l.piece}`;
    let e = ecritures.get(key);
    if (!e) { e = []; ecritures.set(key, e); }
    e.push(l);
  }

  const months = new Map();
  const month = (key) => {
    let m = months.get(key);
    if (!m) { m = { acc: new Map(), cli: new Map(), fou: new Map(), n: 0, an: false }; months.set(key, m); }
    return m;
  };
  const tiers = new Map(); // "C|n" → { s, n, l, items: [{date, piece, lib, amt}] }
  let totalD = 0, totalC = 0, unbalanced = 0, closingCount = 0, anCount = 0;
  let minDate = null, maxDate = null, anDate = null;

  for (const e of ecritures.values()) {
    const d = e.reduce((s, l) => s + l.debit, 0), c = e.reduce((s, l) => s + l.credit, 0);
    totalD += d; totalC += c;
    if (Math.abs(d - c) > 0.05) unbalanced++;
    if (isClosing(e)) { closingCount++; continue; }
    const an = isOpening(e);
    if (an) anCount++;
    for (const l of e) {
      if (!minDate || l.date < minDate) minDate = l.date;
      if (!maxDate || l.date > maxDate) maxDate = l.date;
      if (an && (!anDate || l.date < anDate)) anDate = l.date;
      const mk = l.date.slice(0, 7);
      const m = month(mk);
      m.n++;
      if (an) m.an = true;
      const ak = accountKey(l.compte);
      let a = m.acc.get(ak);
      if (!a) { a = { l: TIERS_ROOTS.test(l.compte) ? "" : l.compteLib, d: 0, cr: 0, ad: 0, ac: 0 }; m.acc.set(ak, a); }
      if (!a.l && l.compteLib && !TIERS_ROOTS.test(l.compte)) a.l = l.compteLib;
      if (an) { a.ad += l.debit; a.ac += l.credit; } else { a.d += l.debit; a.cr += l.credit; }

      // Soldes des tiers (à-nouveaux compris)
      const isC = isClientAcc(l.compte), isF = !isC && isSupplierAcc(l.compte);
      if (isC || isF) {
        const t = tiersId(l);
        if (t) {
          const tk = (isC ? "C|" : "F|") + t.n;
          let tt = tiers.get(tk);
          if (!tt) { tt = { s: isC ? "C" : "F", n: t.n, l: t.l, items: [] }; tiers.set(tk, tt); }
          tt.items.push({ date: l.pieceDate && !an ? l.pieceDate : l.date, piece: l.piece, lib: an ? "Report à nouveau" : l.lib, amt: l.debit - l.credit });
        }
      }
    }

    // CA par client / achats par fournisseur : une écriture de facture avec un seul tiers
    if (!an) {
      const mk = e[0].date.slice(0, 7);
      let ventes = 0, achats = 0;
      const clients = new Map(), fournisseurs = new Map();
      for (const l of e) {
        if (l.compte.startsWith("70")) ventes += l.credit - l.debit;
        else if (/^6[012]/.test(l.compte)) achats += l.debit - l.credit;
        if (isClientAcc(l.compte)) { const t = tiersId(l); if (t) clients.set(t.n, t.l); }
        else if (isSupplierAcc(l.compte)) { const t = tiersId(l); if (t) fournisseurs.set(t.n, t.l); }
      }
      if (Math.abs(ventes) > 0.005 && clients.size === 1) {
        const [n, lib] = [...clients][0];
        const m = month(mk); const x = m.cli.get(n) || { l: lib, v: 0 }; x.v += ventes; m.cli.set(n, x);
      }
      if (Math.abs(achats) > 0.005 && fournisseurs.size === 1) {
        const [n, lib] = [...fournisseurs][0];
        const m = month(mk); const x = m.fou.get(n) || { l: lib, v: 0 }; x.v += achats; m.fou.set(n, x);
      }
    }
  }

  // 2. Exercice couvert : du jour des à-nouveaux (ou de la 1re écriture) à la dernière
  // Sans à-nouveaux (premier exercice), l'exercice commence le 1er du mois de la première écriture.
  const exStart = anDate || `${minDate.slice(0, 7)}-01`;
  const info = fecFileInfo(fileName);
  const exKeyStart = exStart.slice(0, 7), lastKey = maxDate.slice(0, 7);
  const monthKeys = [];
  for (let k = exKeyStart; k <= lastKey; k = nextMonth(k)) monthKeys.push(k);
  // Des écritures antérieures aux à-nouveaux (rare) : on garde leurs mois aussi.
  for (const k of months.keys()) if (!monthKeys.includes(k)) monthKeys.push(k);
  monthKeys.sort();

  const meta = { k: "m", ex: exStart, fin: maxDate, fichier: fileName, siren: info.siren, cloture: info.cloture };
  const outMonths = monthKeys.map((key) => {
    const m = months.get(key) || { acc: new Map(), cli: new Map(), fou: new Map(), n: 0, an: false };
    const rows = [{ ...meta, an: m.an }];
    for (const [c, a] of m.acc) rows.push({ k: "a", c, l: a.l, d: r2(a.d), cr: r2(a.cr), ad: r2(a.ad), ac: r2(a.ac) });
    const top = (map, kind) => [...map].filter(([, x]) => Math.abs(x.v) > 0.5).sort((a, b) => b[1].v - a[1].v).slice(0, 60)
      .forEach(([n, x]) => rows.push({ k: kind, n, l: x.l, v: r2(x.v) }));
    top(m.cli, "c");
    top(m.fou, "f");
    return { mois: key, rows, count: m.n };
  });

  // 3. Soldes ouverts des tiers à la date d'arrêté (règlements imputés sur les
  // factures les plus anciennes : fiable même sans lettrage).
  const tiersRows = [];
  for (const t of tiers.values()) {
    const solde = t.items.reduce((s, it) => s + it.amt, 0);
    const open = t.s === "C" ? solde : -solde;
    if (open <= 0.5) continue;
    const invoices = t.items.filter((it) => (t.s === "C" ? it.amt > 0 : it.amt < 0))
      .map((it) => ({ ...it, amt: Math.abs(it.amt) })).sort((a, b) => (a.date < b.date ? 1 : -1));
    let rest = open; const items = [];
    for (const it of invoices) {
      if (rest <= 0.005) break;
      const part = Math.min(rest, it.amt);
      items.push({ d: it.date, p: it.piece, lib: it.lib, m: r2(part), age: Math.max(0, daysBetween(it.date, maxDate)) });
      rest -= part;
    }
    if (rest > 0.5) items.push({ d: exStart, p: "", lib: "Solde antérieur", m: r2(rest), age: Math.max(0, daysBetween(exStart, maxDate)) });
    // Au-delà de 25 factures, les plus anciennes sont regroupées.
    let kept = items;
    if (items.length > 25) {
      const old = items.slice(24);
      kept = [...items.slice(0, 24), { d: old[old.length - 1].d, p: "", lib: `${old.length} factures plus anciennes`, m: r2(old.reduce((s, x) => s + x.m, 0)), age: old[old.length - 1].age }];
    }
    tiersRows.push({ k: "t", s: t.s, n: t.n, l: t.l, solde: r2(open), items: kept });
  }
  tiersRows.sort((a, b) => b.solde - a.solde);
  const tiersImport = { mois: lastKey, rows: [{ ...meta, k: "m" }, ...tiersRows.slice(0, 400)], count: tiersRows.length };

  const stats = {
    lignes: lines.length,
    ecritures: ecritures.size,
    totalDebit: r2(totalD),
    totalCredit: r2(totalC),
    ecart: r2(totalD - totalC),
    desequilibrees: unbalanced,
    clotures: closingCount,
    aNouveaux: anCount,
    debut: exStart,
    fin: maxDate,
    mois: monthKeys,
    partielFin: maxDate < monthEnd(lastKey),
    siren: info.siren,
    cloture: info.cloture,
    erreurs: parsed.errors || [],
  };
  return { months: outMonths, tiers: tiersImport, stats };
}
