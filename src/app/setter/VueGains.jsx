"use client";
// Écran « Mes gains » du setter : le total du mois en cours, ses clients signés (actifs ou
// partis), et l'historique mois par mois. Les RDV sont marqués signés ou perdus par l'admin.
import { FORMULES, clientsActifs, detailLigne, euros, historique, libelleMois, moisCourant } from "@/lib/setter-commissions";
import { C, carte, titre } from "./ui";

export default function VueGains({ rdvs, prospects }) {
  const nom = id => prospects.find(p => p.id === id)?.nom || "Client";
  const mois = moisCourant();
  const histo = historique(rdvs);
  const ceMois = histo.find(h => h.mois === mois)?.total || 0;
  const actifs = clientsActifs(rdvs);
  const signes = rdvs.filter(r => r.issue === "signe").sort((a, b) => (a.signe_le < b.signe_le ? 1 : -1));
  const enAttente = rdvs.filter(r => r.issue === "en_attente").length;
  const tuile = (valeur, label, couleur = C.primary) => (
    <div style={{ ...carte, textAlign: "center", padding: "16px 10px" }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: couleur, lineHeight: 1.1 }}>{valeur}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.mid, marginTop: 6 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {tuile(euros(ceMois), `Gagnés en ${libelleMois(mois).toLowerCase()}`, "#047857")}
        {tuile(actifs.length, `Client${actifs.length > 1 ? "s" : ""} actif${actifs.length > 1 ? "s" : ""} (98 €/mois chacun)`)}
        {tuile(enAttente, `RDV en attente de résultat`, C.amber)}
      </div>

      <section style={{ ...carte, display: "grid", gap: 8 }}>
        <h2 style={{ ...titre, margin: 0 }}>Vos clients signés</h2>
        {!signes.length ? (
          <div style={{ fontSize: 14, color: C.mid, fontWeight: 600 }}>Pas encore de client signé. Dès qu&apos;un de vos RDV signe, il apparaît ici avec sa commission.</div>
        ) : signes.map(r => {
          const f = FORMULES[r.formule];
          const parti = r.parti_le && r.parti_le < new Date().toISOString().slice(0, 10);
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${C.bg}`, paddingTop: 8, fontSize: 14, fontWeight: 600, color: C.mid }}>
              <span><b style={{ color: C.text }}>{nom(r.prospect_id)}</b> · {f?.court} · signé le {new Date(r.signe_le).toLocaleDateString("fr-FR")}{parti ? ` · parti le ${new Date(r.parti_le).toLocaleDateString("fr-FR")}` : ""}</span>
              <span style={{ color: C.text, fontWeight: 800 }}>{f?.parMois ? (parti ? "terminé" : `${f.parMois} €/mois`) : f?.unique ? `${f.unique} € (une fois)` : "0 €"}</span>
            </div>
          );
        })}
      </section>

      <section style={{ ...carte, display: "grid", gap: 8 }}>
        <h2 style={{ ...titre, margin: 0 }}>Historique</h2>
        {!histo.length ? (
          <div style={{ fontSize: 14, color: C.mid, fontWeight: 600 }}>Aucune commission pour l&apos;instant.</div>
        ) : histo.map(h => (
          <details key={h.mois} style={{ borderTop: `1px solid ${C.bg}`, paddingTop: 8 }}>
            <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 14.5, fontWeight: 800, color: C.text }}>
              <span>{libelleMois(h.mois)}</span><span style={{ color: "#047857" }}>{euros(h.total)}</span>
            </summary>
            {h.lignes.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: C.mid, padding: "4px 0 0 12px" }}>
                <span>{nom(l.rdv.prospect_id)} · {FORMULES[l.rdv.formule]?.court} · {detailLigne(l)}</span><span>{euros(l.montant)}</span>
              </div>
            ))}
          </details>
        ))}
      </section>
      <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>
        Commission de 20 % : pilotage mensuel 98 € chaque mois où le client est actif (du mois de signature au mois de son départ), audit 600 € une fois le mois de signature, tableau de bord gratuit 0 €.
      </div>
    </div>
  );
}
