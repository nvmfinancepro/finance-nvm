"use client";
// Écran « Trouver des leads » : sortir des leads du stock commun (1 clic, tous métiers), Google Maps
// (recherches conseillées, import du fichier) ou la base officielle. L'historique des recherches est commun à tous les setters (migration 040) : une
// recherche faite par un collègue est cochée, une recherche est reproposée après 90 jours, et
// l'outil choisit lui-même la prochaine recherche à faire.
import { useEffect, useState } from "react";
import {
  NB_RECHERCHES_PAR_VILLE, REFAIRE_APRES_JOURS, SECTEURS, cleRecherche as cle, lienMaps, secteurDe, villesDeLaZone,
} from "@/lib/setter-secteurs";
import ChampZone from "./ChampZone";
import VueBase from "./VueBase";
import VueImport from "./VueImport";
import VueStock from "./VueStock";
import { C, POLICE, bouton, carte, etiquette, titre } from "./ui";

const CLE_VILLE = "setter-maps-ville"; // la zone choisie : une ville ou un département
const CLE_EN_COURS = "setter-maps-en-cours"; // la ville de la zone où le setter cherche en ce moment
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* navigation privée */ } };
const JOUR = 86400000;

// Chiffres par recherche, à partir des prospects du setter : prospects gardés, qualifiés, RDV posés.
function statsParRecherche(prospects) {
  const stats = new Map();
  for (const p of prospects) {
    if (!p.recherche) continue;
    const k = cle(p.recherche);
    const s = stats.get(k) || { recherche: p.recherche, source: p.source, total: 0, qualifies: 0, rdv: 0, derniere: p.created_at };
    s.total++;
    if (p.verification === "qualifie") s.qualifies++;
    if (p.statut === "rdv") s.rdv++;
    if (p.created_at > s.derniere) s.derniere = p.created_at;
    stats.set(k, s);
  }
  return stats;
}

// Recherches déjà faites : l'historique commun, complété par les propres prospects du setter
// (au cas où l'historique ne répondrait pas).
function recherchesFaites(historique, stats) {
  const faites = new Map((historique || []).map(h => [h.cle, h]));
  for (const [k, s] of stats) {
    if (s.source !== "maps") continue;
    const h = faites.get(k);
    if (!h || s.derniere > h.derniere) faites.set(k, { cle: k, recherche: s.recherche, derniere: s.derniere, qualifies: Math.max(s.qualifies, h?.qualifies || 0), nouveaux: Math.max(s.total, h?.nouveaux || 0), parMoi: true });
  }
  return faites;
}

export default function VueTrouver({ prospects, jeton, onAjoute, onImporte, ouvrirListe, allerAppeler }) {
  const [mode, setMode] = useState("stock");
  const [recherche, setRecherche] = useState("");
  const [historique, setHistorique] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const rep = await fetch("/api/setter/recherches", { headers: { Authorization: `Bearer ${await jeton()}` } });
        const json = rep.ok ? await rep.json() : {};
        if (actif) setHistorique(json.recherches || []);
      } catch {
        if (actif) setHistorique([]);
      }
    })();
    return () => { actif = false; };
  }, [jeton, version]);
  const recharger = () => setVersion(v => v + 1);
  const stats = statsParRecherche(prospects);
  const faites = recherchesFaites(historique, stats);
  const onglet = (id, label) => (
    <button onClick={() => setMode(id)} style={{
      ...bouton(mode === id ? C.primary : "#fff", mode === id ? "#fff" : C.primary, mode === id ? C.primary : C.border),
      flex: 1, padding: "11px 12px", fontSize: 14.5,
    }}>{label}</button>
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onglet("stock", "Sortir des leads · 1 clic")}
        {onglet("maps", "Google Maps · autres métiers")}
        {onglet("base", "Base officielle · numéro à coller")}
      </div>
      {mode === "stock" ? (
        <VueStock prospects={prospects} jeton={jeton} onSortis={onImporte} allerAppeler={allerAppeler} />
      ) : mode === "base" ? (
        <VueBase jeton={jeton} onAjoute={onAjoute} />
      ) : (
        <>
          <RecherchesConseillees faites={faites} charge={historique !== null} jeton={jeton} onChoisir={setRecherche} recharger={recharger} />
          <VueImport jeton={jeton} onTermine={() => { onImporte(); recharger(); }} ouvrirListe={ouvrirListe} recherche={recherche} setRecherche={setRecherche} />
        </>
      )}
      <VosRecherches stats={stats} />
    </div>
  );
}

// Les recherches Google Maps à faire : métiers conseillés × les villes de la zone. L'outil propose
// la prochaine (ville en cours d'abord, métiers qui donnent le plus de qualifiés en premier) ;
// une recherche faite il y a moins de 90 jours, par ce setter ou un collègue, est cochée.
function RecherchesConseillees({ faites, charge, jeton, onChoisir, recharger }) {
  const [zone, setZone] = useState(() => lire(CLE_VILLE, null));
  const [villes, setVilles] = useState([]);
  const [enCours, setEnCours] = useState(() => lire(CLE_EN_COURS, null));
  const [passe, setPasse] = useState(false);
  useEffect(() => {
    let actif = true;
    villesDeLaZone(zone).then(v => { if (actif) setVilles(v); });
    return () => { actif = false; };
  }, [zone]);
  const nomVille = villes.some(v => v.nom === enCours) ? enCours : villes[0]?.nom || (zone?.type === "commune" ? zone.nom : null);
  const choisirVille = nom => { setEnCours(nom); ecrire(CLE_EN_COURS, nom); };

  const maintenant = new Date();
  const etat = r => {
    const h = faites.get(cle(r));
    if (!h) return "a_faire";
    return (maintenant - new Date(h.derniere)) / JOUR >= REFAIRE_APRES_JOURS ? "a_refaire" : "faite";
  };

  // Métiers classés par taux de qualifiés constaté (tous setters confondus).
  const taux = {};
  for (const h of faites.values()) {
    const id = secteurDe(h.recherche);
    if (!id || !h.nouveaux) continue;
    taux[id] ||= { total: 0, qualifies: 0 };
    taux[id].total += h.nouveaux; taux[id].qualifies += h.qualifies;
  }
  const rang = id => (taux[id]?.total ? taux[id].qualifies / taux[id].total : -1);
  const secteurs = [...SECTEURS].sort((a, b) => rang(b.id) - rang(a.id));

  const ordreVilles = nomVille ? [nomVille, ...villes.map(v => v.nom).filter(n => n !== nomVille)] : [];
  const candidates = ordreVilles.flatMap(v => secteurs.flatMap(s => s.maps.map(mot => ({ ville: v, mot, r: `${mot} ${v}` }))));
  const prochaine = candidates.find(c => etat(c.r) === "a_faire") || candidates.find(c => etat(c.r) === "a_refaire");
  const faitesDans = nom => SECTEURS.reduce((n, s) => n + s.maps.filter(mot => etat(`${mot} ${nom}`) === "faite").length, 0);

  // Recherche sans liste de résultats sur Maps (aucun résultat, une seule fiche, ou Google qui
  // comprend autre chose) : notée comme faite, l'outil passe à la suivante.
  const passer = async r => {
    setPasse(true);
    try {
      await fetch("/api/setter/recherches", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ recherche: r, lignes: 0 }),
      });
      recharger();
    } finally {
      setPasse(false);
    }
  };

  return (
    <section style={{ ...carte, display: "grid", gap: 12 }}>
      <h2 style={{ ...titre, margin: 0 }}>Recherches conseillées</h2>
      <div style={{ maxWidth: 360 }}>
        <ChampZone zone={zone} onChange={z => { setZone(z); ecrire(CLE_VILLE, z); choisirVille(null); }} placeholder="Votre ville ou votre département" />
      </div>
      {nomVille && charge && (prochaine ? (
        <div style={{ background: C.bg, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.mid }}>
              Prochaine recherche conseillée{etat(prochaine.r) === "a_refaire" ? ` · déjà faite il y a plus de ${REFAIRE_APRES_JOURS} jours, à refaire` : ""}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, overflowWrap: "anywhere" }}>{prochaine.mot} · {prochaine.ville}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" disabled={passe} onClick={() => passer(prochaine.r)}
              style={{ background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, fontWeight: 700, color: C.mid, cursor: "pointer", textDecoration: "underline" }}>
              Pas de liste sur Maps : passer
            </button>
            <a href={lienMaps(prochaine.r)} target="_blank" rel="noopener noreferrer" onClick={() => { onChoisir(prochaine.r); choisirVille(prochaine.ville); }}
              style={{ ...bouton(C.primary), textDecoration: "none" }}>Ouvrir dans Google Maps ↗</a>
          </div>
        </div>
      ) : (
        <div style={{ background: C.bg, borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 700, color: C.text }}>
          Toutes les recherches de la zone sont faites. Élargissez la zone (tapez votre département) ou passez par la base officielle.
        </div>
      ))}
      {villes.length > 1 && (
        <div>
          <span style={etiquette}>Villes de la zone · recherches faites</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {villes.map(v => {
              const actif = v.nom === nomVille, n = faitesDans(v.nom);
              return (
                <button key={v.code} type="button" onClick={() => choisirVille(v.nom)}
                  style={{ ...bouton(actif ? C.primary : "#fff", actif ? "#fff" : C.primary, actif ? C.primary : C.border), padding: "6px 11px", fontSize: 13, borderRadius: 100 }}>
                  {v.nom} <span style={{ fontWeight: 700, opacity: 0.8 }}>{n === NB_RECHERCHES_PAR_VILLE ? "✓" : `${n}/${NB_RECHERCHES_PAR_VILLE}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {nomVille && (
        <div style={{ display: "grid", gap: 10 }}>
          {secteurs.map(s => (
            <div key={s.id}>
              <div style={{ fontSize: 13, fontWeight: 900, color: C.text, marginBottom: 6 }}>
                {s.label}
                {taux[s.id]?.total ? <span style={{ color: C.mid, fontWeight: 700 }}> · {Math.round((100 * taux[s.id].qualifies) / taux[s.id].total)} % de qualifiés</span> : null}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {s.maps.map(mot => {
                  const r = `${mot} ${nomVille}`, e = etat(r), h = faites.get(cle(r));
                  if (e === "faite") {
                    return (
                      <span key={r} title={`Faite le ${new Date(h.derniere).toLocaleDateString("fr-FR")}${h.parMoi ? "" : " par un autre setter"}`}
                        style={{ fontSize: 13, fontWeight: 700, color: C.mid, background: C.bg, borderRadius: 100, padding: "6px 11px" }}>
                        ✓ {mot} · {h.parMoi ? `${h.qualifies} qualifié${h.qualifies > 1 ? "s" : ""}` : "faite par un collègue"}
                      </span>
                    );
                  }
                  return (
                    <a key={r} href={lienMaps(r)} target="_blank" rel="noopener noreferrer" onClick={() => onChoisir(r)}
                      title={e === "a_refaire" ? `Dernière fois le ${new Date(h.derniere).toLocaleDateString("fr-FR")}` : undefined}
                      style={{ ...bouton("#fff", e === "a_refaire" ? C.amber : C.primary, C.border), padding: "6px 11px", fontSize: 13, borderRadius: 100, textDecoration: "none" }}>
                      {e === "a_refaire" ? `↻ ${mot} · à refaire` : `${mot} ↗`}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>
            Une recherche faite (par vous ou un collègue) est cochée pendant {REFAIRE_APRES_JOURS} jours, puis reproposée : entre-temps, de nouvelles entreprises apparaissent et d&apos;autres passent le cap des 3 ans.
          </div>
        </div>
      )}
    </section>
  );
}

function VosRecherches({ stats }) {
  const lignes = [...stats.values()].sort((a, b) => (a.derniere < b.derniere ? 1 : -1)).slice(0, 30);
  if (!lignes.length) return null;
  const cellule = { padding: "8px 10px", borderBottom: `1px solid ${C.bg}`, fontSize: 13.5, fontWeight: 600, color: C.mid, textAlign: "right", whiteSpace: "nowrap" };
  return (
    <section style={{ ...carte, display: "grid", gap: 10 }}>
      <h2 style={{ ...titre, margin: 0 }}>Vos recherches</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: POLICE }}>
          <thead>
            <tr>{["Recherche", "Prospects", "Qualifiés", "RDV"].map((t, i) => <th key={t} style={{ ...cellule, fontWeight: 900, color: C.text, textAlign: i ? "right" : "left" }}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {lignes.map(s => (
              <tr key={s.recherche}>
                <td style={{ ...cellule, textAlign: "left", color: C.text, whiteSpace: "normal" }}>
                  {s.recherche} <span style={{ fontSize: 11.5, color: C.mid }}>{s.source === "base" ? "base officielle" : s.source === "manuel" ? "à la main" : s.source === "stock" ? "leads prêts à appeler" : "Google Maps"}</span>
                </td>
                <td style={cellule}>{s.total}</td>
                <td style={cellule}>{s.qualifies} <span style={{ fontSize: 11.5 }}>({Math.round((100 * s.qualifies) / s.total)} %)</span></td>
                <td style={{ ...cellule, color: s.rdv ? "#047857" : C.mid, fontWeight: s.rdv ? 900 : 600 }}>{s.rdv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
