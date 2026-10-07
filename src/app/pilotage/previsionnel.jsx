"use client";
// Prévisionnel à 3 ans : hypothèses par année (modifiables par le client accompagné
// et le conseiller), compte de résultat prévisionnel annuel et mensuel, CAF, plan de
// financement et trésorerie mois par mois (réel puis prévision en pointillés).
// Moteur : src/lib/previsionnel3ans.js.
import { useState } from "react";
import { C, Card, Btn, Info } from "@/app/charte";
import * as P from "@/lib/pilotage";
import { HYP_DEFAUT, lirePrevisionnel3, sauverPrevisionnel3, baseAnnuelle, projeter, projeterMensuel } from "@/lib/previsionnel3ans";
import { VIZ, eur, pctFr, Lignes, Courbe, Legende } from "@/app/pilotage/graphiques";
import { Page, EnTete, CarteTitre, Chiffre, ChoixPeriode, Th, grid, num } from "@/app/pilotage/vues";

const court = (k) => P.keyLabel(k, false);
const mini = (k) => P.keyLabel(k, false).replace(/ \d\d(\d\d)$/, " $1");

// Lignes du prévisionnel mensuel : [libellé, valeur, options]. Le total d'une ligne
// « solde » est sa dernière valeur (trésorerie), les autres se cumulent.
const LIGNES_MOIS = [
  ["Compte de résultat", null, { section: true }],
  ["CA HT", (x) => x.ca, { gras: true }],
  ["Marge brute", (x) => x.marge],
  ["Charges externes", (x) => -x.externes],
  ["Impôts et taxes", (x) => -x.impots],
  ["Charges de personnel", (x) => -x.personnel],
  ["Subventions d'exploitation", (x) => x.subventions, { siNonNul: true }],
  ["EBE", (x) => x.ebe, { total: true }],
  ["Dotations aux amortissements", (x) => -x.dotations],
  ["Autres produits et charges", (x) => -x.autres],
  ["Résultat financier", (x) => -x.financier],
  ["IS", (x) => -x.is],
  ["Résultat net", (x) => x.rn, { total: true, fort: true }],
  ["Trésorerie", null, { section: true }],
  ["CAF", (x) => x.caf, { gras: true }],
  ["Variation du BFR", (x) => -x.varBfr],
  ["Investissements", (x) => -x.invest],
  ["Emprunts et apports", (x) => x.financement],
  ["Remboursement d'emprunts", (x) => -x.remboursements],
  ["Dividendes", (x) => -x.dividendes],
  ["Flux de trésorerie", (x) => x.flux, { total: true }],
  ["Trésorerie fin de mois", (x) => x.treso, { total: true, fort: true, solde: true }],
];
const td = (extra = {}) => ({ ...num, padding: "8px 12px", fontSize: 13, ...extra });

// Hypothèses saisies par année : [clé, libellé, unité, pas, définition]
const HYPOTHESES = [
  ["croissance", "Croissance du CA", "%", 1, "Variation du CA HT par rapport à l'année précédente."],
  ["tauxMarge", "Taux de marge brute", "%", 0.5, "Laisser vide pour conserver le taux constaté sur les 12 derniers mois."],
  ["charges", "Évolution charges externes", "%", 1, "Variation des charges externes (loyers, honoraires, sous-traitance…)."],
  ["salaires", "Évolution masse salariale", "%", 1, "Augmentations sur la masse salariale existante."],
  ["embauches", "Embauches (coût annuel)", "€", 1000, "Coût employeur annuel des recrutements de l'année, environ 1,45 × le brut annuel."],
  ["invest", "Investissements HT", "€", 1000, "Acquisitions d'immobilisations de l'année."],
  ["dureeAmort", "Durée d'amortissement", "ans", 1, "Durée d'amortissement linéaire des investissements de l'année."],
  ["emprunt", "Nouvel emprunt", "€", 1000, "Montant emprunté dans l'année (encaissé en début d'année)."],
  ["dureeEmprunt", "Durée de l'emprunt", "ans", 1, "Remboursement par annuités constantes."],
  ["tauxEmprunt", "Taux de l'emprunt", "%", 0.1, "Taux annuel nominal."],
  ["apports", "Apports en capital / CCA", "€", 1000, "Augmentation de capital ou apport en compte courant d'associé."],
  ["dividendes", "Dividendes versés", "€", 1000, "Distributions prélevées sur la trésorerie."],
];

const GROUPES = [
  { titre: "Exploitation", cles: ["croissance", "tauxMarge", "charges", "salaires", "embauches"], bfr: true },
  { titre: "Investissement et financement", cles: ["invest", "dureeAmort", "emprunt", "dureeEmprunt", "tauxEmprunt", "apports", "dividendes"] },
];

// Champ numérique compact avec son unité ; une saisie vide renvoie null.
function Saisie({ value, pas, unite, actif, label, placeholder, onChange }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input type="number" step={pas} value={value ?? ""} disabled={!actif} aria-label={label} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        style={{ width: 70, padding: "6px 6px", border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 12.5, textAlign: "right", fontFamily: "inherit", color: C.text, background: actif ? "white" : C.bgLight }} />
      <span style={{ width: 18, fontSize: 11.5, color: C.textMid, fontWeight: 700, textAlign: "left" }}>{unite}</span>
    </span>
  );
}

export default function Previsionnel3Ans({ client, moisIdx, moisYear, tresoOf, onSaveDonnees }) {
  const enregistre = lirePrevisionnel3(client);
  const [brouillon, setBrouillon] = useState(null);
  const [msg, setMsg] = useState("");
  const [vue, setVue] = useState("annuel");
  const [anneeM, setAnneeM] = useState(0);
  const peutModifier = !!onSaveDonnees;
  const cle = P.monthKey(moisIdx, moisYear);
  // Trésorerie de départ : réelle avec le FEC, sinon estimée si le solde bancaire est renseigné.
  let base = baseAnnuelle(client, cle, null), tresoEstimee = null;
  if (base && !base.tresoReelle && client.tresorerie?.dateSolde) {
    const [y, m] = base.fin.split("-").map(Number);
    tresoEstimee = tresoOf(m - 1, y);
    if (tresoEstimee != null) base = { ...base, tresorerie: tresoEstimee };
  }

  if (!base) {
    return (
      <Page>
        <EnTete title="Prévisionnel à 3 ans" />
        <Card style={{ padding: "30px 26px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>Aucune donnée de référence</div>
          <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>Le prévisionnel part des 12 derniers mois réalisés : il sera disponible dès le premier import.</div>
        </Card>
      </Page>
    );
  }

  const hyp = brouillon || enregistre || { annees: [0, 1, 2].map(() => ({ ...HYP_DEFAUT })), bfrJours: null };
  const proj = projeter(client, base, hyp);
  const mens = projeterMensuel(client, base, hyp, proj);
  const modifie = !!brouillon;
  const debutAn = (a) => P.shiftKey(base.fin, a * 12 + 1), finAn = (a) => P.shiftKey(base.fin, (a + 1) * 12);
  const libAn = (a) => `${court(debutAn(a))} → ${court(finAn(a))}`;
  const setHyp = (a, k, v) => setBrouillon({ ...hyp, annees: hyp.annees.map((h, i) => (i === a ? { ...h, [k]: v } : h)) });
  const enregistrer = async () => {
    const ok = await sauverPrevisionnel3(onSaveDonnees, { annees: hyp.annees, bfrJours: hyp.bfrJours });
    setMsg(ok ? "Prévisionnel enregistré." : "L'enregistrement a échoué, réessayez.");
    if (ok) setBrouillon(null);
    setTimeout(() => setMsg(""), 5000);
  };

  const a3 = proj[2];
  const tcam = base.ca > 0 && a3.ca > 0 ? (Math.pow(a3.ca / base.ca, 1 / 3) - 1) * 100 : null;
  const rnCumul = proj.reduce((s, x) => s + x.rn, 0);
  const pointBas = mens.reduce((m, x) => (x.treso < m.treso ? x : m), mens[0]);
  // Historique de trésorerie (12 mois jusqu'au départ), prolongé par les 36 mois prévus.
  const fidx = P.fecIndex(client);
  const histo = Array.from({ length: 12 }, (_, i) => P.shiftKey(base.fin, i - 11)).map((k) => {
    const [y, m] = k.split("-").map(Number);
    const v = k === base.fin ? base.tresorerie : fidx.months.has(k) ? P.bilanAt(client, k).tresoNette : client.tresorerie?.dateSolde ? tresoOf(m - 1, y) : null;
    return { key: k, l: mini(k), v, current: k === base.fin };
  });
  const moisAn = mens.filter((x) => x.annee === anneeM);
  const bfrJours = hyp.bfrJours ?? base.bfrJours;
  const cols = [{ id: "base", label: "N · réalisé", detail: `${court(base.debut)} → ${court(base.fin)}` }, ...proj.map((_, a) => ({ id: a, label: `N+${a + 1}`, detail: libAn(a) }))];

  // Lignes du compte de résultat prévisionnel : [libellé, valeur base, valeur projetée, options]
  const baseRn = base.rcai - P.estimateIS(base.rcai);
  const lignesCR = [
    ["CA HT", base.ca, (x) => x.ca, { gras: true }],
    ["Croissance", null, (x, i) => (i === 0 ? base.ca : proj[i - 1].ca) > 0 ? pctFr(((x.ca / (i === 0 ? base.ca : proj[i - 1].ca)) - 1) * 100, 1) : "—", { texte: true, discret: true }],
    ["Marge brute", base.marge, (x) => x.marge],
    ["Taux de marge brute", base.ca > 0 ? pctFr((base.marge / base.ca) * 100, 1) : "—", (x) => pctFr(x.tauxMarge * 100, 1), { texte: true, discret: true }],
    ["Charges externes", -base.externes, (x) => -x.externes],
    ["Impôts et taxes", -base.impots, (x) => -x.impots],
    ["Charges de personnel", -base.personnel, (x) => -x.personnel],
    ...(Math.abs(base.subventions) > 0.5 ? [["Subventions d'exploitation", base.subventions, () => base.subventions]] : []),
    ["EBE", base.ebe, (x) => x.ebe, { total: true }],
    ["EBE / CA", base.ca > 0 ? pctFr((base.ebe / base.ca) * 100, 1) : "—", (x) => x.ca > 0 ? pctFr((x.ebe / x.ca) * 100, 1) : "—", { texte: true, discret: true }],
    ["Dotations aux amortissements", -base.dotations, (x) => -x.dotations],
    ["Autres produits et charges", -base.autres, (x) => -x.autres],
    ["Résultat financier", -base.financier, (x) => -x.financier],
    ["Résultat courant avant impôt", base.rcai, (x) => x.rcai, { total: true }],
    ["IS", -(base.rcai - baseRn), (x) => -x.is],
    ["Résultat net", baseRn, (x) => x.rn, { total: true, fort: true }],
    ["CAF", baseRn + base.dotations, (x) => x.caf, { gras: true }],
  ];
  const lignesPF = [
    ["Ressources", null, null, { section: true }],
    ["CAF", (x) => x.ressources.caf],
    ["Emprunts nouveaux", (x) => x.ressources.emprunts],
    ["Apports", (x) => x.ressources.apports],
    ["Total ressources", (x) => x.ressources.caf + x.ressources.emprunts + x.ressources.apports, { total: true }],
    ["Emplois", null, null, { section: true }],
    ["Investissements", (x) => x.emplois.invest],
    ["Remboursement d'emprunts", (x) => x.emplois.remboursements],
    ["Variation du BFR", (x) => x.emplois.bfr],
    ["Dividendes", (x) => x.emplois.dividendes],
    ["Total emplois", (x) => x.emplois.invest + x.emplois.remboursements + x.emplois.bfr + x.emplois.dividendes, { total: true }],
    ["Variation de trésorerie", (x) => x.variation, { total: true, fort: true }],
    ["Trésorerie fin d'année", (x) => x.treso, { total: true, fort: true, treso: true }],
  ];
  const couleur = (v) => (v < -0.5 ? C.red : C.text);

  return (
    <Page>
      <EnTete title="Prévisionnel à 3 ans"
        detail={`Base N : ${court(base.debut)} → ${court(base.fin)}${base.mois < 12 ? ` (${base.mois} mois annualisés)` : ""} · trésorerie de départ ${eur(base.tresorerie)} (${base.tresoReelle ? "réelle" : tresoEstimee != null ? "estimée" : "non renseignée"})${enregistre?.majLe ? ` · mis à jour le ${enregistre.majLe}` : ""}`}
        sub="Projection sur 3 années glissantes à partir des 12 derniers mois réalisés : compte de résultat prévisionnel annuel et mensuel, CAF, plan de financement et trésorerie mois par mois. Les impôts et taxes et les autres charges suivent le CA ; les intérêts des emprunts existants restent constants ; l'IS est calculé au taux réduit PME." />

      <div style={grid(200)}>
        <Chiffre label="CA HT N+3" value={eur(a3.ca)} sub={tcam != null ? `TCAM ${tcam >= 0 ? "+" : ""}${pctFr(tcam, 1)}` : null} aide="Taux de croissance annuel moyen entre N et N+3." />
        <Chiffre label="EBE N+3" value={eur(a3.ebe)} sub={a3.ca > 0 ? `${pctFr((a3.ebe / a3.ca) * 100, 1)} du CA` : null} statut={a3.ebe < 0 ? "bad" : a3.ebe < base.ebe ? "warn" : "ok"} />
        <Chiffre label="Résultat net cumulé" value={eur(rnCumul)} sub="N+1 à N+3" statut={rnCumul < 0 ? "bad" : "ok"} />
        <Chiffre label="Trésorerie fin N+3" value={eur(a3.treso)} sub={`Point bas : ${eur(pointBas.treso)} en ${court(pointBas.key)}`} statut={pointBas.treso < 0 ? "bad" : pointBas.treso < base.personnel / 12 ? "warn" : "ok"} aide="Point bas mensuel sur les 36 mois. Négatif : besoin de financement à couvrir (emprunt, apport, report d'investissement)." />
      </div>

      <Card>
        <CarteTitre title="Hypothèses" sub="Saisissez les hypothèses année par année : tous les tableaux se recalculent immédiatement. Enregistrez pour les conserver." detail={modifie ? "Modifications non enregistrées" : null}
          right={peutModifier && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {modifie && <Btn small variant="ghost" onClick={() => setBrouillon(null)}>Annuler</Btn>}
              {(enregistre || modifie) && <Btn small variant="ghost" onClick={() => setBrouillon({ annees: [0, 1, 2].map(() => ({ ...HYP_DEFAUT })), bfrJours: null })}>Réinitialiser</Btn>}
              <Btn small onClick={enregistrer} disabled={!modifie}>Enregistrer</Btn>
            </div>
          )} />
        {msg && <div style={{ margin: "10px 22px 0", fontSize: 12.5, fontWeight: 700, color: msg.includes("échoué") ? C.red : C.green }}>{msg}</div>}
        <div style={{ ...grid(500), padding: "12px 22px 20px" }}>
          {GROUPES.map((g) => (
            <div key={g.titre} style={{ border: `1px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden", minWidth: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><Th>{g.titre}</Th>{[0, 1, 2].map((a) => <Th key={a} right>N+{a + 1}</Th>)}</tr></thead>
                  <tbody>
                    {HYPOTHESES.filter((h) => g.cles.includes(h[0])).map(([k, l, u, pas, aide]) => (
                      <tr key={k} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.3 }}><span style={{ display: "inline-flex", alignItems: "center" }}>{l}<Info>{aide}</Info></span></td>
                        {[0, 1, 2].map((a) => (
                          <td key={a} style={{ padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <Saisie value={hyp.annees[a][k]} pas={pas} unite={u} actif={peutModifier} label={`${l} N+${a + 1}`}
                              placeholder={k === "tauxMarge" && base.ca > 0 ? ((base.marge / base.ca) * 100).toFixed(1).replace(".", ",") : ""}
                              onChange={(v) => setHyp(a, k, v === null && k !== "tauxMarge" ? 0 : v)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {g.bfr && (
                      <tr style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.3 }}><span style={{ display: "inline-flex", alignItems: "center" }}>BFR en jours de CA<Info>{`BFR rapporté au CA annuel, appliqué aux trois années. Laisser vide pour conserver le niveau constaté (${base.bfrJours} jours).`}</Info></span></td>
                        <td colSpan={3} style={{ padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <Saisie value={hyp.bfrJours} pas={1} unite="j" actif={peutModifier} label="BFR en jours de CA" placeholder={String(base.bfrJours)}
                            onChange={(v) => setBrouillon({ ...hyp, bfrJours: v })} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CarteTitre title="Trésorerie mensuelle" detail={`${base.tresoReelle ? "Réel" : "Estimé"} sur 12 mois, puis prévision sur 36 mois`} sub="Trait plein : trésorerie constatée. Pointillés : trésorerie prévue selon les hypothèses, mois par mois (saisonnalité des 12 derniers mois)." />
        <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Legende items={[{ label: base.tresoReelle ? "Réel" : "Estimé", color: VIZ.serie, line: true }, { label: "Prévision", color: VIZ.serie, dash: true }]} />
          <Courbe data={[...histo, ...mens.map((x) => ({ key: x.key, l: mini(x.key), p: x.treso }))]} height={230}
            tip={(x) => x.p != null ? [P.keyLabel(x.key), `Prévision : ${eur(x.p)}`] : [P.keyLabel(x.key), `Trésorerie : ${eur(x.v)}`]} />
        </div>
      </Card>

      <Card>
        <CarteTitre title={vue === "annuel" ? "Compte de résultat prévisionnel" : "Prévisionnel mensuel"} detail={vue === "annuel" ? "Montants annuels HT" : `N+${anneeM + 1} · ${libAn(anneeM)}`}
          sub={vue === "mensuel" ? "Chaque année est répartie mois par mois : CA, achats, impôts et taxes selon la saisonnalité des 12 derniers mois ; charges externes, personnel, dotations, frais financiers et IS par douzièmes. Investissements, emprunts et apports au 1er mois de l'année, dividendes au 6e. Les 12 mois retombent sur les totaux annuels." : null}
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {vue === "mensuel" && <ChoixPeriode value={anneeM} onChange={setAnneeM} options={[[0, "N+1"], [1, "N+2"], [2, "N+3"]]} />}
              <ChoixPeriode value={vue} onChange={setVue} options={[["annuel", "Annuel"], ["mensuel", "Mensuel"]]} />
            </div>
          } />
        {vue === "mensuel" ? (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
              <thead><tr><Th>&nbsp;</Th>{moisAn.map((x) => <Th key={x.key} right>{mini(x.key)}</Th>)}<Th right>Total</Th></tr></thead>
              <tbody>
                {LIGNES_MOIS.filter(([, , o = {}]) => !o.siNonNul || Math.abs(base.subventions) > 0.5).map(([l, f, o = {}]) => o.section ? (
                  <tr key={l}><td colSpan={14} style={{ padding: "12px 12px 4px", fontSize: 10.5, fontWeight: 900, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</td></tr>
                ) : (
                  <tr key={l} style={{ borderTop: o.total ? `1.5px solid ${C.text}` : `1px solid ${C.borderLight}`, background: o.fort ? C.bgLight : "transparent" }}>
                    <td style={{ padding: "7px 10px", fontSize: 12, fontWeight: o.total || o.gras ? 900 : 700, color: C.text, whiteSpace: "nowrap", position: "sticky", left: 0, background: o.fort ? C.bgLight : C.white }}>{l}</td>
                    {moisAn.map((x) => { const v = f(x); return <td key={x.key} style={td({ padding: "7px 5px", fontSize: 11.5, fontWeight: o.total || o.gras ? 900 : 600, color: Math.abs(v) < 0.5 ? C.textLight : couleur(v) })}>{Math.abs(v) < 0.5 ? "—" : eur(v)}</td>; })}
                    {(() => { const t = o.solde ? f(moisAn[11]) : moisAn.reduce((a, x) => a + f(x), 0); return <td style={td({ padding: "7px 10px", fontSize: 12, fontWeight: 900, color: couleur(t), background: C.bgLight })}>{eur(t)}</td>; })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr><Th>&nbsp;</Th>{cols.map((c) => <Th key={c.id} right>{c.label}</Th>)}</tr></thead>
            <tbody>
              <tr><td />{cols.map((c) => <td key={c.id} style={td({ fontSize: 11, color: C.textLight, fontWeight: 600, paddingTop: 2 })}>{c.detail}</td>)}</tr>
              {lignesCR.map(([l, vb, f, o = {}]) => (
                <tr key={l} style={{ borderTop: o.total ? `1.5px solid ${C.text}` : `1px solid ${C.borderLight}`, background: o.fort ? C.bgLight : "transparent" }}>
                  <td style={{ padding: "8px 12px", fontSize: o.discret ? 12 : 13, fontWeight: o.total || o.gras ? 900 : o.discret ? 600 : 700, color: o.discret ? C.textMid : C.text, paddingLeft: o.discret ? 24 : 12, whiteSpace: "nowrap" }}>{l}</td>
                  <td style={td({ fontWeight: o.total || o.gras ? 900 : 700, color: o.texte ? C.textMid : couleur(vb), fontSize: o.discret ? 12 : 13 })}>{o.texte ? vb ?? "" : eur(vb)}</td>
                  {proj.map((x, i) => { const v = f(x, i); return <td key={i} style={td({ fontWeight: o.total || o.gras ? 900 : 700, color: o.texte ? C.textMid : couleur(v), fontSize: o.discret ? 12 : 13 })}>{o.texte ? v : eur(v)}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      <div style={grid(420)}>
        <Card>
          <CarteTitre title="Plan de financement" sub="Ressources (CAF, emprunts, apports) − emplois (investissements, remboursements, variation du BFR, dividendes) = variation de trésorerie." />
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <thead><tr><Th>&nbsp;</Th>{proj.map((_, a) => <Th key={a} right>N+{a + 1}</Th>)}</tr></thead>
              <tbody>
                {lignesPF.map(([l, f, , o = {}]) => o.section ? (
                  <tr key={l}><td colSpan={4} style={{ padding: "12px 12px 4px", fontSize: 10.5, fontWeight: 900, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</td></tr>
                ) : (
                  <tr key={l} style={{ borderTop: o.total ? `1.5px solid ${C.text}` : `1px solid ${C.borderLight}`, background: o.fort ? C.bgLight : "transparent" }}>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: o.total ? 900 : 700, color: C.text, whiteSpace: "nowrap" }}>{l}</td>
                    {proj.map((x, i) => { const v = f(x); return <td key={i} style={td({ fontWeight: o.total ? 900 : 700, color: (o.treso || o.fort) && v < 0 ? C.red : C.text })}>{eur(v)}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 22px 16px", fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>BFR : {bfrJours} jours de CA · trésorerie de départ {eur(base.tresorerie)}</div>
        </Card>
        <Card>
          <CarteTitre title="Trajectoire" detail="EBE et résultat net annuels" />
          <div style={{ padding: "14px 18px 18px" }}>
            <Lignes labels={["N", "N+1", "N+2", "N+3"]} keys={cols.map((c) => `${c.label} · ${c.detail}`)}
              series={[
                { label: "EBE", color: VIZ.serie, values: [base.ebe, ...proj.map((x) => x.ebe)] },
                { label: "Résultat net", color: VIZ.achats, values: [baseRn, ...proj.map((x) => x.rn)] },
              ]} height={230} />
          </div>
        </Card>
      </div>
    </Page>
  );
}
