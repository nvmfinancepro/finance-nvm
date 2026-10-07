"use client";
// Plan d'actions (partagé dirigeant / conseiller, avec la valeur créée par
// l'accompagnement) et prévision de trésorerie sur 3, 6 ou 12 mois.
import { useState } from "react";
import { C, Card, Btn } from "@/app/charte";
import * as P from "@/lib/pilotage";
import { dataIndex } from "@/lib/donnees";
import { lireActions, sauverActions, nouvelleAction, enRetard, STATUTS_ACTION, RESPONSABLES, lirePrevisions, sauverPrevisions } from "@/lib/actions";
import { prevoirTresorerie, moisFuturs, departPrevision } from "@/lib/prevision";
import { VIZ, eur, Courbe, Legende, PastilleStatut } from "@/app/pilotage/graphiques";
import { Page, EnTete, ChoixPeriode, CarteTitre, Chiffre, Th, grid, num, fmtDate } from "@/app/pilotage/vues";
import { Titre } from "@/app/pilotage/synthese";

const signe = (v) => `${v >= 0 ? "+" : "−"}${eur(Math.abs(v))}`;
const court = (k) => P.keyLabel(k, false).replace(/ \d+$/, "");
const td = (extra = {}) => ({ ...num, padding: "8px 12px", fontSize: 13, ...extra });

// ── Valeur créée par l'accompagnement (journal tenu par le conseiller dans la fiche client)
export function ValeurCreee({ client, compact = false }) {
  const j = client.impactJournal;
  if (!client.impactJournalEnabled || !j?.items?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
      <div style={{ background: C.primary, borderRadius: 20, padding: "22px 24px", color: "white", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 18px 40px rgba(0,86,83,.22)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>{j.totalLabel || "Valeur créée"}</div>
        <div style={{ fontSize: 32, fontWeight: 900 }}>{eur(j.total || 0)}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.85 }}>{j.periode || "Depuis le début de l'accompagnement"}</div>
      </div>
      <Card style={{ gridColumn: compact ? "auto" : "span 2" }}>
        <CarteTitre title="Gains réalisés" sub={`Actions mises en place avec ${client.advisorLabel || "votre conseiller"} et leur impact.`} />
        <div style={{ padding: "8px 22px 16px" }}>
          {j.items.slice(0, compact ? 4 : 50).map((it, i) => (
            <div key={it.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.borderLight}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.kind === "temps" ? VIZ.personnel : C.green, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{it.label}</div>{it.date && <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{it.date}</div>}</div>
              {it.kind === "temps"
                ? <div style={{ textAlign: "right", fontSize: 13, fontWeight: 900, color: C.primary, whiteSpace: "nowrap" }}>{it.avant} → {it.apres}{it.frequence ? ` ${it.frequence}` : ""}{it.valeurEstimee > 0 && <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700 }}>≈ {eur(it.valeurEstimee)}/mois</div>}</div>
                : <div style={{ fontSize: 13.5, fontWeight: 900, color: C.green, whiteSpace: "nowrap" }}>{it.type === "economie" ? "−" : "+"}{eur(Number(it.montant) || 0)}{it.recurrent ? "/mois" : ""}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PLAN D'ACTIONS
// ══════════════════════════════════════════════════════════════════════
export function PlanActions({ client, onSaveDonnees }) {
  const actions = lireActions(client);
  const [form, setForm] = useState(null);
  const [filtre, setFiltre] = useState("ouvertes");
  const [msg, setMsg] = useState("");
  const peut = !!onSaveDonnees;
  const enregistrer = async (liste) => {
    const ok = await sauverActions(onSaveDonnees, liste);
    setMsg(ok ? "" : "L'enregistrement a échoué, réessayez.");
    return ok;
  };
  const maj = (id, patch) => enregistrer(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const ouvertes = actions.filter((a) => a.statut !== "fait"), faites = actions.filter((a) => a.statut === "fait");
  const retard = ouvertes.filter((a) => enRetard(a));
  const impact = actions.reduce((s, a) => s + (Number(a.impact) || 0), 0);
  const liste = (filtre === "ouvertes" ? ouvertes : filtre === "faites" ? faites : actions).slice().sort((a, b) => (a.echeance || "9999") < (b.echeance || "9999") ? -1 : 1);
  return (
    <Page>
      <EnTete title="Plan d'actions" sub="Décisions de gestion suivies jusqu'à leur réalisation : responsable, échéance, gain attendu."
        right={peut && <Btn onClick={() => setForm(nouvelleAction())}>+ Nouvelle action</Btn>} />
      <ValeurCreee client={client} />
      <div style={grid(200)}>
        <Chiffre label="Actions en cours" value={String(ouvertes.length)} sub={`${faites.length} terminée${faites.length > 1 ? "s" : ""}`} />
        <Chiffre label="En retard" value={String(retard.length)} statut={retard.length ? "warn" : "ok"} subTon sub={retard.length ? "Échéance dépassée" : "Dans les délais"} />
        <Chiffre label="Gain attendu" value={eur(impact)} sub="Annuel, toutes actions" />
      </div>
      {form && (
        <Card style={{ padding: "18px 22px", borderColor: C.primary }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 12 }}>{actions.some((a) => a.id === form.id) ? "Modifier l'action" : "Nouvelle action"}</div>
          <div style={grid(220)}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid, gridColumn: "1 / -1" }}>Action<input className="inp" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex : renégocier le contrat d'assurance" /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid, gridColumn: "1 / -1" }}>Détail (facultatif)<textarea className="inp" rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid }}>Qui s'en occupe<select className="inp" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })}>{RESPONSABLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid }}>Pour quand<input type="date" className="inp" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid }}>Gain estimé (€ par an)<input type="number" step="100" className="inp" value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) || 0 })} /></label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn disabled={!form.titre.trim()} onClick={async () => { const existe = actions.some((a) => a.id === form.id); if (await enregistrer(existe ? actions.map((a) => (a.id === form.id ? form : a)) : [...actions, form])) setForm(null); }}>Enregistrer</Btn>
            <Btn variant="ghost" onClick={() => setForm(null)}>Annuler</Btn>
          </div>
        </Card>
      )}
      {msg && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.red }}>{msg}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Titre>Les actions</Titre>
        <ChoixPeriode value={filtre} onChange={setFiltre} options={[["ouvertes", `En cours (${ouvertes.length})`], ["faites", `Terminées (${faites.length})`], ["toutes", "Toutes"]]} />
      </div>
      {!liste.length ? (
        <Card style={{ padding: "26px 24px", textAlign: "center", fontSize: 13.5, color: C.textMid, lineHeight: 1.6 }}>
          {actions.length ? "Aucune action dans cette liste." : "Pas encore d'action. Chaque point d'attention peut devenir une action (bouton « Ajouter au plan d'actions »), ou se créer ici après un rendez-vous."}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map((a) => {
            const late = enRetard(a);
            return (
              <Card key={a.id} style={{ padding: "14px 18px", borderColor: late ? C.orange : a.statut === "fait" ? C.border : C.text, opacity: a.statut === "fait" ? 0.75 : 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <PastilleStatut statut={a.statut === "fait" ? "ok" : late ? "warn" : "na"} size={24} />
                  <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 900, color: C.text, textDecoration: a.statut === "fait" ? "line-through" : "none" }}>{a.titre}</div>
                    {a.detail && <div style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5, marginTop: 2 }}>{a.detail}</div>}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, fontSize: 12, fontWeight: 700, color: C.textMid }}>
                      <span>{a.responsable}</span>
                      {a.echeance && <span style={{ color: late ? C.orange : C.textMid }}>{late ? "En retard · " : "Pour le "}{fmtDate(a.echeance)}</span>}
                      {Number(a.impact) > 0 && <span style={{ color: C.green }}>Gain estimé {eur(a.impact)}/an</span>}
                    </div>
                  </div>
                  {peut ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select className="inp" style={{ width: "auto" }} value={a.statut} onChange={(e) => maj(a.id, { statut: e.target.value, ...(e.target.value === "fait" ? { faitLe: new Date().toISOString().slice(0, 10) } : {}) })} aria-label="Statut">
                        {STATUTS_ACTION.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <Btn small variant="ghost" onClick={() => setForm(a)}>Modifier</Btn>
                      <Btn small variant="ghost" style={{ color: C.red, borderColor: C.red + "44" }} onClick={() => { if (window.confirm("Supprimer cette action ?")) enregistrer(actions.filter((x) => x.id !== a.id)); }}>Supprimer</Btn>
                    </div>
                  ) : <span style={{ fontSize: 12, fontWeight: 800, color: C.textMid }}>{STATUTS_ACTION.find((s) => s.id === a.statut)?.label}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PRÉVISION DE TRÉSORERIE
// ══════════════════════════════════════════════════════════════════════
const SOURCES = { budget: "budget", n1: "N-1", tendance: "tendance 3 mois", aucune: "aucune donnée" };
export function PrevisionTresorerie({ client, moisIdx, moisYear, tresoOf, onSaveDonnees, isAdminPreview }) {
  const [horizon, setHorizon] = useState(6);
  const [ligne, setLigne] = useState(null);
  const idx = dataIndex(client), fidx = P.fecIndex(client);
  const key = P.monthKey(moisIdx, moisYear);
  const dp = departPrevision(client, key, tresoOf);
  const depart = dp?.depart || [...idx.keys].reverse().find((k) => k <= key);
  const peut = !!onSaveDonnees;
  if (!dp) return (
    <Page>
      <EnTete title="Plan de trésorerie" />
      <Card style={{ padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>Il faut un point de départ</div>
        <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, maxWidth: 580, margin: "0 auto" }}>{!depart ? "La prévision part du dernier mois connu : elle s'affiche dès les premiers chiffres importés." : isAdminPreview ? "Importez la comptabilité (FEC) ou renseignez le solde bancaire de départ dans Données financières › Trésorerie." : `${client.advisorLabel || "Votre conseiller"} importe votre comptabilité ou renseigne votre solde bancaire : la prévision s'affichera alors ici.`}</div>
      </Card>
    </Page>
  );
  const soldeDepart = dp.solde;
  const mois = prevoirTresorerie(client, depart, horizon, soldeDepart);
  // Historique (6 derniers mois) affiché en trait plein avant la prévision.
  const histo = Array.from({ length: 6 }, (_, i) => P.shiftKey(depart, i - 5)).map((k) => {
    const [y, m] = k.split("-").map(Number);
    const v = k === depart ? soldeDepart : fidx.months.has(k) ? P.bilanAt(client, k).tresoNette : idx.months.has(k) ? tresoOf(m - 1, y) : null;
    return { key: k, l: court(k), v, current: k === depart };
  });
  const manuels = lirePrevisions(client);
  const fin = mois[mois.length - 1];
  const bas = mois.reduce((m, x) => (x.solde < m.solde ? x : m), mois[0]);
  const basP = mois.reduce((m, x) => (x.soldeP < m.soldeP ? x : m), mois[0]);
  const besoin = Math.min(0, basP.soldeP);
  const sources = [...new Set(mois.map((x) => x.source))].map((s) => SOURCES[s]).join(", ");
  const enregistrerLigne = async () => {
    const montant = (ligne.sens === "sortie" ? -1 : 1) * Math.abs(Number(ligne.montant) || 0);
    const l = { id: ligne.id || `p${Date.now()}`, mois: ligne.mois, libelle: ligne.libelle.trim(), montant };
    const ok = await sauverPrevisions(onSaveDonnees, [...manuels.filter((x) => x.id !== l.id), l]);
    if (ok) setLigne(null);
  };
  const futurs = moisFuturs(depart, 12);
  return (
    <Page>
      <EnTete title="Plan de trésorerie" detail={`Départ fin ${P.keyLabel(depart)} : ${eur(soldeDepart)} (${fidx.months.has(depart) ? "réel" : "estimé"}) · base d'activité : ${sources}`} sub="Activité mensuelle selon le budget, à défaut N-1 (saisonnalité), à défaut la moyenne des 3 derniers mois ; déduction des échéances d'emprunt et des acomptes d'IS ; mouvements exceptionnels saisis. BFR supposé stable."
        right={<ChoixPeriode value={horizon} onChange={setHorizon} options={[[3, "3 mois"], [6, "6 mois"], [12, "12 mois"]]} />} />
      <div style={grid(210)}>
        <Chiffre label={`Trésorerie fin ${P.keyLabel(fin.key)}`} value={eur(fin.solde)} sub={`Scénario prudent : ${eur(fin.soldeP)}`} statut={fin.solde < 0 ? "bad" : fin.soldeP < 0 ? "warn" : "ok"} />
        <Chiffre label="Point le plus bas" value={eur(bas.solde)} sub={`En ${P.keyLabel(bas.key)}`} statut={bas.solde < 0 ? "bad" : "ok"} />
        <Chiffre label="Besoin de financement" value={besoin < 0 ? eur(-besoin) : "Aucun"} statut={besoin < 0 ? "bad" : "ok"} subTon sub={besoin < 0 ? `Scénario prudent · ${P.keyLabel(basP.key)}` : "Y compris scénario prudent"} aide="Point bas négatif du scénario prudent : montant à couvrir (découvert autorisé, crédit court terme)." />
      </div>
      <Card>
        <CarteTitre title="Trésorerie nette fin de mois" detail={`Réel jusqu'à ${P.keyLabel(depart)}, prévision sur ${horizon} mois`} sub="Trait plein : trésorerie constatée. Pointillés : scénario central et scénario prudent (CA −10 % à charges fixes inchangées)." />
        <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Legende items={[{ label: dp.reel ? "Réel" : "Estimé", color: VIZ.serie, line: true }, { label: "Prévision centrale", color: VIZ.serie, dash: true }, { label: "Scénario prudent", color: VIZ.achats, dash: true }]} />
          <Courbe data={[...histo, ...mois.map((x) => ({ key: x.key, l: court(x.key), p: x.solde, pp: x.soldeP }))]} height={220}
            tip={(x) => x.p != null ? [P.keyLabel(x.key), `Central : ${eur(x.p)}`, `Prudent : ${eur(x.pp)}`] : [P.keyLabel(x.key), `Trésorerie : ${eur(x.v)}`]} />
        </div>
      </Card>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr><Th>Mois</Th><Th right>EBE</Th><Th right>Emprunts</Th><Th right>IS</Th><Th right>Exceptionnel</Th><Th right>Flux net</Th><Th right>Trésorerie</Th><Th right>Prudent</Th></tr></thead>
            <tbody>
              {mois.map((x) => (
                <tr key={x.key} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: "8px 12px" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text, textTransform: "capitalize" }}>{P.keyLabel(x.key)}</div><div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{SOURCES[x.source]}</div></td>
                  <td style={td({ color: x.activite < 0 ? C.red : C.text })}>{signe(x.activite)}</td>
                  <td style={td({ color: x.emprunts ? C.red : C.textLight })}>{x.emprunts ? signe(-x.emprunts) : "—"}</td>
                  <td style={td({ color: x.is ? C.red : C.textLight })}>{x.is ? signe(-x.is) : "—"}</td>
                  <td style={td({ color: x.autres ? (x.autres < 0 ? C.red : C.green) : C.textLight })} title={x.lignes.map((l) => l.libelle).join(", ")}>{x.autres ? signe(x.autres) : "—"}</td>
                  <td style={td({ fontWeight: 800, color: x.variation < 0 ? C.red : C.green })}>{signe(x.variation)}</td>
                  <td style={td({ fontWeight: 900, color: x.solde < 0 ? C.red : C.text })}>{eur(x.solde)}</td>
                  <td style={td({ color: x.soldeP < 0 ? C.red : C.textMid })}>{eur(x.soldeP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CarteTitre title="Flux exceptionnels" sub="Investissements, emprunts, subventions, apports, dividendes : flux hors activité courante."
          right={peut && !ligne && <Btn small onClick={() => setLigne({ mois: futurs[0], libelle: "", montant: "", sens: "sortie" })}>+ Ajouter</Btn>} />
        <div style={{ padding: "10px 22px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {ligne && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", background: C.bgLight, borderRadius: 12, padding: 12 }}>
              <select className="inp" style={{ width: "auto" }} value={ligne.sens} onChange={(e) => setLigne({ ...ligne, sens: e.target.value })} aria-label="Sens"><option value="sortie">Dépense</option><option value="entree">Encaissement</option></select>
              <select className="inp" style={{ width: "auto" }} value={ligne.mois} onChange={(e) => setLigne({ ...ligne, mois: e.target.value })} aria-label="Mois">{futurs.map((k) => <option key={k} value={k}>{P.keyLabel(k)}</option>)}</select>
              <input className="inp" style={{ flex: "1 1 200px", width: "auto" }} placeholder="Ex : achat d'un véhicule" value={ligne.libelle} onChange={(e) => setLigne({ ...ligne, libelle: e.target.value })} aria-label="Libellé" />
              <input className="inp" type="number" style={{ width: 130 }} placeholder="Montant €" value={ligne.montant} onChange={(e) => setLigne({ ...ligne, montant: e.target.value })} aria-label="Montant" />
              <Btn small disabled={!ligne.libelle.trim() || !Number(ligne.montant)} onClick={enregistrerLigne}>Enregistrer</Btn>
              <Btn small variant="ghost" onClick={() => setLigne(null)}>Annuler</Btn>
            </div>
          )}
          {!manuels.length && !ligne && <div style={{ fontSize: 13, color: C.textLight }}>Aucun flux exceptionnel saisi.</div>}
          {manuels.slice().sort((a, b) => (a.mois < b.mois ? -1 : 1)).map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.borderLight}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}><span style={{ color: C.textMid, textTransform: "capitalize" }}>{P.keyLabel(l.mois)}</span> · {l.libelle}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ ...num, fontSize: 13, fontWeight: 900, color: l.montant < 0 ? C.red : C.green }}>{signe(Number(l.montant))}</span>
                {peut && <Btn small variant="ghost" style={{ color: C.red, borderColor: C.red + "44", padding: "2px 10px", fontSize: 11 }} onClick={() => sauverPrevisions(onSaveDonnees, manuels.filter((x) => x.id !== l.id))}>Retirer</Btn>}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
