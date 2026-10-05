// Lecture et classement d'un relevé bancaire (CSV ou OFX) pour l'import client.
// Tout se passe dans le navigateur : seules les opérations retenues sont ensuite
// enregistrées (imports_csv), jamais le fichier brut.

// ── Décodage : les exports bancaires français sont souvent en Windows-1252.
export function decodeBankFile(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// ── Montant : "1 234,56" · "-45,00" · "−45,00 €" · "(45,00)" · "1,234.56" → nombre
export function parseAmount(raw) {
  let v = String(raw ?? "").trim();
  if (!v) return null;
  let neg = false;
  if (/^\(.*\)$/.test(v)) { neg = true; v = v.slice(1, -1); }
  v = v.replace(/[\s  €]|EUR/gi, "").replace(/[−–]/g, "-");
  if (v.endsWith("-")) { neg = true; v = v.slice(0, -1); }
  if (v.startsWith("+")) v = v.slice(1);
  const lastComma = v.lastIndexOf(","), lastDot = v.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    v = lastComma > lastDot ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  } else if (lastComma > -1) {
    v = v.replace(/,/g, ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  const n = parseFloat(v);
  return neg ? -Math.abs(n) : n;
}

// ── Date : "05/09/2026" · "5/9/26" · "2026-09-05" · "20260905" · "05.09.2026" → "2026-09-05"
export function parseBankDate(raw) {
  const v = String(raw ?? "").trim();
  let y, m, d, mt;
  if ((mt = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; if (y < 100) y += 2000; }
  else if ((mt = v.match(/^(\d{4})(\d{2})(\d{2})/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else return null;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ── CSV avec guillemets (les libellés bancaires contiennent souvent ; ou ,)
function splitCsvLine(line, sep) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const DATE_KEYS = ["date operation", "date op", "dateop", "date comptable", "date de comptabilisation", "date", "settlement date", "booking date", "transaction date"];
const LABEL_KEYS = ["libelle", "label", "description", "intitule", "detail", "details", "communication", "nature", "counterparty", "contrepartie", "beneficiaire", "operation"];
const AMOUNT_KEYS = ["montant", "amount", "somme", "valeur", "montant (eur)", "montant eur"];
const DEBIT_KEYS = ["debit", "debits", "sortie", "depense"];
const CREDIT_KEYS = ["credit", "credits", "entree", "recette"];

function findCol(headers, keys, exclude = []) {
  const h = headers.map(norm);
  for (const k of keys) {
    const i = h.findIndex((x, idx) => !exclude.includes(idx) && (x === k || x.startsWith(k + " ") || x.includes(k)) && !x.includes("valeur") === !k.includes("valeur"));
    if (i > -1) return i;
  }
  for (const k of keys) {
    const i = h.findIndex((x, idx) => !exclude.includes(idx) && x.includes(k));
    if (i > -1) return i;
  }
  return -1;
}

// Colonnes devinées à partir de l'en-tête ; null si l'essentiel manque.
export function detectColumns(headers) {
  const date = findCol(headers, DATE_KEYS);
  const debit = findCol(headers, DEBIT_KEYS, [date]);
  const credit = findCol(headers, CREDIT_KEYS, [date, debit]);
  const amount = debit > -1 && credit > -1 ? -1 : findCol(headers, AMOUNT_KEYS, [date]);
  const label = findCol(headers, LABEL_KEYS, [date, debit, credit, amount]);
  if (date < 0 || label < 0 || (amount < 0 && (debit < 0 || credit < 0))) return null;
  return { date, label, amount, debit, credit };
}

// Lit le CSV : cherche la ligne d'en-tête (les banques ajoutent souvent des lignes
// d'informations sur le compte avant), devine le séparateur et les colonnes.
export function parseBankCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const sep = [";", "\t", ","].sort((a, b) => lines[i].split(b).length - lines[i].split(a).length)[0];
    const headers = splitCsvLine(lines[i], sep);
    if (headers.length < 2) continue;
    const cols = detectColumns(headers);
    if (!cols) continue;
    const rows = lines.slice(i + 1).map((l) => splitCsvLine(l, sep)).filter((r) => r.length >= 2);
    return { headers, rows, cols };
  }
  // Pas d'en-tête reconnu : on renvoie les premières lignes pour un choix manuel.
  const sep = [";", "\t", ","].sort((a, b) => (lines[0] || "").split(b).length - (lines[0] || "").split(a).length)[0];
  const rows = lines.map((l) => splitCsvLine(l, sep));
  return { headers: rows[0] || [], rows: rows.slice(1), cols: null };
}

// Transforme les lignes CSV en opérations { date, libelle, montant } (montant signé).
export function csvToTransactions(rows, cols) {
  const out = [];
  for (const r of rows) {
    const date = parseBankDate(r[cols.date]);
    if (!date) continue;
    let montant;
    if (cols.amount > -1) montant = parseAmount(r[cols.amount]);
    else {
      const d = parseAmount(r[cols.debit]), c = parseAmount(r[cols.credit]);
      if (d == null && c == null) continue;
      montant = (c ? Math.abs(c) : 0) - (d ? Math.abs(d) : 0);
    }
    if (montant == null || montant === 0) continue;
    const libelle = String(r[cols.label] ?? "").replace(/\s+/g, " ").trim() || "Opération";
    out.push({ date, libelle, montant: Math.round(montant * 100) / 100 });
  }
  return out;
}

// ── OFX (format standard proposé par la plupart des banques)
export function parseOfx(text) {
  const out = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const tag = (b, t) => { const m = b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, "i")); return m ? m[1].trim() : ""; };
  for (const b of blocks) {
    const date = parseBankDate(tag(b, "DTPOSTED"));
    const montant = parseAmount(tag(b, "TRNAMT"));
    if (!date || montant == null || montant === 0) continue;
    const libelle = [tag(b, "NAME"), tag(b, "MEMO")].filter(Boolean).join(" · ").replace(/\s+/g, " ").trim() || "Opération";
    out.push({ date, libelle, montant: Math.round(montant * 100) / 100 });
  }
  return out;
}

export function isOfx(text) { return /<OFX>|OFXHEADER/i.test(text.slice(0, 2000)); }

// ── Classement automatique
export const BANK_CATEGORIES = [
  { id: "vente", label: "Vente", short: "Ventes" },
  { id: "achat", label: "Achat de marchandises", short: "Achats" },
  { id: "charge_fixe", label: "Charge fixe", short: "Charges fixes" },
  { id: "charge_variable", label: "Charge variable", short: "Charges variables" },
  { id: "salaire", label: "Salaire versé", short: "Salaires" },
  { id: "cotisation", label: "Cotisations sociales", short: "Cotisations" },
  { id: "exclu", label: "Ne pas compter", short: "Exclues" },
];

const RULES = [
  // Ne pas compter : ni produit ni charge (TVA, impôt, emprunt, mouvements internes)
  { re: /\b(DGFIP|IMPOTS?|IMPOT\.GOUV|TRESOR PUBLIC|SIE |T\.V\.A|TVA\b|CFE\b)/, cat: "exclu", why: "Impôts / TVA" },
  { re: /\b(ECHEANCE|ECH\.? PRET|REMB\.? PRET|REMBOURSEMENT PRET|PRET N|PRET IMMO|PRET PRO|CAPITAL RESTANT)/, cat: "exclu", why: "Emprunt" },
  { re: /\b(VIR(EMENT)? INTERNE|ENTRE (MES |VOS )?COMPTES|VERS LIVRET|EPARGNE|LIVRET|APPORT|COMPTE COURANT D?'?ASSOCIE|CCA\b)/, cat: "exclu", why: "Virement interne" },
  // Masse salariale
  { re: /\b(URSSAF|AGIRC|ARRCO|RETRAITE|PREVOYANCE|HUMANIS|MALAKOFF|AG2R|KLESIA|PRO BTP|FRANCE TRAVAIL|POLE EMPLOI|DSN)\b/, cat: "cotisation" },
  { re: /\b(SALAIRES?|PAIE|VIR(EMENT)? SAL|ACOMPTE SAL|NET A PAYER)\b/, cat: "salaire" },
  // Charges fixes courantes
  { re: /\b(LOYER|BAIL|SCI |FONCIA|NEXITY)/, cat: "charge_fixe", tva: 0 },
  { re: /\b(ASSURANCE|AXA|MAAF|MMA|ALLIANZ|GENERALI|MACIF|MAIF|MATMUT|HISCOX|GROUPAMA)\b/, cat: "charge_fixe", tva: 0 },
  { re: /\b(FRAIS|COMMISSION|COTIS(ATION)? CARTE|ABONNEMENT BANC|AGIOS|INTERETS DEBITEURS|TENUE DE COMPTE)\b/, cat: "charge_fixe", tva: 0 },
  { re: /\b(EDF|ENGIE|TOTAL ?ENERGIES|ENI |VEOLIA|SUEZ|EAU DE|GAZ )/, cat: "charge_fixe" },
  { re: /\b(ORANGE|SFR|FREE ?(MOBILE|PRO)?|BOUYGUES|SOSH|RED BY)\b/, cat: "charge_fixe" },
  { re: /\b(EXPERT[- ]?COMPTABLE|COMPTABLE|HONORAIRES|AVOCAT|NOTAIRE)\b/, cat: "charge_fixe" },
  { re: /\b(MICROSOFT|GOOGLE|ADOBE|OVH|SHOPIFY|CANVA|APPLE\.COM|SLACK|NOTION|ZOOM|QONTO|SHINE|LOGICIEL|ABONNEMENT)\b/, cat: "charge_fixe" },
  // Remboursements reçus : à vérifier, pas du chiffre d'affaires
  { re: /\b(REMB(OURSEMENT)?|AVOIR|RETOUR|REFUND)\b/, cat: "exclu", why: "Remboursement", creditOnly: true },
  { re: /\b(DEBLOCAGE|DEBLOC\.? PRET|VERSEMENT PRET)\b/, cat: "exclu", why: "Emprunt", creditOnly: true },
];

export function categorize(tx) {
  const L = norm(tx.libelle).toUpperCase();
  for (const r of RULES) {
    if (r.creditOnly && tx.montant < 0) continue;
    if (!r.creditOnly && tx.montant > 0 && r.cat !== "exclu") continue; // charges/salaires : seulement les débits
    if (r.re.test(L)) return { cat: r.cat, tva: r.tva };
  }
  return { cat: tx.montant > 0 ? "vente" : "charge_variable" };
}

// Clé « opérations similaires » : le libellé sans dates, numéros ni références.
export function similarKey(libelle) {
  return norm(libelle).toUpperCase()
    .replace(/\b(CB|PRLV|PRELEVEMENT|SEPA|VIR(EMENT)?|CARTE|FACTURE|ECH(EANCE)?|DU|LE|DE|REF|N°?)\b/g, " ")
    .replace(/[0-9][0-9/.:\-]*/g, " ")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ");
}

// ── Conversion en lignes d'import, groupées par type et par mois
// tvaVentes : taux sur les ventes en % (0 = pas de TVA) ; sert aussi de taux par
// défaut des achats et charges, sauf règle contraire (assurances, frais bancaires…).
export function toImportGroups(txs, tvaVentes) {
  const round = (n) => String(Math.round(n * 100) / 100);
  const groups = {}; // `${type}|${mois}` → rows
  const push = (type, mois, row) => { (groups[`${type}|${mois}`] = groups[`${type}|${mois}`] || []).push(row); };
  for (const t of txs) {
    if (t.cat === "exclu") continue;
    const mois = t.date.slice(0, 7);
    const ttc = Math.abs(t.montant);
    const base = { date: t.date, libelle: t.libelle, montant_ttc: round(ttc), source: "banque" };
    const taux = tvaVentes === 0 ? 0 : (t.tva ?? tvaVentes);
    const ht = ttc / (1 + taux / 100);
    if (t.cat === "vente") {
      const signed = t.montant > 0 ? ht : -ht;
      push("ventes_produits", mois, { ...base, ca_ht: round(signed), cout_achat_ht: "0", marge_ht: round(signed) });
    } else if (t.cat === "achat") {
      // Achat de marchandises : réduit la marge sans toucher au CA (onglet Coûts d'achat).
      push("ventes_produits", mois, { ...base, ca_ht: "0", cout_achat_ht: round(ht), marge_ht: round(-ht) });
    } else if (t.cat === "charge_fixe" || t.cat === "charge_variable") {
      push("charges", mois, { ...base, fournisseur: t.libelle.slice(0, 60), montant_ht: round(ht), taux_tva: String(taux), tva_recuperable: taux > 0 ? "oui" : "non", type: t.cat === "charge_fixe" ? "fixe" : "variable" });
    } else if (t.cat === "salaire") {
      push("salaires", mois, { ...base, nom_prenom: t.libelle.slice(0, 60), salaire_brut: round(ttc), cotisations_patronales: "0", salaire_net: round(ttc) });
    } else if (t.cat === "cotisation") {
      push("salaires", mois, { ...base, nom_prenom: t.libelle.slice(0, 60), salaire_brut: "0", cotisations_patronales: round(ttc), salaire_net: "0" });
    }
  }
  return Object.entries(groups).map(([k, rows]) => { const [type, mois] = k.split("|"); return { type, mois, rows }; })
    .sort((a, b) => (a.mois + a.type).localeCompare(b.mois + b.type));
}

// Fusion avec un import bancaire existant du même mois : le nouveau relevé fait foi
// sur la période qu'il couvre, les opérations hors de cette période sont conservées
// (relevés qui se chevauchent ou qui se suivent).
export function mergeWithExisting(existingRows, newRows, rangeStart, rangeEnd) {
  const kept = (existingRows || []).filter((r) => r.source === "banque" && (r.date < rangeStart || r.date > rangeEnd));
  return [...kept, ...newRows].sort((a, b) => a.date.localeCompare(b.date));
}
