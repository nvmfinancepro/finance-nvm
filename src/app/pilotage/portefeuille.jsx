"use client";
// Suivi mensuel du portefeuille (admin / cabinet) : pour chaque client, d'un coup
// d'œil, ce qui reste à faire ce mois-ci (import, note) et les situations à risque.
import { useState } from "react";
import { C, Card, Btn } from "@/app/charte";
import { keyLabel, fecIndex, shiftKey } from "@/lib/pilotage";
import { lireActions, enRetard } from "@/lib/actions";
import { latestDataKey } from "@/app/pilotage/synthese";
import { eur, PastilleStatut } from "@/app/pilotage/graphiques";

const td = { padding: "9px 10px", fontSize: 12.5, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const Th = ({ children, right }) => <th style={{ padding: "8px 10px", textAlign: right ? "right" : "left", fontSize: 10.5, color: C.textMid, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", background: C.bgLight, whiteSpace: "nowrap" }}>{children}</th>;

export default function SuiviPortefeuille({ clients, onOpen, kpisOf, tresoOf, alertesOf }) {
  const [ouvert, setOuvert] = useState(true);
  const d = new Date();
  const moisAttendu = shiftKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, -1);
  const lignes = clients.map((c) => {
    const last = latestDataKey(c);
    if (!last) return { c, last, aJour: false, accompagne: c.plan !== "dashboard", rang: 500 };
    const [y, m] = last.split("-").map(Number);
    const k = kpisOf(c, m - 1, y);
    const configuree = fecIndex(c).has || !!c.tresorerie?.dateSolde;
    const treso = configuree ? tresoOf(c, m - 1, y) : null;
    const alertes = alertesOf(c, m - 1, y).filter((a) => !a.isFiscal);
    const rouges = alertes.filter((a) => a.level === "red").length, oranges = alertes.filter((a) => a.level === "orange").length;
    const retard = lireActions(c).filter((a) => enRetard(a)).length;
    const note = (c.imports || []).some((i) => i.type === "note" && i.mois === last);
    const aJour = last >= moisAttendu;
    const accompagne = c.plan !== "dashboard";
    // Ordre de priorité : import manquant, note à rédiger, alertes rouges, actions en retard
    const rang = (aJour ? 0 : 1000) + (accompagne && !note ? 100 : 0) + rouges * 10 + retard * 5 + oranges;
    return { c, last, k, treso, rouges, oranges, retard, note, aJour, accompagne, fec: fecIndex(c).months.has(last), rang };
  }).sort((a, b) => b.rang - a.rang || a.c.name.localeCompare(b.c.name));
  const aImporter = lignes.filter((l) => !l.aJour).length;
  const notes = lignes.filter((l) => l.last && l.accompagne && !l.note).length;
  return (
    <Card>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Suivi mensuel du portefeuille</div>
          <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 600, marginTop: 2 }}>
            Mois attendu : {keyLabel(moisAttendu)} · {aImporter ? `${aImporter} import${aImporter > 1 ? "s" : ""} à faire` : "tous les imports sont faits"} · {notes ? `${notes} note${notes > 1 ? "s" : ""} du mois à rédiger` : "toutes les notes sont publiées"}
          </div>
        </div>
        <Btn small variant="ghost" onClick={() => setOuvert(!ouvert)}>{ouvert ? "Replier" : "Afficher"}</Btn>
      </div>
      {ouvert && (
        <div style={{ overflowX: "auto", borderTop: `1px solid ${C.borderLight}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead><tr><Th>Client</Th><Th>Données</Th><Th>Note du mois</Th><Th right>CA du mois</Th><Th right>EBE</Th><Th right>Trésorerie</Th><Th right>Alertes</Th><Th right>Actions en retard</Th><Th>&nbsp;</Th></tr></thead>
            <tbody>
              {lignes.map(({ c, last, k, treso, rouges, oranges, retard, note, aJour, accompagne, fec }) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={{ ...td, fontWeight: 900, color: C.text }}>{c.name}{!accompagne && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 900, color: C.green, background: C.greenBg, borderRadius: 100, padding: "1px 7px" }}>GRATUIT</span>}</td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <PastilleStatut statut={!last ? "na" : aJour ? "ok" : "warn"} size={18} />
                      <span style={{ fontWeight: 800, color: !last ? C.textLight : aJour ? C.text : C.orange }}>{last ? keyLabel(last, false) : "Aucune"}</span>
                      {last && <span style={{ color: C.textLight, fontWeight: 600 }}>{fec ? "FEC" : "imports"}</span>}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 800, color: !accompagne || !last ? C.textLight : note ? C.green : C.orange }}>{!accompagne || !last ? "—" : note ? "Publiée" : "À rédiger"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{k ? eur(k.ca) : "—"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 800, color: k && k.ebe < 0 ? C.red : C.text }}>{k ? eur(k.ebe) : "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: treso != null && treso < 0 ? C.red : C.textMid }}>{treso != null ? eur(treso) : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{rouges ? <span style={{ color: C.red, fontWeight: 900 }}>{rouges} ✕</span> : null}{rouges && oranges ? " " : ""}{oranges ? <span style={{ color: C.orange, fontWeight: 900 }}>{oranges} !</span> : null}{!rouges && !oranges ? <span style={{ color: C.textLight }}>—</span> : null}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 900, color: retard ? C.orange : C.textLight }}>{retard || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}><Btn small variant="ghost" onClick={() => onOpen(c)}>Ouvrir</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
