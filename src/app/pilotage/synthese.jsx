"use client";
// SYNTHÈSE · la page d'accueil de l'espace client. Objectif : comprendre en moins
// d'une minute où en est l'entreprise ce mois-ci (en clair, en chiffres, en
// tendance), puis aller au détail d'un clic. Fonctionne avec la comptabilité
// importée (FEC, chiffres exacts) comme avec les imports simplifiés (estimations).
import { useState } from "react";
import { C, Card, Btn, Info } from "@/app/charte";
import { fecIndex, ytdKeys, plOver, sigOf, bilanAt, ratiosAt, tiersAt, topTiers, shiftKey, monthKey, keyLabel, monthEnd } from "@/lib/pilotage";
import { VIZ, eur, pctFr, Colonnes, Courbe, Repartition, Variation, Legende, STATUT, PastilleStatut } from "@/app/pilotage/graphiques";
import { lireBudget, ebeDe, budgetMois } from "@/lib/budget";
import { lireActions, enRetard } from "@/lib/actions";
import { prolongerTresorerie } from "@/lib/prevision";
import { ValeurCreee } from "@/app/pilotage/decisions";

const split = (key) => { const [y, m] = key.split("-").map(Number); return [m - 1, y]; };
const DATA_TYPES = new Set(["fec", "ventes_produits", "autres_ventes", "charges", "salaires"]);
const todayKey = () => { const d = new Date(); return monthKey(d.getMonth(), d.getFullYear()); };
// Dernier mois pour lequel des chiffres existent (pas après le mois en cours).
export function latestDataKey(client) {
  const now = todayKey();
  return (client.imports || []).filter((i) => DATA_TYPES.has(i.type) && i.mois <= now).map((i) => i.mois).sort().pop() || null;
}
const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

export function NavMois({ moisIdx, moisYear, setMoisIdx, onDark = false }) {
  const label = keyLabel(monthKey(moisIdx, moisYear));
  const btn = { width: 30, height: 30, borderRadius: "50%", border: "none", background: onDark ? "rgba(255,255,255,.14)" : C.bg, color: onDark ? "white" : C.primary, fontSize: 16, fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  return (
    <div className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: onDark ? "rgba(255,255,255,.08)" : C.white, border: `1px solid ${onDark ? "rgba(255,255,255,.18)" : C.border}`, borderRadius: 100, padding: 4 }}>
      <button aria-label="Mois précédent" style={btn} onClick={() => setMoisIdx((m) => m - 1)}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 900, color: onDark ? "white" : C.text, minWidth: 128, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
      <button aria-label="Mois suivant" style={btn} onClick={() => setMoisIdx((m) => m + 1)}>›</button>
    </div>
  );
}

export function Titre({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "6px 2px 10px" }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: C.textMid, letterSpacing: "0.1em", textTransform: "uppercase" }}>{children}</div>
      {action}
    </div>
  );
}

// sub : explication au clic sur « i » ; detail : information factuelle visible.
function CarteTitre({ title, sub, detail, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 22px 0" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.text, display: "flex", alignItems: "center" }}>{title}<Info>{sub}</Info></div>
        {detail && <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700, marginTop: 2 }}>{detail}</div>}
      </div>
      {action}
    </div>
  );
}
const Lien = ({ onClick, children }) => (
  <button onClick={onClick} style={{ background: "none", border: "none", color: C.primary, fontSize: 12.5, fontWeight: 800, cursor: "pointer", padding: 0, whiteSpace: "nowrap", fontFamily: "inherit" }}>{children} →</button>
);

// Indicateur : valeur, comparaisons, définition au clic sur « i ».
function Indicateur({ label, aide, value, sub, deltas = [], onClick, muted }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
      style={{ background: C.white, border: `1.5px solid ${C.text}`, borderRadius: 20, padding: "18px 20px", boxShadow: "0 16px 36px rgba(0,86,83,.06)", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center" }}>{label}<Info>{aide}</Info></div>
      <div style={{ fontSize: 26, fontWeight: 900, color: muted ? C.textLight : C.text, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textMid }}>{sub}</div>}
      {deltas.filter(Boolean).length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{deltas.filter(Boolean)}</div>}
    </div>
  );
}

// ── Données du mois, normalisées quelle que soit la source
function donneesSynthese({ client, moisIdx, moisYear, kpisOf, tresoOf }) {
  const key = monthKey(moisIdx, moisYear);
  const k = kpisOf(moisIdx, moisYear);
  const isFec = k.source === "fec";
  const idx = fecIndex(client);
  const at = (kk) => kpisOf(...split(kk));
  const kp = at(shiftKey(key, -1));
  const kn = at(shiftKey(key, -12));
  const ytdList = isFec ? ytdKeys(idx, key) : Array.from({ length: moisIdx + 1 }, (_, i) => monthKey(i, moisYear));
  const sum = (keys) => {
    const xs = keys.map(at);
    const ok = xs.filter((x) => x.hasData);
    const t = ok.reduce((s, x) => ({ ca: s.ca + x.ca, marge: s.marge + x.marge, ebe: s.ebe + x.ebe, result: s.result + x.result, charges: s.charges + x.charges, salaires: s.salaires + x.salaires, amort: s.amort + (x.amort || 0) }), { ca: 0, marge: 0, ebe: 0, result: 0, charges: 0, salaires: 0, amort: 0 });
    return { ...t, n: ok.length, complete: ok.length === keys.length };
  };
  const ytd = sum(ytdList);
  const ytdN1Raw = sum(ytdList.map((x) => shiftKey(x, -12)));
  const ytdN1 = ytdN1Raw.complete && ytdN1Raw.n > 0 ? ytdN1Raw : null;

  // Où vont 100 € de ventes (sur l'exercice, plus stable qu'un mois isolé)
  let rep;
  if (isFec) {
    const pl = plOver(idx, ytdList), s = sigOf(pl);
    rep = { ca: s.ca, achats: s.consommations, externes: pl.chargesExternes, personnel: s.personnel, resultat: s.rn };
  } else rep = { ca: ytd.ca, achats: ytd.ca - ytd.marge, externes: ytd.charges, personnel: ytd.salaires, resultat: ytd.result };
  rep.autres = rep.ca - rep.achats - rep.externes - rep.personnel - rep.resultat;

  const tresoConfiguree = isFec || !!client.tresorerie?.dateSolde || (client.tresorerie?.soldeInitial || 0) !== 0;
  const series = Array.from({ length: 12 }, (_, i) => {
    const kk = shiftKey(key, i - 11);
    const x = at(kk), x1 = at(shiftKey(kk, -12));
    const [mi, yr] = split(kk);
    const t = idx.months.has(kk) ? bilanAt(client, kk).tresoNette : tresoConfiguree && x.hasData ? tresoOf(mi, yr) : null;
    return { key: kk, l: keyLabel(kk, false).replace(/ \d+$/, ""), current: kk === key, v: x.hasData ? x.ca : null, n1: x1.hasData ? x1.ca : null, ebe: x.hasData ? x.ebe : null, treso: t };
  });

  const bil = isFec ? bilanAt(client, key) : null;
  const ratios = isFec ? ratiosAt(client, key) : null;
  const treso = isFec ? bil.tresoNette : tresoConfiguree ? tresoOf(moisIdx, moisYear) : null;
  const tresoPrev = series[10].treso;
  const clients = isFec ? tiersAt(client, key, "C") : null;
  const topClients = isFec ? topTiers(client, ytdList, "c") : [];
  const meta = isFec ? idx.months.get(key).meta : null;
  // Principales dépenses de l'exercice
  let depenses = [];
  if (isFec) {
    const pl = plOver(idx, ytdList);
    const n1 = ytdList.map((x) => shiftKey(x, -12));
    const pl1 = n1.every((x) => idx.months.has(x)) ? plOver(idx, n1) : null;
    const groups = new Map();
    for (const a of pl.accounts.values()) {
      if (!["chargesExternes", "achatsMarch", "achatsMat", "impotsTaxes"].includes(a.poste)) continue;
      const g = groups.get(a.c) || { l: a.l, v: 0, v1: 0 };
      g.v += a.v; g.v1 += pl1?.accounts.get(a.c)?.v || 0;
      groups.set(a.c, g);
    }
    depenses = [...groups.values()].sort((a, b) => b.v - a.v).slice(0, 6).map((g) => ({ ...g, v1: pl1 ? g.v1 : null }));
  } else {
    const rows = (client.imports || []).filter((i) => i.type === "charges" && ytdList.includes(i.mois)).flatMap((i) => i.rows || []);
    const g = new Map();
    rows.forEach((r) => { const l = r.fournisseur || r.libelle || "Autre"; g.set(l, (g.get(l) || 0) + (parseFloat(r.montant_ht) || 0)); });
    depenses = [...g].map(([l, v]) => ({ l, v, v1: null })).sort((a, b) => b.v - a.v).slice(0, 6);
  }
  return { key, k, kp, kn, isFec, ytdList, ytd, ytdN1, rep, series, bil, ratios, treso, tresoPrev, tresoConfiguree, clients, topClients, meta, depenses };
}

// ── Lecture en clair
function lecture(d, client, gratuit) {
  const { key, k, kp, kn, ytd, ytdN1, treso, tresoPrev, ratios, clients, isFec } = d;
  const mois = keyLabel(key);
  const phrases = [];
  let p1 = `En ${mois}, vous avez réalisé ${eur(k.ca)} de chiffre d'affaires`;
  const evo = (a, b) => (b && Math.abs(b) > 1 ? ((a - b) / Math.abs(b)) * 100 : null);
  const eN1 = kn.hasData ? evo(k.ca, kn.ca) : null, eM1 = kp.hasData ? evo(k.ca, kp.ca) : null;
  if (eN1 != null) p1 += `, ${Math.abs(eN1) < 1 ? "autant qu'en" : eN1 > 0 ? `${pctFr(eN1)} de plus qu'en` : `${pctFr(-eN1)} de moins qu'en`} ${keyLabel(shiftKey(key, -12))}`;
  else if (eM1 != null) p1 += `, ${Math.abs(eM1) < 1 ? "autant que le mois précédent" : eM1 > 0 ? `${pctFr(eM1)} de plus que le mois précédent` : `${pctFr(-eM1)} de moins que le mois précédent`}`;
  phrases.push(p1 + ".");
  if (k.ca > 0) {
    const pour100 = Math.round((k.ebe / k.ca) * 100);
    phrases.push(k.ebe >= 0
      ? `Une fois les achats, les charges et les salaires payés, l'activité a dégagé ${eur(k.ebe)}, soit ${pour100} € pour 100 € vendus.`
      : `Ce mois-ci, les achats, les charges et les salaires ont dépassé les ventes de ${eur(-k.ebe)}${ytd.n > 1 && ytd.ebe > 0 ? `, mais depuis le début de l'exercice l'activité reste positive (${eur(ytd.ebe)} dégagés)` : ""}.`);
  }
  if (treso != null && !gratuit) {
    let p3 = treso >= 0 ? `Votre trésorerie ${isFec ? "s'élève" : "est estimée"} à ${eur(treso)} en fin de mois` : `Vos comptes bancaires sont à découvert de ${eur(-treso)} en fin de mois`;
    if (tresoPrev != null && Math.abs(treso - tresoPrev) > 1) p3 += ` (${treso > tresoPrev ? "+" : "−"}${eur(Math.abs(treso - tresoPrev))} sur le mois)`;
    if (ratios?.autonomieTreso != null && treso > 0) p3 += `, de quoi couvrir environ ${ratios.autonomieTreso.toFixed(1).replace(".", ",")} mois de dépenses courantes`;
    phrases.push(p3 + ".");
  }
  // Un seul point d'attention, le plus parlant
  let attention = null;
  if (gratuit) return { phrases, attention };
  if (clients && clients.total > 0) {
    const vieux = clients.buckets[2].v + clients.buckets[3].v;
    if (vieux > 1000 && vieux / clients.total > 0.15) attention = `${eur(vieux)} de factures clients ont plus de 60 jours : les relancer libérerait de la trésorerie.`;
  }
  if (!attention && ytdN1 && ytdN1.ca > 0 && ytd.ca > 0) {
    const t = (ytd.marge / ytd.ca) * 100, t1 = (ytdN1.marge / ytdN1.ca) * 100;
    if (t1 - t > 3) attention = `Votre taux de marge brute recule (${Math.round(t)} % contre ${Math.round(t1)} % en N-1) : les prix d'achat sont la première piste à regarder.`;
  }
  if (!attention && ratios?.autonomieTreso != null && ratios.autonomieTreso < 1 && treso >= 0) attention = `La trésorerie couvre moins d'un mois de dépenses : anticiper les prochaines échéances (TVA, URSSAF, fournisseurs) est prioritaire.`;
  return { phrases, attention };
}

// ── État de santé en 4 points
function sante(d) {
  const { ytd, ytdN1, series, ratios, treso, isFec, clients, k } = d;
  const items = [];
  // Activité
  if (ytdN1 && ytdN1.ca > 0) {
    const e = (ytd.ca / ytdN1.ca - 1) * 100;
    items.push({ id: "act", label: "Activité", statut: e >= 0 ? "ok" : e > -10 ? "warn" : "bad", text: `CA cumul ${e >= 0 ? "+" : "−"}${pctFr(Math.abs(e))} vs N-1` });
  } else {
    const last3 = series.slice(-3).filter((s) => s.v != null), prev3 = series.slice(-6, -3).filter((s) => s.v != null);
    if (last3.length === 3 && prev3.length === 3) {
      const a = last3.reduce((s, x) => s + x.v, 0), b = prev3.reduce((s, x) => s + x.v, 0);
      const e = b > 0 ? (a / b - 1) * 100 : 0;
      items.push({ id: "act", label: "Activité", statut: e >= 0 ? "ok" : e > -10 ? "warn" : "bad", text: `CA ${e >= 0 ? "+" : "−"}${pctFr(Math.abs(e))} sur 3 mois glissants` });
    } else items.push({ id: "act", label: "Activité", statut: "na", text: "Historique trop court" });
  }
  // Rentabilité
  if (ytd.ca > 0) {
    const t = (ytd.ebe / ytd.ca) * 100;
    items.push({ id: "rent", label: "Rentabilité", statut: t >= 8 ? "ok" : t >= 0 ? "warn" : "bad", text: `EBE ${pctFr(t, 1)} du CA (cumul)` });
  } else items.push({ id: "rent", label: "Rentabilité", statut: "na", text: "Pas encore de ventes" });
  // Trésorerie
  if (treso == null) items.push({ id: "treso", label: "Trésorerie", statut: "na", text: "Solde bancaire non renseigné" });
  else if (ratios?.autonomieTreso != null) {
    const m = ratios.autonomieTreso;
    items.push({ id: "treso", label: "Trésorerie", statut: treso < 0 ? "bad" : m >= 1.5 ? "ok" : m >= 0.7 ? "warn" : "bad", text: treso < 0 ? "Trésorerie nette négative" : `Couverture ${m.toFixed(1).replace(".", ",")} mois de charges` });
  } else {
    const dep = k.charges + k.salaires;
    const m = dep > 0 ? treso / dep : null;
    items.push({ id: "treso", label: "Trésorerie", statut: treso < 0 ? "bad" : m == null || m >= 1.5 ? "ok" : m >= 0.7 ? "warn" : "bad", text: treso < 0 ? "Trésorerie négative" : m != null ? `Couverture ≈ ${m.toFixed(1).replace(".", ",")} mois (estimation)` : "Estimation" });
  }
  // Encaissements clients
  if (isFec && ratios?.dso != null && clients) {
    const dso = Math.round(ratios.dso);
    items.push({ id: "enc", label: "Encaissements", statut: dso <= 45 ? "ok" : dso <= 75 ? "warn" : "bad", text: `DSO ${dso} jours` });
  } else items.push({ id: "enc", label: "Encaissements", statut: "na", text: isFec ? "Pas de créances clients" : "DSO disponible avec le FEC" });
  return items;
}

// ── Note mensuelle du conseiller (stockée comme import « note » du mois)
function NoteConseiller({ client, moisKey, isAdminPreview, onSaveImport }) {
  const note = (client.imports || []).find((i) => i.type === "note" && i.mois === moisKey);
  const texte = note?.rows?.[0]?.texte || "";
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(texte);
  const [etat, setEtat] = useState("");
  if (!texte && !isAdminPreview) return null;
  const save = async () => {
    setEtat("…");
    const ok = await onSaveImport({ type: "note", label: "Note du conseiller", mois: moisKey, rows: [{ texte: val.trim(), date: new Date().toISOString().slice(0, 10) }], count: 1, importedAt: new Date().toLocaleDateString("fr-FR") });
    setEtat(ok ? "Enregistré" : "Échec de l'enregistrement");
    if (ok) setEdit(false);
  };
  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.primary}`, borderRadius: 20, padding: "18px 22px", display: "flex", gap: 16, alignItems: "flex-start", boxShadow: "0 16px 36px rgba(0,86,83,.06)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{(client.advisorLabel || "N")[0]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: C.text, marginBottom: 6 }}>Le mot de votre conseiller · {client.advisorLabel || "NVM Finance"}</div>
        {edit || (!texte && isAdminPreview) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={4} placeholder="Votre lecture du mois pour le dirigeant : ce qui va bien, ce qu'on surveille, ce qu'on décide ensemble…" className="inp" style={{ resize: "vertical", lineHeight: 1.55 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn small onClick={save} disabled={!onSaveImport || !val.trim()}>Publier pour le client</Btn>
              {texte && <Btn small variant="ghost" onClick={() => { setVal(texte); setEdit(false); }}>Annuler</Btn>}
              {etat && <span style={{ fontSize: 12, fontWeight: 700, color: etat === "Enregistré" ? C.green : C.textMid }}>{etat}</span>}
            </div>
            {!onSaveImport && <div style={{ fontSize: 11.5, color: C.textLight }}>L'enregistrement est disponible depuis « Voir comme client ».</div>}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{texte}</div>
            {isAdminPreview && <div style={{ marginTop: 8 }}><Btn small variant="ghost" onClick={() => { setVal(texte); setEdit(true); }}>Modifier la note</Btn></div>}
          </>
        )}
      </div>
    </div>
  );
}

// Offre gratuite : bloc flouté qui renvoie vers la page verrouillée (bouton « Demander à mon conseiller »).
function Verrou({ titre, texte, viewId, setView, hauteur = 150 }) {
  return (
    <Card>
      <CarteTitre title={titre} />
      <div style={{ position: "relative", margin: "12px 22px 20px", borderRadius: 14, overflow: "hidden", border: `1.5px dashed ${C.border}`, minHeight: hauteur }}>
        <div aria-hidden style={{ filter: "blur(6px)", opacity: 0.45, padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ height: 44, borderRadius: 10, background: i % 2 ? C.borderLight : C.bg }} />)}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><PastilleStatut statut="lock" /><span style={{ fontSize: 13, fontWeight: 800, color: C.text, maxWidth: 420 }}>{texte}</span></div>
          <Btn small onClick={() => setView(viewId)}>Voir avec mon conseiller →</Btn>
        </div>
      </div>
    </Card>
  );
}

// Résumé du plan d'actions : ce qui est en cours, en retard, et la prochaine échéance.
function ResumeActions({ client, setView }) {
  const actions = lireActions(client);
  if (!actions.length) return null;
  const ouvertes = actions.filter((a) => a.statut !== "fait").sort((a, b) => ((a.echeance || "9999") < (b.echeance || "9999") ? -1 : 1));
  const retard = ouvertes.filter((a) => enRetard(a));
  return (
    <Card>
      <CarteTitre title="Plan d'actions" sub={`${ouvertes.length} action${ouvertes.length > 1 ? "s" : ""} en cours${retard.length ? `, dont ${retard.length} en retard` : ""} · ${actions.length - ouvertes.length} terminée${actions.length - ouvertes.length > 1 ? "s" : ""}.`} action={<Lien onClick={() => setView("actions")}>Tout voir</Lien>} />
      <div style={{ padding: "10px 22px 18px" }}>
        {ouvertes.slice(0, 4).map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.borderLight}` }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{a.titre}<span style={{ fontSize: 11.5, color: C.textLight, fontWeight: 700 }}> · {a.responsable}</span></span>
            <span style={{ fontSize: 12, fontWeight: 800, color: enRetard(a) ? C.orange : C.textMid, whiteSpace: "nowrap" }}>{a.echeance ? `${enRetard(a) ? "En retard · " : ""}${fmtDate(a.echeance)}` : "Sans échéance"}</span>
          </div>
        ))}
        {!ouvertes.length && <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Toutes les actions sont terminées.</div>}
      </div>
    </Card>
  );
}

const grid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap: 16 });

export default function Synthese(props) {
  const { client, moisIdx, moisYear, setMoisIdx, setMoisKey, setView, isAdminPreview, onSaveImport, kpisOf, tresoOf, alertes = [], canImport } = props;
  const key = monthKey(moisIdx, moisYear);
  const k = kpisOf(moisIdx, moisYear);
  const latest = latestDataKey(client);

  if (!k.hasData) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }} className="fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>Synthèse · {client.name}</div>
          <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />
        </div>
        <Card style={{ padding: "36px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Pas encore de chiffres pour {keyLabel(key)}</div>
          <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 18px" }}>
            {latest ? `Les derniers chiffres disponibles sont ceux de ${keyLabel(latest)}.` : canImport
              ? "Il ne manque que vos chiffres. Le plus complet : le fichier des écritures comptables (FEC) que votre logiciel comptable produit en deux clics. Le plus rapide : votre relevé bancaire (CSV ou OFX). Votre synthèse s'affiche aussitôt."
              : `Dès que ${client.advisorLabel || "votre conseiller"} aura importé vos données, votre synthèse s'affichera ici : activité, rentabilité, trésorerie et points d'attention, expliqués simplement.`}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {latest && setMoisKey && <Btn onClick={() => setMoisKey(latest)}>Voir {keyLabel(latest)}</Btn>}
            {canImport && <Btn variant="ghost" onClick={() => setView("import")}>Importer mes données</Btn>}
          </div>
        </Card>
        <NoteConseiller client={client} moisKey={key} isAdminPreview={isAdminPreview} onSaveImport={onSaveImport} />
      </div>
    );
  }

  const d = donneesSynthese({ client, moisIdx, moisYear, kpisOf, tresoOf });
  const { kp, kn, isFec, ytd, ytdN1, rep, series, ratios, treso, clients, topClients, meta, depenses, bil } = d;
  const gratuit = client.plan === "dashboard";
  // Trésorerie des 6 prochains mois (plan de trésorerie), en pointillés après le réel.
  const projection = gratuit ? [] : prolongerTresorerie(client, key, 6, tresoOf);
  const noteTexte = (client.imports || []).find((i) => i.type === "note" && i.mois === key)?.rows?.[0]?.texte || "";
  // Budget de l'année (s'il existe) : objectifs du mois et cumul sur les mêmes mois.
  const budget = lireBudget(client, moisYear);
  const bMois = budget ? budgetMois(budget, moisIdx) : null;
  const bCumul = budget ? d.ytdList.filter((k) => k.startsWith(`${moisYear}-`)).reduce((acc, k) => { const b = budgetMois(budget, Number(k.slice(5)) - 1); return { ca: acc.ca + b.ca, ebe: acc.ebe + ebeDe(b), n: acc.n + 1 }; }, { ca: 0, ebe: 0, n: 0 }) : null;
  const { phrases, attention } = lecture(d, client, gratuit);
  const etat = sante(d).map((it) => (gratuit && (it.id === "treso" || it.id === "enc") ? { ...it, statut: "lock", text: it.id === "treso" ? "Solde et échéances suivis chaque mois" : "Factures clients suivies chaque mois" } : it));
  const tm = (x) => (x.ca > 0 ? (x.marge / x.ca) * 100 : null);
  const vs = (cur, prev, ok, opts = {}) => (ok ? <Variation key={opts.label} cur={cur} prev={prev} label={opts.label} goodUp={opts.goodUp !== false} points={opts.points} /> : null);
  const pointsAttention = alertes.filter((a) => a.level === "red" || a.level === "orange").filter((a) => !a.isFiscal).sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));
  const echeances = alertes.filter((a) => a.isFiscal);
  const source = isFec
    ? `Comptabilité à jour au ${fmtDate(meta.fin)}${(meta.fin || "") < monthEnd(key) ? " (mois en cours de saisie)" : ""}`
    : "Chiffres issus de vos imports (relevé bancaire ou modèles) · estimations";
  // Période réellement couverte par des chiffres (l'exercice peut commencer avant le premier import).
  const moisAvecDonnees = d.ytdList.filter((k) => kpisOf(...split(k)).hasData);
  const debutDonnees = moisAvecDonnees[0] || key;
  const exLabel = debutDonnees < key ? `${keyLabel(debutDonnees, false)} → ${keyLabel(key, false)}${moisAvecDonnees.length < d.ytdList.length ? ` (${moisAvecDonnees.length} mois de données)` : ""}` : keyLabel(key, false);
  const repSegs = [
    { id: "achats", label: "Achats consommés", v: rep.achats, color: VIZ.achats },
    { id: "externes", label: "Charges externes", v: rep.externes, color: VIZ.externes },
    { id: "personnel", label: "Charges de personnel", v: rep.personnel, color: VIZ.personnel },
    { id: "autres", label: "Impôts, dotations, financier", v: rep.autres, color: VIZ.autres },
    ...(rep.resultat >= 0 ? [{ id: "resultat", label: "Résultat net", v: rep.resultat, color: VIZ.resultat }] : []),
  ].map((s) => ({ ...s, sub: rep.ca > 0 ? `${pctFr((s.v / rep.ca) * 100, 1)} du CA` : "" }));

  return (
    <div style={{ padding: "22px 24px 40px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1320, margin: "0 auto" }} className="fade-up">
      {isAdminPreview && <div style={{ padding: "10px 14px", background: C.orangeBg, border: `1px solid ${C.orange}55`, borderRadius: 12, fontSize: 12.5, fontWeight: 700, color: C.orange }}>Aperçu conseiller : vous voyez exactement ce que voit le client. Vous pouvez publier votre note du mois ci-dessous.</div>}

      {/* En-tête : l'essentiel du mois */}
      <div style={{ background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 60%, ${C.primaryLight} 100%)`, borderRadius: 24, padding: "24px 26px", color: "white", boxShadow: "0 18px 40px rgba(0,86,83,.22)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>{client.name}{client.sector ? ` · ${client.sector}` : ""}</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>L'essentiel de {keyLabel(key)}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, background: "rgba(255,255,255,.12)", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: isFec ? "#4ade80" : "#fbbf24" }} />{source}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="no-print" onClick={() => window.print()} title="Imprimer ou enregistrer en PDF" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)", color: "white", borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Imprimer / PDF</button>
            <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} onDark />
          </div>
        </div>
        {gratuit ? (
          // Offre gratuite : pas de conseiller dédié, lecture automatique du mois.
          <div style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, fontWeight: 600, maxWidth: 900 }}>
            {phrases.join(" ")}
            {attention && <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ background: "#fbbf24", color: C.primaryDark, borderRadius: 100, padding: "1px 9px", fontSize: 11, fontWeight: 900, marginTop: 4, whiteSpace: "nowrap" }}>À SURVEILLER</span><span>{attention}</span></div>}
          </div>
        ) : (
          // Accompagnement : le commentaire du mois est celui du conseiller, jamais un texte automatique.
          <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "flex-start", maxWidth: 940 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, flexShrink: 0 }}>{(client.advisorLabel || "N")[0]}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.75, marginBottom: 4 }}>Le mot de votre conseiller · {client.advisorLabel || "NVM Finance"}</div>
              {noteTexte
                ? <div style={{ fontSize: 15.5, lineHeight: 1.7, fontWeight: 600, whiteSpace: "pre-wrap" }}>{noteTexte}</div>
                : <div style={{ fontSize: 14.5, lineHeight: 1.6, fontWeight: 600, opacity: 0.85 }}>{isAdminPreview ? "Pas encore de note pour ce mois : rédigez-la juste en dessous, elle s'affichera ici pour le client." : `L'analyse de ${keyLabel(key)} par ${client.advisorLabel || "votre conseiller"} arrive bientôt. En attendant, voici vos chiffres.`}</div>}
            </div>
          </div>
        )}
        <div style={{ ...grid(200), gap: 10, marginTop: 18 }}>
          {etat.map((it) => (
            <div key={it.id} style={{ background: "rgba(255,255,255,.96)", borderRadius: 14, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
              <PastilleStatut statut={it.statut} size={26} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: C.text }}>{it.label} <span style={{ color: STATUT[it.statut].color, fontWeight: 800 }}>· {STATUT[it.statut].mot}</span></div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.textMid }}>{it.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(gratuit || isAdminPreview) && <NoteConseiller client={client} moisKey={key} isAdminPreview={isAdminPreview} onSaveImport={onSaveImport} />}

      {/* Indicateurs du mois */}
      <div>
        <Titre>Indicateurs du mois</Titre>
        <div style={grid(155)}>
          <Indicateur label="CA HT" value={eur(d.k.ca)} onClick={() => setView("ventes")}
            deltas={[vs(d.k.ca, kp.ca, kp.hasData, { label: "vs M-1" }), vs(d.k.ca, kn.ca, kn.hasData, { label: "vs N-1" }), bMois && bMois.ca > 0 ? <Variation key="b" cur={d.k.ca} prev={bMois.ca} label="vs budget" /> : null]}
            aide="Chiffre d'affaires hors taxes facturé sur le mois." />
          <Indicateur label="Marge brute" value={eur(d.k.marge)} sub={tm(d.k) != null ? `Taux ${pctFr(tm(d.k), 1)}` : null} onClick={() => setView("achats")}
            deltas={[kn.hasData && tm(kn) != null && tm(d.k) != null ? vs(tm(d.k), tm(kn), true, { label: "vs N-1", points: true }) : null]}
            aide="CA − achats consommés (marchandises et matières, variation de stocks comprise)." />
          <Indicateur label="EBE" value={eur(d.k.ebe)} sub={d.k.ca > 0 ? `${pctFr((d.k.ebe / d.k.ca) * 100, 1)} du CA` : null} onClick={() => setView("resultat")}
            deltas={[vs(d.k.ebe, kn.ebe, kn.hasData, { label: "vs N-1" }), bMois ? <Variation key="b" cur={d.k.ebe} prev={ebeDe(bMois)} label="vs budget" /> : null]}
            aide="Excédent brut d'exploitation : performance opérationnelle avant amortissements, frais financiers et IS." />
          <Indicateur label="Résultat net" value={eur(d.k.result)} sub={d.k.ca > 0 ? `${pctFr((d.k.result / d.k.ca) * 100, 1)} du CA` : null} onClick={() => setView("resultat")}
            deltas={[vs(d.k.result, kn.result, kn.hasData, { label: "vs N-1" })]}
            aide={isFec ? "Résultat comptable du mois. Les écritures d'inventaire (amortissements, stocks, IS) sont souvent passées à la clôture." : "Estimation : EBE − dotations aux amortissements − intérêts d'emprunt."} />
          {gratuit ? (
            <Indicateur label="Trésorerie nette" value="Avec votre conseiller" muted onClick={() => setView("tresorerie")} aide="Trésorerie, encaissements clients et échéances suivis chaque mois avec votre conseiller." />
          ) : <Indicateur label="Trésorerie nette" value={treso == null ? "Non renseignée" : eur(treso)} muted={treso == null} onClick={() => setView(isFec ? "tresorerie" : "tresorerie")}
            sub={treso == null ? null : isFec ? `Au ${fmtDate(monthEnd(key))}` : "Estimation"}
            deltas={[treso != null && d.tresoPrev != null ? <Variation key="t" cur={treso} prev={d.tresoPrev} label="vs M-1" /> : null]}
            aide={treso == null ? `Solde bancaire de départ non renseigné : ${client.advisorLabel || "votre conseiller"} peut l'ajouter, ou importer le FEC.` : "Disponibilités (banques, caisse) − concours bancaires courants."} />}
          {isFec && clients && !gratuit && (
            <Indicateur label="Créances clients" value={eur(clients.total)} onClick={() => setView("creances")}
              sub={ratios?.dso != null ? `DSO ${Math.round(ratios.dso)} jours` : null}
              aide="Encours clients TTC : factures émises non encore encaissées." />
          )}
        </div>
      </div>

      {/* Cumul de l'exercice */}
      <Card style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Cumul exercice</div>
            <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700 }}>{exLabel}</div>
          </div>
          <Lien onClick={() => setView("resultat")}>SIG détaillés</Lien>
        </div>
        <div style={grid(170)}>
          {[
            { l: "CA HT", v: ytd.ca, v1: ytdN1?.ca, b: bCumul?.n ? bCumul.ca : null },
            { l: "Marge brute", v: ytd.marge, v1: ytdN1?.marge, sub: tm(ytd) != null ? `Taux ${pctFr(tm(ytd), 1)}` : null },
            { l: "EBE", v: ytd.ebe, v1: ytdN1?.ebe, sub: ytd.ca > 0 ? `${pctFr((ytd.ebe / ytd.ca) * 100, 1)} du CA` : null, b: bCumul?.n ? bCumul.ebe : null },
            { l: "Résultat net", v: ytd.result, v1: ytdN1?.result },
          ].map((x) => (
            <div key={x.l} style={{ borderLeft: `3px solid ${C.borderLight}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid }}>{x.l}</div>
              <div style={{ fontSize: 21, fontWeight: 900, color: C.text }}>{eur(x.v)}</div>
              {x.sub && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMid }}>{x.sub}</div>}
              {x.v1 != null && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Variation cur={x.v} prev={x.v1} compact /><span style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>N-1 : {eur(x.v1)}</span></div>}
              {x.b != null && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><Variation cur={x.v} prev={x.b} compact /><span style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>Budget : {eur(x.b)}</span></div>}
            </div>
          ))}
        </div>
      </Card>

      {/* 100 € de ventes + points d'attention */}
      <div style={grid(420)}>
        <Card>
          <CarteTitre title="Structure de coûts" detail={`Cumul exercice · ${exLabel}`} sub="Répartition du CA entre les postes de charges et le résultat." />
          <div style={{ padding: "16px 22px 20px" }}>
            {rep.ca > 0 ? (
              <>
                <Repartition segments={repSegs} />
                {rep.resultat < 0 && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: C.red }}>Charges supérieures au CA : résultat {pctFr((rep.resultat / rep.ca) * 100, 1)} du CA.</div>}
              </>
            ) : <div style={{ fontSize: 13, color: C.textLight }}>Pas de ventes sur la période.</div>}
          </div>
        </Card>
        {gratuit ? <Verrou titre="Points d'attention" texte="Les points d'attention du mois, repérés et expliqués par votre conseiller." viewId="alertes" setView={setView} /> : <Card>
          <CarteTitre title="Points d'attention" action={<Lien onClick={() => setView("alertes")}>Tout voir</Lien>} />
          <div style={{ padding: "14px 22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {pointsAttention.length === 0 && <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, fontWeight: 700, color: C.green }}><PastilleStatut statut="ok" />Aucune alerte : indicateurs dans les seuils.</div>}
            {pointsAttention.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: a.level === "red" ? C.redBg : C.orangeBg }}>
                <PastilleStatut statut={a.level === "red" ? "bad" : "warn"} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{a.kpi}</div>
                  <div style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5 }}>{a.msg}</div>
                  {a.action && <div style={{ fontSize: 12, color: C.text, fontWeight: 700, marginTop: 3, lineHeight: 1.5 }}>Piste : {a.action}</div>}
                </div>
              </div>
            ))}
            {pointsAttention.length > 3 && <div style={{ fontSize: 12, color: C.textMid, fontWeight: 700 }}>+ {pointsAttention.length - 3} autre{pointsAttention.length > 4 ? "s" : ""} point{pointsAttention.length > 4 ? "s" : ""} dans « Points d'attention »</div>}
            {echeances.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>Échéances</span>
                {echeances.map((e, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 700, color: C.textMid, background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 100, padding: "3px 10px" }}>{e.kpi} · {e.threshold} ({e.current})</span>)}
              </div>
            )}
          </div>
        </Card>}
      </div>

      {!gratuit && client.impactJournalEnabled && client.impactJournal?.items?.length > 0 && <ValeurCreee client={client} compact />}
      {!gratuit && <ResumeActions client={client} setView={setView} />}

      {/* Tendances 12 mois */}
      <div style={grid(420)}>
        <Card>
          <CarteTitre title="CA mensuel · 12 mois glissants" />
          <div style={{ padding: "10px 22px 0" }}><Legende items={[{ label: "N", color: VIZ.serie }, { label: "N-1", color: VIZ.serieN1 }]} /></div>
          <div style={{ padding: "8px 18px 10px" }}>
            <Colonnes data={series} n1 tip={(x) => [keyLabel(x.key), `CA N : ${eur(x.v)}`, `CA N-1 : ${x.n1 != null ? eur(x.n1) : "—"}`]} />
          </div>
          <div style={{ padding: "0 22px 4px", fontSize: 12.5, fontWeight: 800, color: C.text }}>EBE mensuel</div>
          <div style={{ padding: "6px 18px 16px" }}>
            <Colonnes data={series.map((s) => ({ ...s, v: s.ebe }))} height={130} tip={(x) => [keyLabel(x.key), `EBE : ${eur(x.v)}`, ""].filter(Boolean)} />
          </div>
        </Card>
        {gratuit ? <Verrou titre="Trésorerie en fin de mois" texte="L'évolution de votre trésorerie et de votre besoin en fonds de roulement, mois après mois." viewId="tresorerie" setView={setView} hauteur={220} /> : <Card>
          <CarteTitre title="Trésorerie nette fin de mois" detail={projection.length ? `${isFec ? "Réel" : "Estimé"} 12 mois · prévision ${projection.length} mois` : null} sub={`${isFec ? "Solde réel des comptes de banque et de caisse (FEC), concours bancaires déduits." : "Estimation : solde de départ + résultats mensuels retraités."}${projection.length ? " Pointillés : prévision du plan de trésorerie (budget, sinon N-1, sinon tendance ; échéances d'emprunt, acomptes d'IS et flux exceptionnels)." : ""}`} action={<Lien onClick={() => setView(projection.length ? "prevision" : "tresorerie")}>{projection.length ? "Plan de trésorerie" : "Détail"}</Lien>} />
          <div style={{ padding: "14px 18px 16px" }}>
            {series.some((s) => s.treso != null) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {projection.length > 0 && <Legende items={[{ label: isFec ? "Réel" : "Estimé", color: VIZ.serie, line: true }, { label: "Prévision", color: VIZ.serie, dash: true }]} />}
                <Courbe data={[...series.map((s) => ({ ...s, v: s.treso })), ...projection.map((x) => ({ key: x.key, l: keyLabel(x.key, false).replace(/ \d+$/, ""), p: x.solde }))]} height={200}
                  tip={(x) => [keyLabel(x.key), x.p != null ? `Prévision : ${eur(x.p)}` : `Trésorerie : ${eur(x.v)}`]} />
              </div>
            ) : <div style={{ fontSize: 13, color: C.textLight, padding: "30px 0", textAlign: "center" }}>Solde bancaire non renseigné.</div>}
            {isFec && bil && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
                {[
                  { l: "FR", v: bil.fr },
                  { l: "BFR", v: bil.bfr },
                  { l: "Trésorerie nette", v: bil.tresoNette, a: "= FR − BFR" },
                ].map((x) => (
                  <div key={x.l} style={{ background: C.bgLight, borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textMid }}>{x.l}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{eur(x.v)}</div>
                    {x.a && <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{x.a}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>}
      </div>

      {/* Clients et dépenses */}
      <div style={grid(420)}>
        {isFec && clients && gratuit && <Verrou titre="Créances clients" texte="Balance âgée, DSO et top clients, suivis avec votre conseiller." viewId="creances" setView={setView} />}
        {isFec && clients && !gratuit && (
          <Card>
            <CarteTitre title="Créances clients" detail={`Encours ${eur(clients.total)} au ${fmtDate(clients.date)}`} action={<Lien onClick={() => setView("creances")}>Détail</Lien>} />
            <div style={{ padding: "14px 22px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {clients.total > 0 && <div><div style={{ fontSize: 12.5, fontWeight: 900, color: C.text, marginBottom: 8 }}>Balance âgée</div><Repartition segments={clients.buckets.map((b, i) => ({ id: b.id, label: b.label, v: b.v, color: VIZ.age[i] }))} height={14} /></div>}
              {topClients.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 900, color: C.text, marginBottom: 6 }}>Top clients · CA cumul exercice</div>
                  {topClients.slice(0, 5).map((t) => {
                    const part = ytd.ca > 0 ? (t.v / ytd.ca) * 100 : 0;
                    return (
                      <div key={t.n} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 52px", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.l}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(t.v)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: part > 30 ? C.orange : C.textMid, textAlign: "right" }}>{pctFr(part)}</span>
                      </div>
                    );
                  })}
                  {ytd.ca > 0 && topClients[0] && topClients[0].v / ytd.ca > 0.3 && <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginTop: 8 }}>Dépendance client : {topClients[0].l} = {pctFr((topClients[0].v / ytd.ca) * 100)} du CA.</div>}
                </div>
              )}
            </div>
          </Card>
        )}
        <Card>
          <CarteTitre title="Principaux postes de charges" detail={`Cumul exercice${depenses.some((x) => x.v1 != null) ? " · écart vs N-1" : ""}`} action={<Lien onClick={() => setView("charges")}>Détail</Lien>} />
          <div style={{ padding: "12px 22px 20px" }}>
            {depenses.length === 0 && <div style={{ fontSize: 13, color: C.textLight }}>Pas de dépenses détaillées sur la période.</div>}
            {depenses.map((x) => {
              const max = depenses[0]?.v || 1;
              return (
                <div key={x.l} style={{ padding: "7px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.l}</span>
                    <span style={{ display: "flex", gap: 10, alignItems: "baseline", flexShrink: 0 }}>
                      {x.v1 != null && <Variation cur={x.v} prev={x.v1} goodUp={false} compact />}
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.text, fontVariantNumeric: "tabular-nums" }}>{eur(x.v)}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: C.bg, borderRadius: 4, marginTop: 5 }}><div style={{ width: `${Math.max(2, (x.v / max) * 100)}%`, height: 6, background: VIZ.externes, borderRadius: 4, opacity: 0.85 }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {!isFec && canImport && (
        <div style={{ background: C.white, border: `1.5px dashed ${C.primary}`, borderRadius: 18, padding: "16px 20px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px", fontSize: 13, color: C.textMid, lineHeight: 1.6 }}><strong style={{ color: C.text }}>Des chiffres exacts, sans rien ressaisir :</strong> importez le fichier des écritures comptables (FEC) que votre logiciel comptable ou votre expert-comptable produit en deux clics. Bilan, trésorerie réelle, clients en retard et comparaison avec l'an dernier s'affichent automatiquement.</div>
          <Btn onClick={() => setView("import")}>Importer ma comptabilité</Btn>
        </div>
      )}
    </div>
  );
}
