"use client";
// Écran « Importer » : guide Instant Data Scraper, dépôt du fichier, progression et rapport d'import.
import { useRef, useState } from "react";
import { importerFichier } from "./import";
import { C, POLICE, VERIFICATIONS, bouton, carte, lien, titre } from "./ui";

const ETAPES_GUIDE = [
  <>Installez l&apos;extension Chrome <a href="https://chromewebstore.google.com/detail/instant-data-scraper/ofaokhiedipichpaobibbnahnkdoiiah" target="_blank" rel="noopener noreferrer" style={lien}>Instant Data Scraper</a> (une seule fois).</>,
  <>Cherchez sur <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" style={lien}>Google Maps</a> un métier et une ville, par exemple <b>« nettoyage Bourg-en-Bresse »</b>.</>,
  <>Faites défiler la liste des résultats jusqu&apos;en bas, jusqu&apos;au message de fin de liste.</>,
  <>Cliquez sur l&apos;icône de l&apos;extension : elle repère le tableau des résultats.</>,
  <>Cliquez sur <b>XLSX</b> pour télécharger le fichier.</>,
  <>Glissez le fichier ici. L&apos;outil écarte les doublons, retrouve chaque entreprise dans la base officielle et garde celles qui sont dans la cible.</>,
];

const TEXTE_ETAPE = {
  lecture: "Lecture du fichier…",
  doublons: "Recherche des prospects déjà dans l'outil…",
  recherche: "Recherche des entreprises dans la base officielle",
};

export default function VueImport({ jeton, onTermine, ouvrirListe, recherche, setRecherche }) {
  const [progres, setProgres] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [erreur, setErreur] = useState("");
  const [survol, setSurvol] = useState(false);
  const input = useRef(null);

  const lancer = async fichier => {
    if (!fichier || progres) return;
    setErreur(""); setRapport(null); setProgres({ etape: "lecture" });
    try {
      setRapport(await importerFichier(fichier, jeton, setProgres, recherche));
      onTermine();
    } catch (e) {
      setErreur(e.message || "L'import n'a pas abouti.");
    }
    setProgres(null);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", alignItems: "start" }}>
        <section style={carte}>
          <h2 style={titre}>Récupérer vos prospects sur Google Maps</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {ETAPES_GUIDE.map((texte, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.5, color: C.mid, fontWeight: 600 }}>
                <span style={{ flex: "0 0 24px", height: 24, borderRadius: "50%", background: C.primary, color: "#fff", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</span>
                <span>{texte}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          onDragOver={e => { e.preventDefault(); setSurvol(true); }}
          onDragLeave={() => setSurvol(false)}
          onDrop={e => { e.preventDefault(); setSurvol(false); lancer(e.dataTransfer.files?.[0]); }}
          style={{ ...carte, minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12,
            border: `2px dashed ${survol ? C.green : C.light}`, background: survol ? C.bg : "#fff", transition: "background .15s, border-color .15s" }}>
          {progres ? (
            <Progression progres={progres} />
          ) : (
            <>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              <div style={{ width: "100%", maxWidth: 340, textAlign: "left" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.mid, marginBottom: 6 }}>Recherche faite sur Google Maps</label>
                <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Facultatif : déduite du fichier si vide"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.light}`, fontSize: 14.5, fontFamily: POLICE, boxSizing: "border-box", color: C.text }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Glissez votre fichier ici</div>
              <div style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>Export .xlsx ou .csv d&apos;Instant Data Scraper</div>
              <button onClick={() => input.current?.click()} style={bouton(C.primary)}>Choisir un fichier</button>
              <input ref={input} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden
                onChange={e => { lancer(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}
          {erreur && <div style={{ color: C.red, fontSize: 13.5, fontWeight: 700, maxWidth: 360 }}>{erreur}</div>}
        </section>
      </div>

      {rapport && <Rapport rapport={rapport} ouvrirListe={ouvrirListe} />}
    </div>
  );
}

function Progression({ progres }) {
  const avecBarre = progres.etape === "recherche" && progres.total > 0;
  const pct = avecBarre ? Math.round((progres.fait / progres.total) * 100) : null;
  return (
    <div style={{ width: "100%", maxWidth: 380 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
        {TEXTE_ETAPE[progres.etape]}{avecBarre ? ` : ${progres.fait} / ${progres.total}` : ""}
      </div>
      <div style={{ height: 10, borderRadius: 100, background: C.bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: avecBarre ? `${pct}%` : "35%", background: C.green, borderRadius: 100, transition: "width .3s",
          animation: avecBarre ? "none" : "setter-attente 1.2s ease-in-out infinite alternate" }} />
      </div>
      {avecBarre && <div style={{ fontSize: 12.5, color: C.mid, marginTop: 10, fontWeight: 600 }}>Environ {Math.max(1, Math.ceil((progres.total - progres.fait) / 1.5))} s restantes. Les prospects sont enregistrés au fur et à mesure.</div>}
      <style>{"@keyframes setter-attente{from{margin-left:0}to{margin-left:65%}}"}</style>
    </div>
  );
}

// Regroupe les raisons de rejet (« CA 2025 : 18,8 M€ (au-dessus de 3 M€) » → « CA au-dessus de 3 M€ »).
const motifDe = raison => {
  if (/^CA .*au-dessus/.test(raison)) return "CA au-dessus de 3 M€";
  if (/^CA .*sous/.test(raison)) return "CA sous 20 k€";
  if (/^Créée il y a moins/.test(raison)) return "Créée il y a moins de 3 ans";
  return raison;
};

function Rapport({ rapport, ouvrirListe }) {
  const groupes = {};
  for (const r of rapport.rejetes) (groupes[motifDe(r.raison)] ||= []).push(r);
  const tuiles = [
    { ...VERIFICATIONS.qualifie, label: "Qualifiés", n: rapport.qualifies, action: () => ouvrirListe("qualifie") },
    { ...VERIFICATIONS.a_verifier, label: "À vérifier", n: rapport.aVerifier, action: () => ouvrirListe("a_verifier") },
    { ...VERIFICATIONS.rejete, label: "Rejetés", n: rapport.rejetes.length },
  ];
  return (
    <section style={carte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>Import terminé</h2>
        <span style={{ fontSize: 12.5, color: C.mid, fontWeight: 700 }}>{rapport.recherche ? `${rapport.recherche} · ` : ""}{rapport.fichier}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {tuiles.map(t => (
          <button key={t.label} onClick={t.action} disabled={!t.action || !t.n}
            style={{ background: t.fond, border: "none", borderRadius: 14, padding: "14px 8px", textAlign: "center", fontFamily: POLICE, cursor: t.action && t.n ? "pointer" : "default" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: t.couleur, lineHeight: 1 }}>{t.n}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: t.couleur, marginTop: 6 }}>{t.label}</div>
          </button>
        ))}
      </div>
      {rapport.nonVerifies > 0 && (
        <div role="alert" style={{ marginTop: 14, fontSize: 13.5, color: C.red, fontWeight: 700 }}>
          La base officielle n&apos;a pas répondu pour {rapport.nonVerifies} ligne{rapport.nonVerifies > 1 ? "s" : ""} : elle{rapport.nonVerifies > 1 ? "s sont" : " est"} classée{rapport.nonVerifies > 1 ? "s" : ""} « à vérifier ».
        </div>
      )}
      {rapport.aVerifier > 0 && (
        <div style={{ marginTop: 14, fontSize: 13.5, color: C.mid, fontWeight: 600 }}>
          Les « à vérifier » n&apos;ont pas été retrouvés avec certitude dans la base officielle (l&apos;enseigne Google diffère souvent de la raison sociale).{" "}
          <button onClick={() => ouvrirListe("a_verifier")} style={{ ...lien, background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13.5, cursor: "pointer" }}>Les trier maintenant →</button>
        </div>
      )}
      {rapport.rejetes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: C.text, marginBottom: 8 }}>Raisons des rejets</div>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(groupes).sort((a, b) => b[1].length - a[1].length).map(([motif, liste]) => (
              <details key={motif} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
                <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 800, color: C.text }}>
                  {motif} <span style={{ color: C.red }}>({liste.length})</span>
                </summary>
                <ul style={{ margin: "8px 0 4px", paddingLeft: 18, display: "grid", gap: 4 }}>
                  {liste.map((r, i) => (
                    <li key={i} style={{ fontSize: 13.5, color: C.mid, fontWeight: 600 }}>
                      {r.nom}{r.raison !== motif ? <span style={{ color: C.mid, fontWeight: 500 }}> — {r.raison}</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
