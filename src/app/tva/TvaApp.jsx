"use client";
// Logiciel TVA : le tableau mensuel de rapprochement CA / CA3 du client, à l'écran comme dans son
// Excel (colonnes C à R, lignes de régularisation, TOTAL), rempli d'après les exports SAP du mois
// (balance + un ou plusieurs FBL3N) et complété à la main : chaque cellule accepte un montant ou
// une somme (« 40 822,82 + 328 649,52 »). Sous le total, le contrôle avec la CA3 déposée (PDF).
// « Exporter en Excel » rend le classeur du client : un onglet par mois et son onglet « Export »,
// mêmes formules, puis le récapitulatif. Tout reste dans le navigateur (localStorage
// « nvm-tva-v2 ») : rien n'est envoyé au serveur ni à une IA. Accès : session ADMIN ou CABINET,
// ou localhost en développement.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LogoSVG } from "@/components/ui/Logo";
import { C, Btn, Pill, KpiCard, Card, SectionHead, Info, grilleAuto } from "@/app/charte";
import { BASES, COLONNES, FAMILLES, GRILLE, ORDRE_Q, SPECIALES, calculerGrille, comptesConnus, controlesCa3, moisExercice, nomMois, nomMoisCourt, resumeMois } from "@/lib/tva";
import { choisirFeuille, evaluer, lireCa3, reconnaitre } from "@/lib/tva-lecture";
import { exporterExcel, lireFichierDepose } from "@/lib/tva-fichiers";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const DEV = process.env.NODE_ENV !== "production";
const CLE = "nvm-tva-v2";
const VIDE = { config: { societe: "", debut: `${new Date().getFullYear()}-01` }, mois: {}, regles: { comptes: {}, codes: {} } };

function lireStockage() {
  try {
    window.localStorage.removeItem("nvm-tva-v1"); // première version (essai du 24 nov. 2026)
    const x = JSON.parse(window.localStorage.getItem(CLE) || "null");
    return x ? { ...VIDE, ...x, config: { ...VIDE.config, ...x.config }, regles: { ...VIDE.regles, ...x.regles } } : VIDE;
  } catch { return VIDE; }
}
function ecrireStockage(m) {
  try { window.localStorage.setItem(CLE, JSON.stringify(m)); return true; } catch { return false; }
}

const eur = (n) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/ /g, " "));
const zero = (n) => !n || Math.abs(n) < 0.005;
const champ = { border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text, background: C.white, fontFamily: "inherit" };
const SAISI = "#fff6d5"; // cellule saisie à la main
const th = { padding: "6px 8px", fontSize: 10.5, color: C.textMid, fontWeight: 900, whiteSpace: "nowrap", background: C.bgLight, position: "sticky", top: 0, zIndex: 2, textAlign: "right", borderBottom: `1.5px solid ${C.border}`, transform: "translateY(var(--decalage, 0px))" };
const tdBase = { padding: "0 8px", height: 30, fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${C.borderLight}`, borderTop: `1px solid ${C.borderLight}` };
const colA = { position: "sticky", left: 0, zIndex: 1, textAlign: "left", fontWeight: 800, background: C.white, borderRight: `1.5px solid ${C.border}` };

const DOCUMENTS = [
  { type: "balance", titre: "Balance des comptes 7", niveau: "requis", aide: "Export SAP des soldes des comptes (RFSSLD00) du mois : débit et crédit de la période, compte par compte. Il est recopié tel quel dans l'onglet « Export » du classeur. Un ancien classeur avec un onglet « Export » par mois convient aussi : l'onglet du mois est choisi d'après son nom." },
  { type: "fbl3n", titre: "FBL3N avec le code TVA (un ou plusieurs fichiers)", niveau: "requis", aide: "Postes des comptes par code TVA (colonne Tx), résumés par compte. Plusieurs fichiers se complètent (3F, 3I, Z3 et Z4…) ; un code déjà reçu dans un autre fichier est remplacé par le plus récent." },
  { type: "rfumsv", titre: "RFUMSV00 (bases par code TVA)", niveau: "conseillé", aide: "État SAP « Tax on sales/purchases » du mois (photo 6) : remplit la colonne I de « LIGNE 02 + 02A » (3A + 3B + 3C, section ESA) et place sur son compte un code de vente absent du FBL3N (le 3O à 10 %)." },
  { type: "rapport", titre: "État de déclaration TVA (par case)", niveau: "conseillé", aide: "Montants par case de la CA3, code TVA, facture ou avoir (photo 7) : remplit les lignes « ligne B5 », « ligne F8 » et « prestataires non établis ligne 3B » avec le détail par code." },
  { type: "ca3", titre: "Déclaration CA3 déposée (PDF)", niveau: "contrôle", aide: "La « Synthèse de la déclaration » téléchargée sur impots.gouv.fr : sert au contrôle sous le tableau et remplit la case A3 (colonne G de « LIGNE 02 + 02A »)." },
];
const ETAT_MOIS = {
  vide: { color: C.borderLight, label: "aucun fichier" },
  incomplet: { color: C.orange, label: "fichiers incomplets" },
  ecart: { color: C.red, label: "écart à traiter" },
  ok: { color: C.green, label: "rapproché" },
};

// ─── Connexion ────────────────────────────────────────────────────────────────────────────────
function Connexion() {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [encours, setEncours] = useState(false);
  const valider = async (e) => {
    e.preventDefault();
    setEncours(true); setErreur("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
    setEncours(false);
    if (error) setErreur("Identifiants incorrects.");
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 16 }}>
      <form onSubmit={valider} style={{ background: C.white, border: `1.5px solid ${C.text}`, borderRadius: 20, padding: "26px 24px", width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><LogoSVG width={120} showLabel={true} /></div>
        <div style={{ fontSize: 17, fontWeight: 900, color: C.text, textAlign: "center" }}>Rapprochement CA / CA3</div>
        <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...champ, padding: "11px 13px", fontSize: 14 }} />
        <input type="password" required placeholder="Mot de passe" value={mdp} onChange={(e) => setMdp(e.target.value)} style={{ ...champ, padding: "11px 13px", fontSize: 14 }} />
        {erreur && <div role="alert" style={{ color: C.red, fontSize: 13, fontWeight: 700 }}>{erreur}</div>}
        <Btn disabled={encours} style={{ justifyContent: "center" }}>{encours ? "Connexion…" : "Se connecter"}</Btn>
      </form>
    </div>
  );
}

// ─── Fichiers du mois ─────────────────────────────────────────────────────────────────────────
function Fichiers({ cle, m, onDeposer, onRetirer, messages, lecture }) {
  const [survol, setSurvol] = useState(false);
  const input = useRef(null);
  const deposer = (liste) => { const f = [...(liste || [])]; if (f.length) onDeposer(f); };
  const detail = (d) => {
    if (d.type === "balance" && m.balance) return [{ nom: m.balance.fichier, texte: `${m.balance.feuille && m.balance.feuille !== m.balance.fichier ? `onglet « ${m.balance.feuille} » · ` : ""}${m.balance.comptes.length} comptes · ${eur(m.balance.total)} €`, retirer: () => onRetirer("balance") }];
    if (d.type === "fbl3n") return Object.entries(m.fbl3n?.parFichier || {}).map(([nom, lignes]) => ({ nom, texte: `codes ${[...new Set(lignes.map((l) => l.code).filter(Boolean))].join(", ")}`, retirer: () => onRetirer("fbl3n", nom) }));
    if ((d.type === "rfumsv" || d.type === "rapport") && m[d.type]) return [{ nom: m[d.type].fichier, texte: d.type === "rfumsv" ? `codes ${[...new Set(m.rfumsv.lignes.map((l) => l.code))].join(", ")}` : `cases ${[...new Set(m.rapport.lignes.map((l) => l.case))].join(", ")}`, retirer: () => onRetirer(d.type) }];
    if (d.type === "ca3" && m.ca3) return [{ nom: m.ca3.fichier, texte: `${m.ca3.periode ? nomMois(m.ca3.periode) : "période non lue"}${m.ca3.periode && m.ca3.periode !== cle ? " · attention : autre mois" : ""}`, alerte: m.ca3.periode && m.ca3.periode !== cle, retirer: () => onRetirer("ca3") }];
    return [];
  };
  return (
    <Card>
      <SectionHead title={`Fichiers de ${nomMois(cle)}`} info="Déposez les exports du mois en une fois : l'outil reconnaît chaque fichier. Sans RFUMSV00 ni état de déclaration, les lignes 3A / 3B, B5 et F8 se saisissent dans le tableau ; la DEB se saisit toujours." />
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16 }}>
        <div
          role="button" tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => { e.preventDefault(); setSurvol(false); deposer(e.dataTransfer.files); }}
          style={{ border: `2px dashed ${survol ? C.primary : C.border}`, background: survol ? C.bg : C.bgLight, borderRadius: 16, padding: "22px 18px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minHeight: 150 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{lecture ? "Lecture en cours…" : "Déposer les fichiers du mois"}</div>
          <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 600 }}>Exports SAP (.xls, .xlsx, .csv, .txt) et PDF de la CA3</div>
          <input ref={input} type="file" multiple accept=".xls,.xlsx,.csv,.txt,.pdf" style={{ display: "none" }} onChange={(e) => { deposer(e.target.files); e.target.value = ""; }} />
          {messages.length > 0 && (
            <div role="status" style={{ marginTop: 8, textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}>
              {messages.map((x, i) => <div key={i} style={{ fontSize: 12, fontWeight: 700, color: x.erreur ? C.red : x.alerte ? C.orange : C.green }}>{x.texte}</div>)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DOCUMENTS.map((d) => {
            const lus = detail(d);
            return (
              <div key={d.type} style={{ padding: "9px 2px", borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: lus.some((x) => x.alerte) ? C.red : lus.length ? C.green : d.niveau === "requis" ? C.orange : C.borderLight, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", flex: 1 }}>{d.titre}<Info>{d.aide}</Info></div>
                  {!lus.length && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMid }}>{d.niveau === "requis" ? "À déposer" : d.niveau === "conseillé" ? "Conseillé" : "Pour le contrôle"}</span>}
                </div>
                {lus.map((x) => (
                  <div key={x.nom} style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 19, marginTop: 3 }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: x.alerte ? C.red : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nom} · {x.texte}</div>
                    <button type="button" onClick={x.retirer} style={{ border: "none", background: "none", color: C.textMid, fontSize: 11.5, fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}>Retirer</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Cellule du tableau ───────────────────────────────────────────────────────────────────────
// Comme dans Excel : un clic sélectionne la case (son calcul et sa note s'affichent dans la barre
// au-dessus du tableau), un double-clic ouvre le calcul pour le modifier ; une note est signalée
// par un petit triangle rouge.
function Edition({ initial, onValider, onAnnuler }) {
  const [texte, setTexte] = useState(initial);
  const [erreur, setErreur] = useState(false);
  const annule = useRef(false);
  const valider = () => {
    if (annule.current) return;
    const t = texte.trim();
    if (t && evaluer(t) == null) { setErreur(true); return; }
    onValider(t);
  };
  return (
    <input autoFocus value={texte} onChange={(e) => { setTexte(e.target.value); setErreur(false); }} onBlur={valider}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { annule.current = true; onAnnuler(); } }}
      aria-invalid={erreur} aria-label="Calcul de la case"
      style={{ width: "100%", minWidth: 180, height: 30, border: `2px solid ${erreur ? C.red : C.primary}`, padding: "0 6px", fontSize: 12.5, fontWeight: 700, textAlign: "right", fontFamily: "inherit", boxSizing: "border-box" }} />
  );
}
function Cellule({ cell, editable, choisie, enEdition, onChoisir, onEditer, onValider, onAnnuler, style, rouge }) {
  const valeur = cell?.valeur || 0;
  if (enEdition) {
    return <td style={{ ...tdBase, padding: 0, ...style }}><Edition initial={cell?.saisi ? cell.expr : cell?.exprAuto || ""} onValider={onValider} onAnnuler={onAnnuler} /></td>;
  }
  return (
    <td onClick={onChoisir} onDoubleClick={editable ? onEditer : undefined} title={cell?.note ? `Note : ${cell.note}` : editable ? "Double-clic pour voir et modifier le calcul" : undefined}
      style={{ ...tdBase, position: "relative", cursor: "cell", background: cell?.saisi ? SAISI : undefined, boxShadow: choisie ? `inset 0 0 0 2px ${C.primary}` : undefined, color: rouge ? C.red : zero(valeur) ? C.borderLight : cell?.calcule ? C.textMid : C.text, fontWeight: rouge ? 900 : tdBase.fontWeight, ...style }}>
      {zero(valeur) ? "–" : eur(valeur)}
      {cell?.note && <span aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderTop: `8px solid ${C.red}`, borderLeft: "8px solid transparent" }} />}
    </td>
  );
}

// Le calcul d'une case, lisible : « = 4459723,63+9002350,39 +7604 » et d'où viennent les montants.
const TITRE_DE = Object.fromEntries(SPECIALES.map((sp) => [sp.id, sp.libelle]));
function calculLisible(ligne, lettre) {
  const c = ligne.cells[lettre];
  if (!c) return { formule: "", origine: "" };
  const col = GRILLE.find((x) => x.l === lettre);
  if (col?.de) return { formule: `= ${col.de} × ${String(col.taux * 100).replace(".", ",")} %`, origine: "TVA calculée sur la base" };
  if (lettre === "Q" && c.calcule) {
    const sp = SPECIALES.find((x) => `s:${x.id}` === ligne.id);
    const lettres = sp?.q === "sansI" ? ORDRE_Q.filter((k) => k !== "I") : ORDRE_Q;
    return { formule: `= ${lettres.join(" + ")}`, origine: sp?.q === "sansI" ? "total de la ligne sans la colonne I, comme dans le fichier" : "total ventilé" };
  }
  if (lettre === "R" && ligne.type === "compte") return { formule: "= B − Q", origine: "balance − total ventilé" };
  if (c.formule) return { formule: `= ${c.formule.replace(/([A-R])\{(\w+)\}/g, (_, l, id) => `${l} (${TITRE_DE[id]})`).replace(/([+-])/g, " $1 ")}`, origine: "calcul du fichier" };
  const codes = ligne.type === "compte" && lettre !== "B" ? Object.keys(ligne.auto?.codes || {}).filter((k) => COLONNES.find((x) => x.lettre === lettre)?.codes.includes(k)) : [];
  const fichiers = c.source ? `${c.source.origine}${c.source.detail?.length ? ` (${c.source.detail.map((x) => x.code).join(" + ")})` : ""}`
    : lettre === "B" && ligne.type === "compte" ? "balance : crédit − débit du mois"
    : codes.length ? `FBL3N, code${codes.length > 1 ? "s" : ""} ${codes.join(", ")}`
    : lettre === "O" && ligne.auto?.classement === "nd" && !zero(ligne.auto.sansCode) ? "reste sans code TVA classé non déclarable" : "";
  if (c.ajout) return { formule: `= ${c.expr}`, origine: `${fichiers || "fichiers"} + ajout saisi ${c.ajout}` };
  if (c.saisi) return { formule: `= ${c.expr}`, origine: `saisi à la main${c.auto ? ` (fichiers : ${eur(c.auto)})` : ""}` };
  return { formule: c.exprAuto ? `= ${c.exprAuto}` : "", origine: fichiers };
}

function ChampNote({ initial, onValider }) {
  const [texte, setTexte] = useState(initial);
  return (
    <input value={texte} onChange={(e) => setTexte(e.target.value)} onBlur={() => { if (texte.trim() !== initial) onValider(texte.trim()); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      placeholder="Ajouter une note sur cette case (ex. : montant = différence entre la case A3 de la CA3 et le report)" aria-label="Note de la case"
      style={{ ...champ, flex: 1, minWidth: 220, padding: "6px 10px", fontSize: 12.5 }} />
  );
}

// ─── Tableau du mois ──────────────────────────────────────────────────────────────────────────
// Sous le total : la case de la CA3 qui correspond à chaque colonne.
const CA3_SOUS = { C: { case: "9B" }, D: { case: "9B", taxe: true }, E: { case: "09" }, F: { case: "09", taxe: true }, I: { case: "08" }, J: { case: "08", taxe: true }, K: { case: "E1" }, M: { case: "F2" }, N: { case: "E2" } };
function Tableau({ g, ca3, connus, aucunAutreMois, onSaisir, onNoter, onClasser }) {
  const [tous, setTous] = useState(false);
  const [choix, setChoix] = useState(null); // { id, lettre } : case sélectionnée
  const [edition, setEdition] = useState(null); // { id, lettre } : case ouverte au double-clic
  // Ligne des titres de colonnes figée sous le bandeau du haut quand on descend dans la page, comme
  // les volets figés d'Excel : décalage calculé au défilement (sans re-rendu).
  const tableau = useRef(null);
  useEffect(() => {
    const maj = () => {
      const t = tableau.current;
      if (!t?.tHead) return;
      const haut = document.querySelector("header")?.getBoundingClientRect().bottom || 0;
      const r = t.getBoundingClientRect();
      const decalage = Math.min(Math.max(0, haut - r.top), Math.max(0, r.height - t.tHead.getBoundingClientRect().height - 60));
      t.style.setProperty("--decalage", `${decalage}px`);
    };
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    window.addEventListener("resize", maj);
    return () => { window.removeEventListener("scroll", maj); window.removeEventListener("resize", maj); };
  }, [tous]);
  const lignes = g.lignes.filter((l) => tous || ["B", ...BASES].some((k) => !zero(l.cells[k].valeur)));
  const enEcart = g.lignes.filter((l) => !zero(l.cells.R.valeur)).length;
  const valeurCa3 = (k) => { const x = CA3_SOUS[k]; if (!x || !ca3) return null; return x.taxe ? ca3.taxes?.[x.case] ?? null : ca3.cases?.[x.case] ?? null; };
  const colonnes = GRILLE.map((c) => c.l);
  const toutes = [...g.lignes, ...g.speciales];
  const ligneChoisie = choix && toutes.find((l) => l.id === choix.id);
  const caseChoisie = ligneChoisie?.cells[choix.lettre];
  const modifiable = (l, k) => (k === "B" ? l.type === "compte" : BASES.includes(k) && !l.cells[k]?.formule);
  // Valider un calcul : identique à celui des fichiers → retour aux fichiers ; « calcul des fichiers
  // + 7604 » → ajout gardé à part (il suit l'export s'il change) ; sinon le calcul remplace la valeur.
  const valider = (l, k, texte) => {
    setEdition(null);
    const c = l.cells[k];
    const t = texte.replace(/^\s*=/, "").replace(/[\s  ]/g, "");
    const auto = (c.exprAuto || "").replace(/\s/g, "");
    if (!t || t === auto) { if (c.saisi) onSaisir(l.id, k, null); return; }
    const reste = auto && t.startsWith(auto) ? t.slice(auto.length) : "";
    if (reste && /^[+-]/.test(reste) && evaluer(`0${reste}`) != null) onSaisir(l.id, k, { ajout: reste });
    else onSaisir(l.id, k, { expr: texte.trim() });
  };
  const cellule = (l, k, extra = {}) => (
    <Cellule key={k} cell={l.cells[k]} editable={modifiable(l, k)}
      choisie={choix?.id === l.id && choix?.lettre === k} enEdition={edition?.id === l.id && edition?.lettre === k}
      onChoisir={() => setChoix({ id: l.id, lettre: k })} onEditer={() => { setChoix({ id: l.id, lettre: k }); setEdition({ id: l.id, lettre: k }); }}
      onValider={(t) => valider(l, k, t)} onAnnuler={() => setEdition(null)} {...extra} />
  );
  const ligneCompte = (l) => {
    const nouveau = !aucunAutreMois && !connus.has(l.compte) && !l.auto?.horsBalance;
    const fond = l.auto?.horsBalance ? C.redBg : undefined;
    return (
      <tr key={l.id} className="row-hover" style={{ background: fond }}>
        <td style={{ ...tdBase, ...colA, background: fond || C.white }} title={`${l.libelle}\n${Object.entries(l.auto?.codes || {}).map(([k, x]) => `${k} : ${eur(x)}`).join("\n") || "aucun code TVA"}`}>
          {l.compte}{nouveau && <span style={{ marginLeft: 6 }}><Pill color={C.primary}>nouveau</Pill></span>}
        </td>
        <td style={{ ...tdBase, textAlign: "left", color: C.textMid, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }} title={l.libelle}>{l.auto?.horsBalance ? "absent de la balance" : l.libelle}</td>
        {cellule(l, "B", { style: { fontWeight: 800 } })}
        {colonnes.map((k) => cellule(l, k, { rouge: k === "R" && !zero(l.cells.R.valeur) }))}
        <td style={{ ...tdBase, textAlign: "left", borderRight: "none" }}>
          {l.auto && !zero(l.auto.sansCode) && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>{eur(l.auto.sansCode)}</span>
              <select value={l.auto.classement} onChange={(e) => onClasser(l.compte, e.target.value)} aria-label={`Reste sans code TVA du compte ${l.compte}`} title={l.auto.famille ? `${FAMILLES.find((f) => f.id === l.auto.famille)?.libelle} : sans doute non déclarable` : undefined} style={{ ...champ, padding: "2px 4px", fontSize: 11.5, color: l.auto.classement === "expliquer" ? C.orange : C.text }}>
                <option value="nd">en non déclarable</option>
                <option value="expliquer">en écart, à expliquer</option>
              </select>
            </span>
          )}
        </td>
      </tr>
    );
  };
  const bordTotal = { borderTop: `2px solid ${C.text}` };
  const calcul = ligneChoisie ? calculLisible(ligneChoisie, choix.lettre) : null;
  const nomLigne = ligneChoisie ? (ligneChoisie.type === "compte" ? `${ligneChoisie.compte}${ligneChoisie.libelle ? ` ${ligneChoisie.libelle}` : ""}` : ligneChoisie.libelle) : "";
  return (
    <Card>
      <SectionHead
        title="Tableau de rapprochement"
        sub={`${lignes.length} comptes · ${enEcart ? `${enEcart} compte${enEcart > 1 ? "s" : ""} en écart` : "aucun écart sur les comptes"} · clic : voir le calcul · double-clic : le modifier · en jaune : saisi à la main · triangle rouge : note`}
        info="Même tableau que le fichier Excel : balance (crédit − débit du mois), bases ventilées selon les codes TVA du FBL3N (montant SAP inversé : un produit est positif), TVA = base × taux, total balance, écart. Un clic sur une case affiche son calcul et sa note au-dessus du tableau ; un double-clic ouvre le calcul pour le modifier, comme dans Excel : ajoutez « +7604 » au calcul repris des fichiers, ou tapez un autre montant ou une somme. Videz la case pour revenir aux fichiers. Comme dans le fichier, le reste sans code TVA d'un compte reste en écart (colonne R) ; la dernière colonne permet de le passer en non déclarable, choix retenu pour les mois suivants."
        action={<label style={{ fontSize: 12.5, fontWeight: 700, color: C.textMid, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={tous} onChange={(e) => setTous(e.target.checked)} />Comptes à zéro</label>}
      />
      {/* Barre de formule, comme dans Excel : fixée en bas de l'écran tant qu'une case est choisie. */}
      {ligneChoisie && (
        <div role="region" aria-label="Calcul de la case" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 30, background: C.white, border: `1.5px solid ${C.text}`, borderRadius: 14, boxShadow: "0 14px 34px rgba(0,46,44,.22)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8, maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 900, minWidth: 160, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{choix.lettre} · {nomLigne}</span>
            <span style={{ fontStyle: "italic", fontWeight: 900, color: C.textMid, fontFamily: "Georgia, serif" }}>fx</span>
            <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {calcul.formule || (zero(caseChoisie?.valeur) ? "vide" : eur(caseChoisie?.valeur))}
              {!zero(caseChoisie?.valeur) && calcul.formule && <span style={{ marginLeft: 8, color: C.textMid }}>→ {eur(caseChoisie.valeur)}</span>}
              {calcul.origine && <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: C.textMid }}>{calcul.origine}</span>}
            </span>
            {modifiable(ligneChoisie, choix.lettre) && <Btn small variant="ghost" onClick={() => setEdition(choix)}>Modifier le calcul</Btn>}
            {caseChoisie?.saisi && <Btn small variant="ghost" onClick={() => onSaisir(choix.id, choix.lettre, null)}>Revenir aux fichiers</Btn>}
            <button type="button" onClick={() => { setChoix(null); setEdition(null); }} aria-label="Fermer" style={{ border: "none", background: "none", fontSize: 18, fontWeight: 900, color: C.textMid, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 160 }}>Note</span>
            <ChampNote key={`${choix.id}|${choix.lettre}|${caseChoisie?.note || ""}`} initial={caseChoisie?.note || ""} onValider={(t) => onNoter(choix.id, choix.lettre, t)} />
          </div>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table ref={tableau} style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...th, ...colA, background: C.bgLight, zIndex: 3 }}>Cpte SAP</th>
              <th style={{ ...th, textAlign: "left" }}>Libellé</th>
              <th style={th}>Balance<div style={{ fontSize: 9.5, color: C.textLight, fontWeight: 700 }}>B</div></th>
              {GRILLE.map((c) => (
                <th key={c.l} style={th} title={c.titre.replace("\n", " ")}>
                  <div>{c.court}</div>
                  <div style={{ fontSize: 9.5, color: C.textLight, fontWeight: 700 }}>{c.l}{c.codes ? ` · ${c.codes}` : ""}</div>
                </th>
              ))}
              <th style={{ ...th, textAlign: "left" }}>Reste sans code TVA</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(ligneCompte)}
            <tr><td colSpan={colonnes.length + 4} style={{ padding: "10px 8px 6px", fontSize: 11, fontWeight: 900, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em", background: C.bgLight, borderTop: `1.5px solid ${C.border}` }}>Lignes de régularisation</td></tr>
            {g.speciales.map((l) => (
              <tr key={l.id} className="row-hover">
                <td colSpan={2} style={{ ...tdBase, ...colA, fontWeight: 700, whiteSpace: "normal", minWidth: 230 }}>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{l.libelle}<Info>{l.aide}</Info></span>
                </td>
                <td style={tdBase} />
                {colonnes.map((k) => cellule(l, k))}
                <td style={{ ...tdBase, borderRight: "none" }} />
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ ...tdBase, ...colA, background: C.bgLight, fontWeight: 900, ...bordTotal }}>TOTAL</td>
              <td style={{ ...tdBase, background: C.bgLight, fontWeight: 900, ...bordTotal }}>{eur(g.total.B)}</td>
              {colonnes.map((k) => <td key={k} style={{ ...tdBase, background: C.bgLight, fontWeight: 900, ...bordTotal, color: k === "R" && !zero(g.total.R) ? C.red : C.text }}>{zero(g.total[k]) ? "–" : eur(g.total[k])}</td>)}
              <td style={{ ...tdBase, background: C.bgLight, ...bordTotal, borderRight: "none" }} />
            </tr>
            {ca3 && (
              <>
                <tr>
                  <td colSpan={3} style={{ ...tdBase, ...colA, fontWeight: 800, color: C.textMid }}>CA3 déposée</td>
                  {colonnes.map((k) => { const x = valeurCa3(k); return <td key={k} style={{ ...tdBase, color: C.textMid }}>{x == null ? "" : <><span style={{ fontSize: 10, color: C.textLight, marginRight: 5 }}>{CA3_SOUS[k].case}</span>{eur(x)}</>}</td>; })}
                  <td style={{ ...tdBase, borderRight: "none" }} />
                </tr>
                <tr>
                  <td colSpan={3} style={{ ...tdBase, ...colA, fontWeight: 800 }}>Écart (CA3 − tableau)</td>
                  {colonnes.map((k) => {
                    const x = valeurCa3(k);
                    if (x == null) return <td key={k} style={tdBase} />;
                    const e = Math.round((x - g.total[k]) * 100) / 100;
                    const ok = Math.abs(e) <= (CA3_SOUS[k].taxe ? 2 : 1);
                    // Jusqu'à 1 € (2 € sur la TVA), c'est l'arrondi de la CA3 à l'euro : pas un écart.
                    return <td key={k} title={ok ? `Arrondi de la CA3 à l'euro : ${eur(e)}` : undefined} style={{ ...tdBase, fontWeight: 900, color: ok ? C.green : C.red }}>{ok ? "✓" : eur(e)}</td>;
                  })}
                  <td style={{ ...tdBase, borderRight: "none" }} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Contrôle avec la CA3 ─────────────────────────────────────────────────────────────────────
function Controle({ controles, ca3 }) {
  return (
    <Card>
      <SectionHead title="Contrôle avec la CA3" sub={ca3 ? `${ca3.fichier} · ${controles.filter((c) => c.statut === "ok").length} / ${controles.length} rapprochés` : "Déposez le PDF de la CA3 pour comparer"} info="Totaux du tableau face aux cases de la CA3 déposée. B5 : colonnes C + E + I de la ligne « ligne B5 » ; F8 : colonne R de la ligne « ligne F8 ». A3 : bases 3A + 3B (+ 3C) de « LIGNE 02 + 02A » + avoirs de la ligne « prestataires non établis ». La CA3 est déclarée en euros entiers : jusqu'à 1 € d'écart (2 € sur la TVA), c'est son arrondi, marqué ✓." />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Case", "Libellé", "Tableau", "CA3 déposée", "Écart"].map((t, i) => <th key={t} style={{ ...th, position: "static", textAlign: i < 2 ? "left" : "right" }}>{t}</th>)}</tr></thead>
          <tbody>
            {controles.map((c, i) => (
              <tr key={i} style={{ background: c.statut === "ecart" ? C.redBg : undefined }}>
                <td style={{ ...tdBase, textAlign: "left", fontWeight: 900, borderRight: "none" }}>{c.case}</td>
                <td style={{ ...tdBase, textAlign: "left", borderRight: "none" }}>{c.libelle}</td>
                <td style={{ ...tdBase, borderRight: "none" }}>{eur(c.calc)}</td>
                <td style={{ ...tdBase, borderRight: "none" }}>{eur(c.declare)}</td>
                <td title={c.statut === "ok" ? `Arrondi de la CA3 à l'euro : ${eur(c.ecart)}` : undefined} style={{ ...tdBase, borderRight: "none", fontWeight: 900, color: c.statut === "ecart" ? C.red : c.statut === "ok" ? C.green : C.textLight }}>{c.ecart == null ? "—" : c.statut === "ok" ? "✓" : eur(c.ecart)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Codes TVA non reconnus ───────────────────────────────────────────────────────────────────
const NOMS_COLONNES = { c10: "Base 10 % (C)", c55: "Base 5,5 % (E)", c196: "Base 19,6 % (G)", c20: "Base 20 % (I)", exp: "Exportations (K)", etr: "Code TVA étrangère (L)", intra: "Livraisons intra (M)", autres: "Autres opérations non imposables (N)", nd: "Non déclarable (O)", reclass: "Reclassement (P)" };
function CodesInconnus({ v, onAffecter }) {
  const codes = [...new Set(v.codesInconnus.map((x) => x.code))];
  if (!codes.length && !v.sansCompte.length) return null;
  if (!codes.length) return (
    <Card style={{ borderColor: C.orange }}>
      <SectionHead title="Codes du RFUMSV00 à placer" sub="Absents du FBL3N, et aucun compte n'a ce montant en reste sans code : à saisir sur le bon compte" />
      <div style={{ padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {v.sansCompte.map((x) => <div key={x.code} style={{ fontSize: 13, fontWeight: 700 }}><span style={{ fontWeight: 900, marginRight: 10 }}>{x.code}</span>{eur(x.montant)}</div>)}
      </div>
    </Card>
  );
  return (
    <Card style={{ borderColor: C.red }}>
      <SectionHead title="Codes TVA à ranger" sub="Ces codes du FBL3N ne sont associés à aucune colonne : leur montant reste en écart" />
      <div style={{ padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {codes.map((code) => {
          const lignes = v.codesInconnus.filter((x) => x.code === code);
          return (
            <div key={code} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 900, fontSize: 14, width: 40 }}>{code}</span>
              <span style={{ flex: 1, fontSize: 12.5, color: C.textMid, fontWeight: 600 }}>{lignes.length} compte{lignes.length > 1 ? "s" : ""} · {eur(lignes.reduce((s, x) => s + x.montant, 0))}</span>
              <select defaultValue="" onChange={(e) => e.target.value && onAffecter(code, e.target.value)} style={champ} aria-label={`Colonne du code ${code}`}>
                <option value="" disabled>Ranger dans…</option>
                {COLONNES.map((c) => <option key={c.id} value={c.id}>{NOMS_COLONNES[c.id]}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Application ──────────────────────────────────────────────────────────────────────────────
export default function TvaApp() {
  const [acces, setAcces] = useState("chargement"); // chargement | connexion | interdit | ok
  const [memoire, setMemoire] = useState(() => (typeof window === "undefined" ? VIDE : lireStockage()));
  const [stockagePlein, setStockagePlein] = useState(false);
  const [moisActif, setMoisActif] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lecture, setLecture] = useState(false);
  const [reglages, setReglages] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const verifierAcces = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setAcces(DEV ? "ok" : "connexion");
    const [{ data: profil }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
      supabase.from("admin_users").select("id").eq("email", session.user.email).maybeSingle(),
    ]);
    const autorise = !!admin || profil?.role === "ADMIN" || profil?.role === "CABINET";
    setAcces(autorise || DEV ? "ok" : "interdit");
  }, []);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evenement) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(evenement)) setTimeout(verifierAcces, 0);
    });
    return () => subscription.unsubscribe();
  }, [verifierAcces]);
  // Un autre onglet a enregistré : on relit, pour ne pas écraser ses saisies.
  useEffect(() => {
    const autreOnglet = (e) => { if (e.key === CLE) setMemoire(lireStockage()); };
    window.addEventListener("storage", autreOnglet);
    return () => window.removeEventListener("storage", autreOnglet);
  }, []);

  const maj = useCallback((f) => setMemoire((m) => { const n = f(m); setStockagePlein(!ecrireStockage(n)); return n; }), []);
  const moisListe = useMemo(() => moisExercice(memoire.config.debut), [memoire.config.debut]);
  const resumes = useMemo(() => Object.fromEntries(moisListe.map((k) => [k, resumeMois(memoire.mois[k], memoire.regles)])), [moisListe, memoire.mois, memoire.regles]);
  // Mois affiché : celui choisi, sinon le dernier qui a des fichiers, sinon le premier de l'exercice.
  const cle = moisActif && moisListe.includes(moisActif) ? moisActif : [...moisListe].reverse().find((k) => resumes[k].etat !== "vide") || moisListe[0];
  const VIDE_MOIS = useMemo(() => ({}), []);
  const m = memoire.mois[cle] || VIDE_MOIS;
  const g = useMemo(() => calculerGrille(m, memoire.regles), [m, memoire.regles]);
  const controles = useMemo(() => controlesCa3(g, m.ca3), [g, m.ca3]);
  const connus = useMemo(() => comptesConnus(memoire.mois, cle), [memoire.mois, cle]);

  const majMois = (f) => maj((mem) => ({ ...mem, mois: { ...mem.mois, [cle]: f(mem.mois[cle] || {}) } }));

  const deposer = async (fichiers) => {
    setLecture(true);
    const msgs = [];
    const ajout = {};
    const fbl = {}; // FBL3N reçus : nom de fichier → lignes
    for (const fichier of fichiers) {
      try {
        const lu = await lireFichierDepose(fichier);
        if (lu.pdf) {
          const ca3 = lireCa3(lu.pages);
          if (!ca3) { msgs.push({ erreur: true, texte: `${fichier.name} : PDF non reconnu comme une déclaration CA3.` }); continue; }
          ajout.ca3 = { ...ca3, fichier: fichier.name };
          msgs.push(ca3.periode && ca3.periode !== cle
            ? { alerte: true, texte: `${fichier.name} : CA3 de ${nomMois(ca3.periode)}, pas de ${nomMois(cle)}. Vérifiez le mois choisi.` }
            : { texte: `${fichier.name} : déclaration CA3 lue.` });
          continue;
        }
        const trouves = reconnaitre(lu.feuilles);
        if (!trouves.length) { msgs.push({ erreur: true, texte: `${fichier.name} : format non reconnu (balance, FBL3N, RFUMSV00 ou état de déclaration attendu).` }); continue; }
        const balances = trouves.filter((t) => t.type === "balance");
        if (balances.length) {
          const choisi = choisirFeuille(balances, cle);
          if (choisi) { ajout.balance = { ...choisi, fichier: fichier.name, feuille: lu.feuilles.length > 1 ? choisi.feuille : null }; msgs.push({ texte: `${fichier.name}${lu.feuilles.length > 1 ? ` (onglet « ${choisi.feuille} »)` : ""} : balance reconnue.` }); }
          else msgs.push({ alerte: true, texte: `${fichier.name} : plusieurs onglets de balance, aucun ne porte le nom de ${nomMois(cle)}.` });
        }
        for (const t of trouves.filter((x) => x.type === "fbl3n")) {
          fbl[fichier.name] = (fbl[fichier.name] || []).concat(t.lignes);
          msgs.push({ texte: `${fichier.name} : FBL3N reconnu (codes ${[...new Set(t.lignes.map((l) => l.code).filter(Boolean))].join(", ")}).` });
        }
        for (const t of trouves.filter((x) => x.type === "rfumsv" || x.type === "rapport")) {
          ajout[t.type] = { ...t, fichier: fichier.name };
          msgs.push({ texte: `${fichier.name} : ${t.type === "rfumsv" ? "RFUMSV00 reconnu" : "état de déclaration TVA reconnu"}.` });
        }
      } catch (e) {
        msgs.push({ erreur: true, texte: `${fichier.name} : lecture impossible (${e.message || e}).` });
      }
    }
    if (Object.keys(ajout).length || Object.keys(fbl).length) {
      const avant = memoire.mois[cle]?.fbl3n?.parFichier || {};
      // Un code TVA vient d'un seul fichier : celui qui arrive remplace l'ancien pour ses codes.
      const parFichier = { ...avant };
      for (const [nom, lignes] of Object.entries(fbl)) {
        const codes = new Set(lignes.map((l) => l.code));
        for (const autre of Object.keys(parFichier)) {
          if (autre === nom) continue;
          const repris = [...codes].filter((c) => parFichier[autre].some((l) => l.code === c));
          if (!repris.length) continue;
          msgs.push({ alerte: true, texte: `Codes ${repris.join(", ")} : ceux de ${nom} remplacent ceux de ${autre}.` });
          const reste = parFichier[autre].filter((l) => !codes.has(l.code));
          if (reste.length) parFichier[autre] = reste; else delete parFichier[autre];
        }
        parFichier[nom] = lignes;
      }
      majMois((x) => ({ ...x, ...ajout, fbl3n: { parFichier }, majLe: new Date().toISOString() }));
    }
    setMessages(msgs);
    setLecture(false);
  };
  const retirer = (type, nom) => majMois((x) => {
    const n = { ...x };
    if (type === "fbl3n") { const p = { ...(n.fbl3n?.parFichier || {}) }; delete p[nom]; n.fbl3n = { parFichier: p }; }
    else delete n[type];
    return n;
  });
  // Saisie d'une case : null = retour aux fichiers ; { ajout: "+7604" } = ajouté à la valeur des
  // fichiers ; { expr } = calcul qui remplace la valeur des fichiers.
  const saisir = (id, lettre, saisie) => majMois((x) => {
    const saisies = { ...(x.saisies || {}) };
    const ligne = { ...(saisies[id] || {}) };
    if (saisie == null) delete ligne[lettre];
    else if (saisie.ajout) ligne[lettre] = { ajout: saisie.ajout };
    else ligne[lettre] = { expr: saisie.expr, valeur: evaluer(saisie.expr) };
    if (Object.keys(ligne).length) saisies[id] = ligne; else delete saisies[id];
    return { ...x, saisies };
  });
  const noter = (id, lettre, texte) => majMois((x) => {
    const notes = { ...(x.notes || {}) };
    const ligne = { ...(notes[id] || {}) };
    if (texte) ligne[lettre] = texte; else delete ligne[lettre];
    if (Object.keys(ligne).length) notes[id] = ligne; else delete notes[id];
    return { ...x, notes };
  });
  const classer = (compte, choix) => maj((mem) => ({ ...mem, regles: { ...mem.regles, comptes: { ...mem.regles.comptes, [compte]: choix } } }));
  const affecterCode = (code, col) => maj((mem) => ({ ...mem, regles: { ...mem.regles, codes: { ...mem.regles.codes, [code]: col } } }));
  const exporter = async () => {
    setExportMsg("");
    try { const n = await exporterExcel({ memoire, moisListe }); setExportMsg(`Classeur exporté : ${n} mois, leurs onglets « Export » et le récapitulatif.`); }
    catch (e) { setExportMsg(e.message || "Export impossible."); }
  };
  const viderMois = () => {
    if (window.confirm(`Effacer tous les fichiers et saisies de ${nomMois(cle)} ?`)) maj((mem) => { const mois = { ...mem.mois }; delete mois[cle]; return { ...mem, mois }; });
  };

  if (acces === "chargement") return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.textMid, fontWeight: 700 }}>Chargement…</div>;
  if (acces === "connexion") return <Connexion />;
  if (acces === "interdit") return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.text, fontWeight: 700, padding: 16, textAlign: "center" }}>Cet outil est réservé aux comptes autorisés.</div>;

  const okCtrl = controles.filter((c) => c.statut === "ok").length;
  const comparees = controles.filter((c) => c.statut !== "attente").length;
  const nbSaisies = Object.values(m.saisies || {}).reduce((s, l) => s + Object.keys(l).length, 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Nunito', system-ui, sans-serif", color: C.text }}>
      <style>{`.row-hover:hover td{background-color:${C.bgLight}}`}</style>
      <header style={{ background: C.white, borderBottom: `1.5px solid ${C.borderLight}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 20 }}>
        <LogoSVG width={96} showLabel={false} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>Rapprochement CA / CA3</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textMid }}>{memoire.config.societe || "Société à renseigner dans les réglages"}</div>
        </div>
        <Btn variant="ghost" small onClick={() => setReglages(!reglages)}>Réglages</Btn>
        <Btn small onClick={exporter}>Exporter en Excel</Btn>
      </header>
      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "18px 16px 170px", display: "flex", flexDirection: "column", gap: 16 }}>
        {stockagePlein && <div role="alert" style={{ background: C.redBg, color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 12, padding: "10px 14px", fontWeight: 800, fontSize: 13 }}>Le navigateur refuse d’enregistrer : la dernière modification sera perdue au rechargement. Exportez le classeur Excel pour la garder.</div>}
        {exportMsg && <div role="status" style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{exportMsg}</div>}
        {reglages && (
          <Card>
            <SectionHead title="Réglages" />
            <div style={{ padding: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 800, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Société (cellule A2 de chaque onglet)
                <input value={memoire.config.societe} onChange={(e) => maj((mem) => ({ ...mem, config: { ...mem.config, societe: e.target.value } }))} style={{ ...champ, minWidth: 260, textTransform: "none", letterSpacing: 0 }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 800, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Premier mois de l’exercice
                <input type="month" value={memoire.config.debut} onChange={(e) => e.target.value && maj((mem) => ({ ...mem, config: { ...mem.config, debut: e.target.value } }))} style={{ ...champ, textTransform: "none", letterSpacing: 0 }} />
              </label>
            </div>
          </Card>
        )}

        <nav aria-label="Mois de l'exercice" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {moisListe.map((k) => {
            const e = ETAT_MOIS[resumes[k].etat];
            const actif = k === cle;
            return (
              <button key={k} type="button" onClick={() => { setMoisActif(k); setMessages([]); }} aria-current={actif ? "true" : undefined} title={e.label}
                style={{ border: `1.5px solid ${actif ? C.text : C.border}`, background: actif ? C.text : C.white, color: actif ? C.white : C.text, borderRadius: 100, padding: "6px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
                {nomMoisCourt(k)}
              </button>
            );
          })}
        </nav>

        <Fichiers cle={cle} m={m} onDeposer={deposer} onRetirer={retirer} messages={messages} lecture={lecture} />

        <div style={grilleAuto(200)}>
          <KpiCard label="CA des comptes 7" value={eur(g.total.B)} info="Total de la colonne balance : comptes de classe 7, crédit − débit du mois." />
          <KpiCard label="Écart du tableau" value={eur(g.total.R)} color={zero(g.total.R) ? C.green : C.orange} sub={zero(g.total.R) ? "tout est ventilé" : `${g.lignes.filter((l) => !zero(l.cells.R.valeur)).length} compte(s) à expliquer`} info="Total de la colonne R : balance − total ventilé, compte par compte." />
          <KpiCard label="Contrôle CA3" value={comparees ? `${okCtrl} / ${comparees}` : "—"} color={comparees && okCtrl === comparees ? C.green : C.red} sub={m.ca3 ? (okCtrl === comparees ? "tout est rapproché" : `${comparees - okCtrl} en écart`) : "CA3 à déposer"} />
          <KpiCard label="Saisies à la main" value={String(nbSaisies)} sub="cellules en jaune dans le tableau" />
        </div>
        <CodesInconnus v={g.v} onAffecter={affecterCode} />
        <Tableau g={g} ca3={m.ca3} connus={connus} aucunAutreMois={connus.size === 0} onSaisir={saisir} onNoter={noter} onClasser={classer} />
        <Controle controles={controles} ca3={m.ca3} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn small variant="ghost" onClick={viderMois}>Effacer {nomMois(cle)}</Btn>
        </div>
      </main>
    </div>
  );
}
