"use client";
// Vues de décision et de suivi : budget (réel vs objectifs, atterrissage),
// comparaison de périodes (avec l'explication des écarts), simulations « et si »,
// rentabilité par produit, emprunts, investissements, trésorerie estimée et
// points d'attention. Mêmes données pour tous les clients (src/lib/donnees.js).
import { useState } from "react";
import { C, Card, Btn } from "@/app/charte";
import * as P from "@/lib/pilotage";
import { dataIndex, produitsSur } from "@/lib/donnees";
import { LIGNES_BUDGET, ebeDe, lireBudget, budgetMois, realiseMois, proposerBudget, repartir } from "@/lib/budget";
import { lireActions, sauverActions, nouvelleAction } from "@/lib/actions";
import { mensualiteEmprunt, mensualiteHorsAssurance, capitalRestant, echeancesPayees, amortMensuel, moisAmortis, vnc } from "@/lib/estimations";
import { VIZ, eur, pctFr, Courbe, Lignes, Variation, PastilleStatut, STATUT } from "@/app/pilotage/graphiques";
import { NavMois, Titre } from "@/app/pilotage/synthese";
import { Page, EnTete, ChoixPeriode, CarteTitre, Chiffre, Th, grid, num, fmtDate, LIGNES_SIG, HorsPeriode, PRODUITS } from "@/app/pilotage/vues";

const court = (k) => P.keyLabel(k, false).replace(/ \d+$/, "");
const signe = (v) => `${v >= 0 ? "+" : "−"}${eur(Math.abs(v))}`;
const td = (extra = {}) => ({ ...num, padding: "8px 12px", fontSize: 13, ...extra });

function Vide({ titre, texte, action }) {
  return (
    <Card style={{ padding: "30px 26px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>{titre}</div>
      <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, maxWidth: 600, margin: "0 auto" }}>{texte}</div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </Card>
  );
}
function Encart({ children, ton = "info" }) {
  const c = ton === "warn" ? { bg: C.orangeBg, bd: C.orange + "44", fg: C.orange } : { bg: C.bgLight, bd: C.borderLight, fg: C.textMid };
  return <div style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 12, padding: "10px 14px", fontSize: 12.5, fontWeight: 600, color: c.fg, lineHeight: 1.55 }}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════════════
// BUDGET : objectifs, réel vs budget, atterrissage
// ══════════════════════════════════════════════════════════════════════
export function BudgetView({ client, moisIdx, moisYear, onSaveDonnees }) {
  const [annee, setAnnee] = useState(moisYear);
  const [mode, setMode] = useState(null);
  const [brouillon, setBrouillon] = useState(null);
  const [hausses, setHausses] = useState({ ca: 5, charges: 2, salaires: 3 });
  const [msg, setMsg] = useState("");
  const budget = lireBudget(client, annee);
  const vue = mode || (budget ? "suivi" : "saisie");
  const peutModifier = !!onSaveDonnees;
  const moisKeys = Array.from({ length: 12 }, (_, i) => P.monthKey(i, annee));
  const reel = moisKeys.map((k) => realiseMois(client, k));
  const nbReels = reel.reduce((n, r, i) => (r ? i + 1 : n), 0);
  const navAnnee = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 100, padding: 4 }}>
      <button aria-label="Année précédente" onClick={() => { setAnnee(annee - 1); setMode(null); setBrouillon(null); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: C.bg, color: C.primary, fontWeight: 900, cursor: "pointer" }}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 900, color: C.text, minWidth: 70, textAlign: "center" }}>{annee}</span>
      <button aria-label="Année suivante" onClick={() => { setAnnee(annee + 1); setMode(null); setBrouillon(null); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: C.bg, color: C.primary, fontWeight: 900, cursor: "pointer" }}>›</button>
    </div>
  );
  const onglets = budget || brouillon ? <ChoixPeriode value={vue} onChange={(v) => { setMode(v); if (v === "saisie" && !brouillon) setBrouillon(budget); }} options={[["suivi", "Réel vs budget"], ["saisie", peutModifier ? "Construire le budget" : "Voir le budget"]]} /> : null;

  const enregistrer = async () => {
    const rows = [{ ...Object.fromEntries(LIGNES_BUDGET.map((l) => [l.id, brouillon[l.id]])), majLe: new Date().toLocaleDateString("fr-FR") }];
    const ok = await onSaveDonnees({ type: "budget", label: `Budget ${annee}`, mois: String(annee), rows, count: 1, importedAt: new Date().toLocaleDateString("fr-FR") });
    setMsg(ok ? "Budget enregistré." : "L'enregistrement a échoué, réessayez.");
    if (ok) { setMode("suivi"); setBrouillon(null); }
    setTimeout(() => setMsg(""), 5000);
  };

  // ── Construction / saisie
  if (vue === "saisie") {
    const b = brouillon;
    const proposer = () => { const p = proposerBudget(client, annee, hausses); setBrouillon(p.budget); setMsg(p.base === "n1" ? `Proposition construite à partir de ${annee - 1}, mois par mois.` : p.base === "moyenne" ? "Proposition construite à partir de la moyenne des derniers mois connus." : "Aucune donnée passée : saisissez vos objectifs."); };
    const setCase = (ligne, i, v) => setBrouillon((x) => ({ ...x, [ligne]: x[ligne].map((y, j) => (j === i ? v : y)) }));
    // Nouveau total annuel : réparti selon le profil de la ligne, ou celui du CA si elle est vide.
    const setTotal = (ligne, total) => setBrouillon((x) => ({ ...x, [ligne]: repartir(total, x[ligne].some((v) => v > 0) ? x[ligne] : x.ca) }));
    return (
      <Page>
        <EnTete title={`Budget ${annee}`} sub="Vos objectifs mois par mois, du chiffre d'affaires à l'excédent d'exploitation. Ils servent ensuite à suivre le réel et à anticiper la fin d'année." nav={navAnnee} right={onglets} />
        {peutModifier && (
          <Card style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 4 }}>{b ? "Repartir d'une proposition" : "Construire le budget en un clic"}</div>
            <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 600, marginBottom: 14, lineHeight: 1.55 }}>On part des mêmes mois de l'an dernier (pour garder la saisonnalité), on applique vos hypothèses, puis vous ajustez chaque case.</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              {[["ca", "Évolution du chiffre d'affaires"], ["charges", "Évolution des charges"], ["salaires", "Évolution des salaires"]].map(([k, l]) => (
                <label key={k} style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 800, color: C.textMid }}>
                  {l}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="number" step="1" value={hausses[k]} onChange={(e) => setHausses({ ...hausses, [k]: Number(e.target.value) })} className="inp" style={{ width: 90 }} /> %</span>
                </label>
              ))}
              <Btn onClick={proposer}>Proposer un budget</Btn>
            </div>
            {msg && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.green, marginTop: 10 }}>{msg}</div>}
          </Card>
        )}
        {!b && !peutModifier && <Vide titre={`Pas encore de budget pour ${annee}`} texte={`${client.advisorLabel || "Votre conseiller"} construit le budget avec vous ; il apparaîtra ici avec le suivi du réel.`} />}
        {b && (
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
                <thead><tr><Th w={190}>&nbsp;</Th>{moisKeys.map((k) => <Th key={k} right>{court(k)}</Th>)}<Th right>Année</Th></tr></thead>
                <tbody>
                  {LIGNES_BUDGET.map((l) => (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "8px 12px" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{l.label}</div><div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{l.aide}</div></td>
                      {b[l.id].map((v, i) => (
                        <td key={i} style={{ padding: "4px 3px" }}>
                          <input type="number" step="100" value={v} disabled={!peutModifier} onChange={(e) => setCase(l.id, i, Number(e.target.value) || 0)} aria-label={`${l.label} ${court(moisKeys[i])}`}
                            style={{ width: "100%", minWidth: 64, padding: "6px 6px", border: `1px solid ${C.borderLight}`, borderRadius: 7, fontSize: 12.5, textAlign: "right", fontFamily: "inherit", color: C.text, background: peutModifier ? "white" : C.bgLight }} />
                        </td>
                      ))}
                      <td style={{ padding: "4px 8px" }}>
                        <input type="number" step="1000" value={b[l.id].reduce((s, v) => s + v, 0)} disabled={!peutModifier} onChange={(e) => setTotal(l.id, Number(e.target.value) || 0)} aria-label={`${l.label} total annuel`} title="Modifier le total le répartit sur les mois"
                          style={{ width: 96, padding: "6px 6px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12.5, fontWeight: 900, textAlign: "right", fontFamily: "inherit", color: C.text, background: peutModifier ? C.bgLight : C.bgLight }} />
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `2px solid ${C.text}`, background: C.bgLight }}>
                    <td style={{ padding: "10px 12px", fontSize: 13.5, fontWeight: 900, color: C.text }}>Excédent d'exploitation</td>
                    {moisKeys.map((k, i) => { const v = ebeDe(budgetMois(b, i)); return <td key={k} style={td({ fontWeight: 900, color: v < 0 ? C.red : C.text, fontSize: 12.5 })}>{eur(v)}</td>; })}
                    <td style={td({ fontWeight: 900 })}>{eur(moisKeys.reduce((s, k, i) => s + ebeDe(budgetMois(b, i)), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {peutModifier && (
              <div style={{ padding: "14px 22px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${C.borderLight}` }}>
                <Btn onClick={enregistrer}>Enregistrer le budget</Btn>
                {budget && <Btn variant="ghost" onClick={() => { setBrouillon(null); setMode("suivi"); }}>Annuler</Btn>}
                <span style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>Astuce : modifier le total de l'année le répartit sur les mois en gardant la saisonnalité.</span>
              </div>
            )}
          </Card>
        )}
      </Page>
    );
  }

  // ── Suivi : réel vs budget
  const cumul = (arr, n) => arr.slice(0, n).reduce((s, v) => s + v, 0);
  const reelLigne = (id) => reel.map((r) => (r ? r[id] : 0));
  const ebeReel = reel.map((r) => (r ? ebeDe(r) : 0));
  const ebeBudget = moisKeys.map((_, i) => ebeDe(budgetMois(budget, i)));
  const n = nbReels;
  const caR = cumul(reelLigne("ca"), n), caB = cumul(budget.ca, n), caAn = cumul(budget.ca, 12);
  const ebeR = cumul(ebeReel, n), ebeB = cumul(ebeBudget, n), ebeAn = cumul(ebeBudget, 12);
  const attCA = caR + cumul(budget.ca.slice(n), 12), attEBE = ebeR + cumul(ebeBudget.slice(n), 12);
  let cr = 0, cb = 0;
  const cumulCA = moisKeys.map((_, i) => { cb += budget.ca[i]; if (i < n) cr += reelLigne("ca")[i]; return { r: i < n ? cr : null, b: cb }; });
  const ecartTon = (e, produit = true) => (Math.abs(e) < 1 ? C.textMid : (e > 0) === produit ? C.green : C.red);
  return (
    <Page>
      <EnTete title={`Budget ${annee}`} sub={n ? `Le réel de ${n} mois (${court(moisKeys[0])} → ${court(moisKeys[n - 1])}) comparé à vos objectifs, et la projection de fin d'année.` : "Aucun mois réel pour cette année : le suivi commencera avec les premiers chiffres."} nav={navAnnee} right={onglets} />
      {msg && <Encart>{msg}</Encart>}
      <div style={grid(210)}>
        <Chiffre label="Chiffre d'affaires cumulé" value={eur(caR)} sub={`Budget sur la période : ${eur(caB)}`} delta={n > 0 && <Variation cur={caR} prev={caB} label="vs budget" />} />
        <Chiffre label="Excédent d'exploitation cumulé" value={eur(ebeR)} sub={`Budget sur la période : ${eur(ebeB)}`} delta={n > 0 && <Variation cur={ebeR} prev={ebeB} label="vs budget" />} />
        <Chiffre label="Atterrissage chiffre d'affaires" value={eur(attCA)} sub={`Objectif annuel : ${eur(caAn)}`} statut={!n ? null : attCA >= caAn ? "ok" : attCA >= caAn * 0.95 ? "warn" : "bad"} aide="Le réel des mois passés plus le budget des mois restants." />
        <Chiffre label="Atterrissage excédent d'exploitation" value={eur(attEBE)} sub={`Objectif annuel : ${eur(ebeAn)}`} statut={!n ? null : attEBE >= ebeAn ? "ok" : attEBE >= ebeAn - Math.abs(ebeAn) * 0.1 ? "warn" : "bad"} aide="Ce que l'année dégagera si les mois restants tiennent le budget." />
      </div>
      <Card>
        <CarteTitre title="Chiffre d'affaires cumulé : réel et budget" sub="Quand la courbe du réel passe sous celle du budget, le retard se creuse." />
        <div style={{ padding: "12px 18px 16px" }}>
          <Lignes labels={moisKeys.map(court)} keys={moisKeys.map((k) => P.keyLabel(k))} series={[{ label: "Budget cumulé", color: VIZ.achats, values: cumulCA.map((x) => x.b) }, { label: "Réel cumulé", color: VIZ.serie, values: cumulCA.map((x) => x.r) }]} />
        </div>
      </Card>
      <Card>
        <CarteTitre title="Par poste, sur les mois écoulés" sub="Un écart vert est favorable au résultat, un écart rouge le pénalise." />
        <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>&nbsp;</Th><Th right>Réel</Th><Th right>Budget</Th><Th right>Écart</Th><Th right>Atterrissage</Th><Th right>Budget annuel</Th></tr></thead>
            <tbody>
              {[...LIGNES_BUDGET, { id: "ebe", label: "Excédent d'exploitation", produit: true, total: true }].map((l) => {
                const r = l.id === "ebe" ? ebeR : cumul(reelLigne(l.id), n);
                const bb = l.id === "ebe" ? ebeB : cumul(budget[l.id], n);
                const an = l.id === "ebe" ? ebeAn : cumul(budget[l.id], 12);
                const att = l.id === "ebe" ? attEBE : r + cumul(budget[l.id].slice(n), 12);
                return (
                  <tr key={l.id} style={{ borderTop: `${l.total ? 2 : 1}px solid ${l.total ? C.text : C.borderLight}`, background: l.total ? C.bgLight : "white" }}>
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: l.total ? 900 : 800, color: C.text }}>{l.label}</td>
                    <td style={td({ fontWeight: 900 })}>{eur(r)}</td>
                    <td style={td({ color: C.textMid })}>{eur(bb)}</td>
                    <td style={td({ fontWeight: 800, color: ecartTon(r - bb, !!l.produit) })}>{n ? signe(r - bb) : "—"}</td>
                    <td style={td({ fontWeight: 800 })}>{eur(att)}</td>
                    <td style={td({ color: C.textMid })}>{eur(an)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CarteTitre title="Mois par mois" sub="Chiffre d'affaires et excédent d'exploitation, réel face au budget." />
        <div style={{ overflowX: "auto", padding: "8px 0 6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><Th>Mois</Th><Th right>CA réel</Th><Th right>CA budget</Th><Th right>Écart</Th><Th right>EBE réel</Th><Th right>EBE budget</Th><Th right>Écart</Th></tr></thead>
            <tbody>
              {moisKeys.map((k, i) => {
                const r = reel[i];
                return (
                  <tr key={k} style={{ borderTop: `1px solid ${C.borderLight}`, opacity: r ? 1 : 0.6 }}>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 800, color: C.text, textTransform: "capitalize" }}>{P.keyLabel(k)}</td>
                    <td style={td({ fontWeight: 800 })}>{r ? eur(r.ca) : "—"}</td>
                    <td style={td({ color: C.textMid })}>{eur(budget.ca[i])}</td>
                    <td style={td({ fontWeight: 800, color: r ? ecartTon(r.ca - budget.ca[i]) : C.textLight })}>{r ? signe(r.ca - budget.ca[i]) : ""}</td>
                    <td style={td({ fontWeight: 800 })}>{r ? eur(ebeReel[i]) : "—"}</td>
                    <td style={td({ color: C.textMid })}>{eur(ebeBudget[i])}</td>
                    <td style={td({ fontWeight: 800, color: r ? ecartTon(ebeReel[i] - ebeBudget[i]) : C.textLight })}>{r ? signe(ebeReel[i] - ebeBudget[i]) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{budget.majLe ? `Budget mis à jour le ${budget.majLe}.` : ""}</div>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// COMPARER DEUX PÉRIODES (et expliquer l'écart)
// ══════════════════════════════════════════════════════════════════════
export function Comparaison({ client, moisIdx, moisYear, setMoisIdx, setMoisKey }) {
  const [preset, setPreset] = useState("mois_n1");
  const idx = dataIndex(client);
  const key = P.monthKey(moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  if (!idx.months.has(key)) return <HorsPeriode title="Comparer deux périodes" idx={idx} keyM={key} setMoisKey={setMoisKey} nav={nav} />;
  const ytd = P.ytdKeys(idx, key);
  const trim = [P.shiftKey(key, -2), P.shiftKey(key, -1), key];
  const defs = {
    mois_n1: { a: [key], b: [P.shiftKey(key, -12)], la: P.keyLabel(key), lb: P.keyLabel(P.shiftKey(key, -12)) },
    mois_prec: { a: [key], b: [P.shiftKey(key, -1)], la: P.keyLabel(key), lb: P.keyLabel(P.shiftKey(key, -1)) },
    cumul_n1: { a: ytd, b: ytd.map((k) => P.shiftKey(k, -12)), la: `${court(ytd[0])} → ${court(key)} ${moisYear}`, lb: `même période ${moisYear - 1}` },
    trimestre: { a: trim, b: trim.map((k) => P.shiftKey(k, -3)), la: `${court(trim[0])} → ${court(key)}`, lb: `${court(P.shiftKey(trim[0], -3))} → ${court(P.shiftKey(key, -3))}` },
  };
  const d = defs[preset];
  const manque = d.b.filter((k) => !idx.months.has(k)).length;
  const plA = P.plOver(idx, d.a), plB = P.plOver(idx, d.b.filter((k) => idx.months.has(k)));
  const sA = P.sigOf(plA), sB = P.sigOf(plB);
  const lignes = LIGNES_SIG.filter((l) => l.total || Math.abs(l.f(plA, sA)) >= 1 || Math.abs(l.f(plB, sB)) >= 1);
  // Ce qui explique l'écart de résultat : effet de chaque compte sur le résultat
  const effets = new Map();
  for (const [pl, sg] of [[plA, 1], [plB, -1]]) for (const a of pl.accounts.values()) {
    const effet = (PRODUITS.has(a.poste) ? a.v : -a.v) * sg;
    const g = P.pcgRacine(a.c);
    const x = effets.get(g) || { c: g, l: P.pcgLabel(g) || a.l, v: 0 };
    x.v += effet; effets.set(g, x);
  }
  const tri = [...effets.values()].filter((x) => Math.abs(x.v) >= 1).sort((a, b) => b.v - a.v);
  const plus = tri.filter((x) => x.v > 0).slice(0, 5), moins = tri.filter((x) => x.v < 0).slice(-5).reverse();
  const ecartRN = sA.rn - sB.rn;
  return (
    <Page>
      <EnTete title="Comparer deux périodes" sub="Ce qui a changé, et surtout pourquoi : l'écart de résultat décomposé poste par poste." nav={nav}
        right={<ChoixPeriode value={preset} onChange={setPreset} options={[["mois_n1", "Mois vs l'an dernier"], ["mois_prec", "Mois vs mois précédent"], ["cumul_n1", "Exercice vs l'an dernier"], ["trimestre", "3 derniers mois vs 3 précédents"]]} />} />
      {manque > 0 && <Encart ton="warn">{manque === d.b.length ? "Pas de données pour la période de comparaison." : `${manque} mois manquent dans la période de comparaison : l'écart est surévalué.`}</Encart>}
      <div style={grid(200)}>
        {[["Chiffre d'affaires", sA.ca, sB.ca], ["Marge brute", sA.margeBrute, sB.margeBrute], ["Excédent d'exploitation", sA.ebe, sB.ebe], ["Résultat", sA.rn, sB.rn]].map(([l, a, b]) => (
          <Chiffre key={l} label={l} value={eur(a)} sub={`${d.lb} : ${eur(b)}`} delta={<Variation cur={a} prev={b} label={`vs ${d.lb}`} />} />
        ))}
      </div>
      <div style={grid(440)}>
        <Card>
          <CarteTitre title="Pourquoi le résultat a bougé" sub={`Résultat ${signe(ecartRN)} entre ${d.lb} et ${d.la}. Les postes qui expliquent l'écart :`} />
          <div style={{ padding: "12px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            {[["Ce qui a amélioré le résultat", plus, C.green], ["Ce qui l'a pénalisé", moins, C.red]].map(([t, list, col]) => list.length > 0 && (
              <div key={t}>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: C.text, marginBottom: 6 }}>{t}</div>
                {list.map((x) => (
                  <div key={x.c} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{x.l}</span>
                    <span style={{ ...num, fontSize: 13, fontWeight: 900, color: col }}>{signe(x.v)}</span>
                  </div>
                ))}
              </div>
            ))}
            {!plus.length && !moins.length && <div style={{ fontSize: 13, color: C.textLight }}>Pas d'écart notable.</div>}
          </div>
        </Card>
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead><tr><Th>&nbsp;</Th><Th right>{d.la}</Th><Th right>{d.lb}</Th><Th right>Écart</Th></tr></thead>
              <tbody>
                {lignes.map((l) => {
                  const a = l.f(plA, sA), b = l.f(plB, sB);
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.borderLight}`, background: l.total ? C.bgLight : "white" }}>
                      <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: l.total ? 900 : 700, color: C.text }}>{l.label}</td>
                      <td style={td({ fontWeight: l.total ? 900 : 700, color: l.total && a < 0 ? C.red : C.text })}>{eur(a)}</td>
                      <td style={td({ color: C.textMid })}>{eur(b)}</td>
                      <td style={td({ fontWeight: 800, color: Math.abs(a - b) < 1 ? C.textMid : a > b ? C.green : C.red })}>{signe(a - b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SIMULATIONS : « et si… », investissement, embauche
// ══════════════════════════════════════════════════════════════════════
function Curseur({ label, value, onChange, min, max, step, unite, aide }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, fontWeight: 800, color: C.text }}>
        {label}<span style={{ ...num, color: value === 0 ? C.textLight : value > 0 ? C.primary : C.orange }}>{value > 0 ? "+" : ""}{unite === "€" ? eur(value) : `${value} %`}{unite === "€" ? " / mois" : ""}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ accentColor: C.primary }} />
      {aide && <span style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{aide}</span>}
    </label>
  );
}
export function Simulations({ client, moisIdx, moisYear, roi, embauche }) {
  const [onglet, setOnglet] = useState("etsi");
  const [lev, setLev] = useState({ prix: 0, volume: 0, achats: 0, charges: 0, embauche: 0 });
  const idx = dataIndex(client);
  const key = P.monthKey(moisIdx, moisYear);
  const fin = [...idx.keys].reverse().find((k) => k <= key);
  const ttm = fin ? P.ttmKeys(idx, fin) : [];
  const f = 12 / Math.max(1, ttm.length);
  const pl = P.plOver(idx, ttm), s = P.sigOf(pl);
  const base = { ca: s.ca * f, achats: (s.ca - s.margeBrute) * f, externes: pl.chargesExternes * f, personnel: s.personnel * f };
  base.autres = base.ca - base.achats - base.externes - base.personnel - s.ebe * f;
  const sc = {
    ca: base.ca * (1 + lev.prix / 100) * (1 + lev.volume / 100),
    achats: base.achats * (1 + lev.volume / 100) * (1 + lev.achats / 100),
    externes: base.externes + lev.charges * 12,
    personnel: base.personnel + lev.embauche * 12,
    autres: base.autres,
  };
  const ebe = (x) => x.ca - x.achats - x.externes - x.personnel - x.autres;
  const pointMort = (x) => { const tx = x.ca > 0 ? 1 - x.achats / x.ca : 0; return tx > 0 ? (x.externes + x.personnel + x.autres) / tx : null; };
  const dE = ebe(sc) - ebe(base);
  const levier = (k) => { const x = { ...base, ca: base.ca * (k === "prix" || k === "volume" ? 1.01 : 1), achats: base.achats * (k === "volume" ? 1.01 : k === "achats" ? 0.99 : 1) }; return ebe(x) - ebe(base); };
  const tabs = <ChoixPeriode value={onglet} onChange={setOnglet} options={[["etsi", "Et si…"], ["roi", "Un investissement"], ["embauche", "Une embauche"]]} />;
  if (onglet === "roi") return <Page><EnTete title="Simulations" sub="Mesurer l'effet d'une décision avant de la prendre." right={tabs} />{roi}</Page>;
  if (onglet === "embauche") return <Page><EnTete title="Simulations" sub="Mesurer l'effet d'une décision avant de la prendre." right={tabs} />{embauche}</Page>;
  return (
    <Page>
      <EnTete title="Simulations" sub={ttm.length ? `Point de départ : vos ${ttm.length} derniers mois${ttm.length < 12 ? ", ramenés à l'année" : ""} (${court(ttm[0])} → ${court(fin)}). Bougez les curseurs : tout se recalcule.` : "Les simulations utilisent vos derniers mois d'activité : elles s'activent dès les premiers chiffres importés."} right={tabs} />
      {ttm.length > 0 && (
        <>
          <div style={grid(420)}>
            <Card style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Vos décisions</div>
              <Curseur label="Prix de vente" value={lev.prix} min={-20} max={20} step={1} unite="%" onChange={(v) => setLev({ ...lev, prix: v })} aide="Même volume vendu, prix augmentés ou baissés." />
              <Curseur label="Volume vendu" value={lev.volume} min={-30} max={30} step={1} unite="%" onChange={(v) => setLev({ ...lev, volume: v })} aide="Plus ou moins de ventes, au même prix (les achats suivent)." />
              <Curseur label="Coût des achats" value={lev.achats} min={-20} max={20} step={1} unite="%" onChange={(v) => setLev({ ...lev, achats: v })} aide="Négociation fournisseurs ou hausse des prix d'achat." />
              <Curseur label="Charges externes" value={lev.charges} min={-5000} max={5000} step={100} unite="€" onChange={(v) => setLev({ ...lev, charges: v })} aide="Un loyer, un abonnement, une campagne publicitaire en plus ou en moins." />
              <Curseur label="Masse salariale" value={lev.embauche} min={-10000} max={10000} step={250} unite="€" onChange={(v) => setLev({ ...lev, embauche: v })} aide="Coût employeur mensuel d'une embauche (environ 1,45 × le brut) ou d'un départ." />
              <div><Btn small variant="ghost" onClick={() => setLev({ prix: 0, volume: 0, achats: 0, charges: 0, embauche: 0 })}>Remettre à zéro</Btn></div>
            </Card>
            <Card>
              <CarteTitre title="Résultat sur une année" sub="Aujourd'hui et avec vos décisions." />
              <div style={{ margin: "14px 22px 0", background: dE >= 0 ? C.greenBg : C.redBg, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.textMid }}>Excédent d'exploitation annuel</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text }}>{eur(ebe(sc))}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: Math.abs(dE) < 1 ? C.textMid : dE > 0 ? C.green : C.red }}>{Math.abs(dE) < 1 ? "Identique à aujourd'hui" : `${signe(dE)} par an par rapport à aujourd'hui (${eur(ebe(base))})`}</div>
              </div>
              <div style={{ overflowX: "auto", padding: "10px 0 6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><Th>&nbsp;</Th><Th right>Aujourd'hui</Th><Th right>Avec vos décisions</Th></tr></thead>
                  <tbody>
                    {[["Chiffre d'affaires", "ca"], ["Achats consommés", "achats"], ["Charges externes", "externes"], ["Salaires et charges", "personnel"], ["Impôts, taxes et autres", "autres"]].map(([l, k]) => (
                      <tr key={k} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, color: C.text }}>{l}</td>
                        <td style={td({ color: C.textMid })}>{eur(base[k])}</td>
                        <td style={td({ fontWeight: 800, color: Math.abs(sc[k] - base[k]) >= 1 ? C.primary : C.text })}>{eur(sc[k])}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${C.text}`, background: C.bgLight }}>
                      <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 900 }}>Point mort (CA minimum)</td>
                      <td style={td({ color: C.textMid })}>{eur(pointMort(base))}</td>
                      <td style={td({ fontWeight: 900 })}>{eur(pointMort(sc))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <Card style={{ padding: "16px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, marginBottom: 4 }}>Quel levier rapporte le plus ?</div>
            <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 600, marginBottom: 12 }}>L'effet d'un petit 1 % sur votre excédent d'exploitation annuel.</div>
            <div style={grid(200)}>
              {[["+1 % sur les prix", levier("prix"), "Tout le gain va dans la marge."], ["+1 % de volume", levier("volume"), "Le gain est diminué des achats nécessaires."], ["−1 % sur les achats", levier("achats"), "Une négociation fournisseur."]].map(([l, v, a]) => (
                <div key={l} style={{ background: C.bgLight, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: C.textMid }}>{l}</div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: C.text }}>{signe(v)}</div>
                  <div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{a}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RENTABILITÉ PAR PRODUIT (catalogue + ventes)
// ══════════════════════════════════════════════════════════════════════
function lireCatalogue(r) {
  const tva = Number(String(r.taux_tva ?? "").replace(",", ".")) || 20;
  const n = (v) => (v == null || v === "" ? null : parseFloat(String(v).replace(",", ".").replace(/[%€\s]/g, "")));
  const pv = n(r.pvht) ?? (n(r.prix_vente_ttc) != null ? n(r.prix_vente_ttc) / (1 + tva / 100) : null) ?? n(r.prix_unitaire_ht);
  const cout = n(r.paht) ?? n(r.cout_achat_ht) ?? n(r.cout_matiere) ?? n(r.cout_production) ?? n(r.prix_achat_ht) ?? null;
  return { ref: String(r.reference || "").trim(), l: String(r.nom_produit || r.designation || r.reference || "Produit").trim(), pv, cout, categorie: r.categorie || "" };
}
export function RentabiliteProduits({ client, moisIdx, moisYear }) {
  const idx = dataIndex(client);
  const key = P.monthKey(moisIdx, moisYear);
  const fin = [...idx.keys].reverse().find((k) => k <= key);
  const ytd = fin ? P.ytdKeys(idx, fin) : [];
  const ventes = produitsSur(client, ytd).produits;
  const catalogue = (client.imports || []).filter((i) => i.type === "catalogue").sort((a, b) => (a.mois < b.mois ? 1 : -1))[0]?.rows?.map(lireCatalogue) || [];
  const parNom = new Map(ventes.map((v) => [v.ref || v.l, v]));
  const lignes = (catalogue.length ? catalogue : ventes.map((v) => ({ ref: v.ref, l: v.l, pv: v.qte ? v.ca / v.qte : null, cout: v.qte ? (v.ca - v.marge) / v.qte : null }))).map((p) => {
    const v = parNom.get(p.ref) || parNom.get(p.l) || ventes.find((x) => x.l === p.l);
    const mu = p.pv != null && p.cout != null ? p.pv - p.cout : null;
    return { ...p, mu, taux: mu != null && p.pv ? (mu / p.pv) * 100 : v && v.ca ? (v.marge / v.ca) * 100 : null, qte: v?.qte || 0, ca: v?.ca || 0, marge: v ? v.marge : 0 };
  }).sort((a, b) => b.marge - a.marge || (b.taux ?? 0) - (a.taux ?? 0));
  const totalMarge = lignes.reduce((s, x) => s + Math.max(0, x.marge), 0);
  const faibles = lignes.filter((x) => x.taux != null && x.taux < 25);
  if (!lignes.length) return (
    <Page>
      <EnTete title="Rentabilité par produit" sub="Ce que rapporte chaque produit ou prestation, une fois son coût déduit." />
      <Vide titre="Pas encore de détail par produit" texte={`Il apparaît avec le catalogue (prix de vente et coût de chaque produit) ou les ventes détaillées par produit. ${client.advisorLabel || "Votre conseiller"} peut les importer pour vous.`} />
    </Page>
  );
  // Nombre de produits qui font 80 % de la marge (lignes déjà triées par marge décroissante)
  const cumuls = lignes.reduce((acc, x) => [...acc, (acc[acc.length - 1] || 0) + Math.max(0, x.marge)], []);
  const n80 = cumuls.findIndex((v) => v >= totalMarge * 0.8) + 1;
  return (
    <Page>
      <EnTete title="Rentabilité par produit" sub={`Ce que rapporte chaque produit ou prestation${ytd.length ? ` sur l'exercice (${court(ytd[0])} → ${court(fin)})` : ""}, une fois son coût déduit.`} />
      <div style={grid(220)}>
        <Chiffre label="Produits suivis" value={String(lignes.length)} sub={catalogue.length ? "D'après le catalogue importé" : "D'après les ventes importées"} />
        {totalMarge > 0 && n80 > 0 && <Chiffre label="Concentration de la marge" value={`${n80} produit${n80 > 1 ? "s" : ""}`} sub="font 80 % de votre marge" aide="Ce sont eux à protéger en priorité (stock, prix, mise en avant)." />}
        <Chiffre label="Marge faible (moins de 25 %)" value={String(faibles.length)} statut={faibles.length ? "warn" : "ok"} subTon sub={faibles.length ? "À revoir : prix ou coût" : "Aucun produit concerné"} aide="Un prix trop bas ou un coût d'achat trop élevé." />
      </div>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr><Th>Produit</Th><Th right>Prix de vente HT</Th><Th right>Coût</Th><Th right>Marge unitaire</Th><Th right>Taux</Th><Th right>Vendus</Th><Th right>Marge totale</Th><Th right>Part</Th></tr></thead>
            <tbody>
              {lignes.map((x, i) => (
                <tr key={x.ref + x.l + i} style={{ borderTop: `1px solid ${C.borderLight}`, background: x.taux != null && x.taux < 25 ? C.orangeBg : "white" }}>
                  <td style={{ padding: "8px 12px" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{x.l}</div>{x.ref && <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{x.ref}</div>}</td>
                  <td style={td()}>{x.pv != null ? eur(x.pv) : "—"}</td>
                  <td style={td({ color: C.textMid })}>{x.cout != null ? eur(x.cout) : "—"}</td>
                  <td style={td({ fontWeight: 800 })}>{x.mu != null ? eur(x.mu) : "—"}</td>
                  <td style={td({ fontWeight: 800, color: x.taux == null ? C.textLight : x.taux < 25 ? C.orange : C.green })}>{pctFr(x.taux)}</td>
                  <td style={td({ color: C.textMid })}>{x.qte ? Math.round(x.qte) : "—"}</td>
                  <td style={td({ fontWeight: 900 })}>{x.ca ? eur(x.marge) : "—"}</td>
                  <td style={td({ color: C.textMid })}>{totalMarge > 0 && x.marge > 0 ? pctFr((x.marge / totalMarge) * 100) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// EMPRUNTS ET INVESTISSEMENTS
// ══════════════════════════════════════════════════════════════════════
function Barre({ pct, couleur = VIZ.serie }) {
  return <div style={{ height: 8, background: C.bg, borderRadius: 5 }}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 8, background: couleur, borderRadius: 5 }} /></div>;
}
export function EmpruntsView({ client, moisIdx, moisYear }) {
  const [ouvert, setOuvert] = useState(null);
  const emprunts = client.emprunts || [];
  const key = P.monthKey(moisIdx, moisYear);
  const fidx = P.fecIndex(client);
  const bil = fidx.has ? P.bilanAt(client, key) : null;
  const lignes = emprunts.map((e) => {
    const k = echeancesPayees(e, moisIdx, moisYear);
    const restant = capitalRestant(e, k);
    const mens = mensualiteEmprunt(e);
    const t = (e.taux || 0) / 100, m = mensualiteHorsAssurance(e);
    let r = restant, interetsRestants = 0;
    for (let i = k; i < (e.duree || 0); i++) { interetsRestants += r * t; r = Math.max(0, r - (m - r * t)); }
    const d = e.dateDebut ? new Date(e.dateDebut) : null;
    const finE = d ? P.monthKey((d.getMonth() + (e.duree || 0) - 1) % 12, d.getFullYear() + Math.floor((d.getMonth() + (e.duree || 0) - 1) / 12)) : null;
    return { e, k, restant, mens, interetsRestants, finE, actif: mensualiteEmprunt(e, moisIdx, moisYear) > 0, prog: e.capital ? (1 - restant / e.capital) * 100 : 0 };
  });
  const tot = (f) => lignes.reduce((s, x) => s + f(x), 0);
  return (
    <Page>
      <EnTete title="Emprunts" sub="Ce qui reste à rembourser, ce que chaque mensualité coûte, et quand chaque prêt se termine." />
      {bil && <Encart>D'après la comptabilité au {fmtDate(P.monthEnd(bil.key))} : <strong>{eur(bil.dettesFin)}</strong> d'emprunts restant dus{bil.associes ? `, et ${eur(bil.associes)} en comptes courants d'associés` : ""}.</Encart>}
      {!emprunts.length ? (
        <Vide titre="Aucun emprunt renseigné" texte={`${client.advisorLabel || "Votre conseiller"} ajoute vos prêts (capital, taux, durée) : l'échéancier, le capital restant et le coût des intérêts se calculent alors automatiquement.`} />
      ) : (
        <>
          <div style={grid(210)}>
            <Chiffre label="Capital restant dû" value={eur(tot((x) => x.restant))} sub={`Sur ${eur(tot((x) => x.e.capital))} emprunté`} />
            <Chiffre label="Mensualités en cours" value={eur(tot((x) => (x.actif ? x.mens : 0)))} sub="Assurance comprise" aide="Ce qui sort de la banque chaque mois pour les prêts." />
            <Chiffre label="Intérêts restant à payer" value={eur(tot((x) => x.interetsRestants))} aide="Le coût qu'il reste à payer sur la durée des prêts." />
          </div>
          {lignes.map((x, i) => (
            <Card key={x.e.id || i}>
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 900, color: C.text }}>{x.e.libelle || "Emprunt"}</div>
                    <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>{eur(x.e.capital)} sur {x.e.duree} mois · {((x.e.tauxAnnuel ?? (x.e.taux || 0) * 12)).toFixed(2).replace(".", ",")} % par an{x.e.dateDebut ? ` · depuis le ${fmtDate(x.e.dateDebut)}` : ""}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 900, color: x.prog >= 100 ? C.green : C.primary, background: C.bg, borderRadius: 100, padding: "3px 11px", alignSelf: "flex-start" }}>{x.prog >= 100 ? "Remboursé" : `${Math.round(x.prog)} % remboursé`}</span>
                </div>
                <Barre pct={x.prog} />
                <div style={grid(150)}>
                  {[["Capital restant", eur(x.restant)], ["Mensualité", eur(x.mens)], ["Échéances restantes", `${Math.max(0, (x.e.duree || 0) - x.k)} mois`], ["Fin du prêt", x.finE ? P.keyLabel(x.finE) : "—"]].map(([l, v]) => (
                    <div key={l}><div style={{ fontSize: 11.5, fontWeight: 800, color: C.textMid }}>{l}</div><div style={{ fontSize: 15, fontWeight: 900, color: C.text, textTransform: l === "Fin du prêt" ? "capitalize" : "none" }}>{v}</div></div>
                  ))}
                </div>
                <div><Btn small variant="ghost" onClick={() => setOuvert(ouvert === i ? null : i)}>{ouvert === i ? "Masquer l'échéancier" : "Voir les 12 prochaines échéances"}</Btn></div>
                {ouvert === i && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                      <thead><tr><Th>Échéance</Th><Th right>Intérêts</Th><Th right>Capital</Th><Th right>Assurance</Th><Th right>Capital restant</Th></tr></thead>
                      <tbody>
                        {(() => {
                          const out = []; const t = (x.e.taux || 0) / 100, m = mensualiteHorsAssurance(x.e); let r = x.restant;
                          const d = x.e.dateDebut ? new Date(x.e.dateDebut) : new Date(moisYear, moisIdx, 1);
                          for (let j = x.k; j < (x.e.duree || 0) && out.length < 12; j++) {
                            const int = r * t, cap = Math.min(r, m - int); r = Math.max(0, r - cap);
                            const mm = d.getFullYear() * 12 + d.getMonth() + j;
                            out.push(<tr key={j} style={{ borderTop: `1px solid ${C.borderLight}` }}><td style={{ padding: "7px 12px", fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{P.keyLabel(P.monthKey(mm % 12, Math.floor(mm / 12)))}</td><td style={td({ color: C.orange })}>{eur(int)}</td><td style={td()}>{eur(cap)}</td><td style={td({ color: C.textMid })}>{eur(x.e.assurance || 0)}</td><td style={td({ fontWeight: 800 })}>{eur(r)}</td></tr>);
                          }
                          return out;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
export function InvestissementsView({ client, moisIdx, moisYear }) {
  const invs = client.investissements || [];
  const key = P.monthKey(moisIdx, moisYear);
  const fidx = P.fecIndex(client);
  const bil = fidx.has ? P.bilanAt(client, key) : null;
  const lignes = invs.map((inv) => {
    const am = amortMensuel(inv), me = moisAmortis(inv, moisIdx, moisYear), v = vnc(inv, moisIdx, moisYear);
    const gain = inv.gainMensuel || 0, retour = gain > 0 ? Math.ceil(inv.montantHT / gain) : null;
    return { inv, am, me, v, gain, retour, prog: ((inv.duree || 36) ? (me / (inv.duree || 36)) * 100 : 0) };
  });
  return (
    <Page>
      <EnTete title="Investissements" sub="Vos équipements et ce qu'ils valent encore : leur coût est étalé sur leur durée d'utilisation (amortissement)." />
      {bil && <Encart>D'après la comptabilité au {fmtDate(P.monthEnd(bil.key))} : immobilisations achetées pour <strong>{eur(bil.immoBrut)}</strong>, valeur restante <strong>{eur(bil.immoNet)}</strong> après {eur(bil.amortImmo)} d'amortissements.</Encart>}
      {!invs.length ? (
        <Vide titre="Aucun investissement renseigné" texte={`${client.advisorLabel || "Votre conseiller"} ajoute vos équipements (montant, date de mise en service, durée) : l'amortissement et la valeur restante se calculent alors automatiquement.`} />
      ) : (
        <>
          <div style={grid(210)}>
            <Chiffre label="Valeur d'achat" value={eur(lignes.reduce((s, x) => s + (x.inv.montantHT || 0), 0))} sub={`${invs.length} investissement${invs.length > 1 ? "s" : ""}`} />
            <Chiffre label="Amortissement mensuel" value={eur(lignes.reduce((s, x) => s + (x.me < (x.inv.duree || 36) ? x.am : 0), 0))} aide="Une charge comptable qui ne sort pas de la banque." />
            <Chiffre label="Valeur restante" value={eur(lignes.reduce((s, x) => s + x.v, 0))} aide="Ce que valent encore vos équipements en comptabilité." />
          </div>
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead><tr><Th>Investissement</Th><Th right>Montant HT</Th><Th right>Amorti</Th><Th right>Par mois</Th><Th right>Valeur restante</Th><Th right>Remboursé par ses gains en</Th></tr></thead>
                <tbody>
                  {lignes.map((x, i) => (
                    <tr key={x.inv.id || i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "9px 12px" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{x.inv.libelle}</div><div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{x.inv.dateMEP || x.inv.dateAchat ? `En service depuis le ${fmtDate(x.inv.dateMEP || x.inv.dateAchat)}` : ""} · {x.inv.duree || 36} mois</div></td>
                      <td style={td({ fontWeight: 800 })}>{eur(x.inv.montantHT)}</td>
                      <td style={{ padding: "9px 12px", minWidth: 120 }}><Barre pct={x.prog} couleur={VIZ.externes} /><div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, marginTop: 3, textAlign: "right" }}>{Math.round(x.prog)} %</div></td>
                      <td style={td({ color: C.textMid })}>{eur(x.am)}</td>
                      <td style={td({ fontWeight: 900 })}>{eur(x.v)}</td>
                      <td style={td({ color: x.retour == null ? C.textLight : x.retour <= (x.inv.duree || 36) ? C.green : C.orange, fontWeight: 800 })}>{x.retour == null ? "—" : `${x.retour} mois`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TRÉSORERIE ESTIMÉE (sans comptabilité)
// ══════════════════════════════════════════════════════════════════════
export function TresorerieEstimee({ client, moisIdx, moisYear, setMoisIdx, tresoOf, fluxOf, isAdminPreview }) {
  const key = P.monthKey(moisIdx, moisYear);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  const configuree = !!client.tresorerie?.dateSolde;
  if (!configuree) return (
    <Page>
      <EnTete title="Trésorerie" sub="L'argent disponible sur vos comptes, mois après mois." nav={nav} />
      <Vide titre="Le solde bancaire de départ n'est pas encore renseigné" texte={isAdminPreview ? "Renseignez le solde et sa date dans l'admin, Données financières › Trésorerie : la courbe se calcule ensuite automatiquement. Avec le FEC, la trésorerie réelle s'affiche sans rien saisir." : `${client.advisorLabel || "Votre conseiller"} renseigne votre solde de départ, ou importe votre comptabilité pour afficher votre trésorerie réelle.`} />
    </Page>
  );
  const keys = Array.from({ length: 12 }, (_, i) => P.shiftKey(key, i - 11));
  const data = keys.map((k) => { const [y, m] = k.split("-").map(Number); return { key: k, l: court(k), v: tresoOf(m - 1, y), current: k === key }; });
  const solde = tresoOf(moisIdx, moisYear);
  const f = fluxOf(moisIdx, moisYear);
  return (
    <Page>
      <EnTete title="Trésorerie" sub="Estimation à partir de votre solde de départ et de vos résultats mensuels. Pour le solde réel au centime, importez la comptabilité (FEC)." nav={nav} source="imports" />
      <div style={grid(210)}>
        <Chiffre label="Trésorerie estimée" value={solde == null ? "—" : eur(solde)} sub={`Fin ${P.keyLabel(key)}`} statut={solde == null ? null : solde < 0 ? "bad" : "ok"} />
        <Chiffre label="Variation du mois" value={signe(f.total)} aide="Résultat, plus les amortissements, moins le capital d'emprunt remboursé." />
      </div>
      <div style={grid(440)}>
        <Card>
          <CarteTitre title="Ce qui a fait bouger la trésorerie" sub={P.keyLabel(key)} />
          <div style={{ padding: "12px 22px 18px" }}>
            {[["Résultat du mois", f.resultat, "Le bénéfice (ou la perte) du mois."], ["Amortissements", f.amort, "Une charge qui ne sort pas de la banque : on la rajoute."], ["Capital d'emprunt remboursé", -f.capital, "Une sortie d'argent qui n'est pas une charge."], ...(f.ajustements.length ? [["Mouvements exceptionnels", f.ajust, f.ajustements.map((a) => a.libelle).filter(Boolean).join(", ")]] : [])].map(([l, v, a]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.borderLight}` }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{l}</div><div style={{ fontSize: 11.5, color: C.textLight, fontWeight: 600 }}>{a}</div></div>
                <span style={{ ...num, fontSize: 14, fontWeight: 900, color: v < 0 ? C.red : C.green }}>{signe(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.text}`, paddingTop: 10, marginTop: 4 }}><span style={{ fontSize: 14, fontWeight: 900 }}>Variation estimée</span><span style={{ ...num, fontSize: 15, fontWeight: 900, color: f.total < 0 ? C.red : C.green }}>{signe(f.total)}</span></div>
          </div>
        </Card>
        <Card>
          <CarteTitre title="Trésorerie estimée en fin de mois" sub="12 derniers mois." />
          <div style={{ padding: "12px 18px 16px" }}><Courbe data={data} height={200} tip={(x) => [P.keyLabel(x.key), `Trésorerie : ${eur(x.v)}`]} /></div>
        </Card>
      </div>
    </Page>
  );
}

// ══════════════════════════════════════════════════════════════════════
// POINTS D'ATTENTION
// ══════════════════════════════════════════════════════════════════════
export function PointsAttention({ client, moisIdx, moisYear, setMoisIdx, alertes, onSaveDonnees, setView }) {
  const [ajoutes, setAjoutes] = useState([]);
  const nav = <NavMois moisIdx={moisIdx} moisYear={moisYear} setMoisIdx={setMoisIdx} />;
  const actions = lireActions(client);
  const dansLePlan = (a) => ajoutes.includes(a.kpi) || actions.some((x) => x.titre === a.kpi && x.statut !== "fait");
  // Un point d'attention devient une action suivie dans le plan d'actions.
  const ajouter = async (a) => {
    const ok = await sauverActions(onSaveDonnees, [...actions, nouvelleAction({ titre: a.kpi, detail: a.action || a.msg })]);
    if (ok) setAjoutes((x) => [...x, a.kpi]);
  };
  const rouges = alertes.filter((a) => a.level === "red" && !a.isFiscal), oranges = alertes.filter((a) => a.level === "orange" && !a.isFiscal);
  const echeances = alertes.filter((a) => a.isFiscal);
  const bloc = (titre, list, statut) => list.length > 0 && (
    <div>
      <Titre>{titre} · {list.length}</Titre>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((a, i) => (
          <Card key={i} style={{ padding: "16px 20px", borderColor: STATUT[statut].color }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <PastilleStatut statut={statut} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: C.text }}>{a.kpi}</div>
                  {a.current && <span style={{ fontSize: 12.5, fontWeight: 900, color: STATUT[statut].color }}>{a.current}{a.threshold ? <span style={{ color: C.textLight, fontWeight: 700 }}> · repère : {a.threshold}</span> : null}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginTop: 4 }}>{a.msg}</div>
                {a.action && <div style={{ fontSize: 13, color: C.text, fontWeight: 700, lineHeight: 1.55, marginTop: 6, background: C.bgLight, borderRadius: 10, padding: "8px 12px" }}>Piste : {a.action}</div>}
                {onSaveDonnees && (
                  <div style={{ marginTop: 8 }}>
                    {dansLePlan(a)
                      ? <button onClick={() => setView && setView("actions")} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: C.green, cursor: "pointer", fontFamily: "inherit" }}>✓ Dans le plan d'actions →</button>
                      : <Btn small variant="ghost" onClick={() => ajouter(a)}>+ Ajouter au plan d'actions</Btn>}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
  return (
    <Page>
      <EnTete title="Points d'attention" sub={`Ce que ${client.advisorLabel || "votre conseiller"} surveille pour vous en ${P.keyLabel(P.monthKey(moisIdx, moisYear))}, avec une piste pour chacun.`} nav={nav} />
      {!rouges.length && !oranges.length && (
        <Card style={{ padding: "20px 22px", display: "flex", gap: 12, alignItems: "center" }}>
          <PastilleStatut statut="ok" size={28} />
          <div><div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Rien d'anormal ce mois-ci</div><div style={{ fontSize: 13, color: C.textMid }}>Les indicateurs suivis (rentabilité, marge, charges, trésorerie, encaissements) sont dans les seuils.</div></div>
        </Card>
      )}
      {bloc("À traiter", rouges, "bad")}
      {bloc("À surveiller", oranges, "warn")}
      {echeances.length > 0 && (
        <div>
          <Titre>Échéances des 15 prochains jours</Titre>
          <Card>
            {echeances.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 20px", borderTop: i ? `1px solid ${C.borderLight}` : "none", flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 900, color: C.text }}>{e.kpi}</div><div style={{ fontSize: 12.5, color: C.textMid }}>{e.action}</div></div>
                <span style={{ fontSize: 12.5, fontWeight: 900, color: e.level === "red" ? C.red : C.orange }}>{e.threshold} · {e.current}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </Page>
  );
}
