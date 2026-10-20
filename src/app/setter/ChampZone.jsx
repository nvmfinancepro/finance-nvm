"use client";
// Choix d'une zone : une ville ou un département, avec suggestions de l'API publique des
// communes (geo.api.gouv.fr, sans clé).
import { useRef, useState } from "react";
import { C, POLICE, champ } from "./ui";

const GEO = "https://geo.api.gouv.fr";

async function suggerer(texte) {
  const t = texte.trim();
  if (t.length < 2) return [];
  const code = t.toUpperCase();
  if (/^(\d{2,3}|2A|2B)$/.test(code)) {
    const d = await fetch(`${GEO}/departements/${code}?fields=code,nom`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return d ? [{ type: "departement", code: d.code, nom: d.nom, detail: `Département ${d.code}` }] : [];
  }
  const [communes, departements] = await Promise.all([
    fetch(`${GEO}/communes?nom=${encodeURIComponent(t)}&fields=code,nom,codeDepartement,population&boost=population&limit=5`).then(r => r.json()).catch(() => []),
    fetch(`${GEO}/departements?nom=${encodeURIComponent(t)}&fields=code,nom&limit=2`).then(r => r.json()).catch(() => []),
  ]);
  return [
    ...departements.map(d => ({ type: "departement", code: d.code, nom: d.nom, detail: `Département ${d.code}` })),
    ...communes.map(c => ({ type: "commune", code: c.code, nom: c.nom, detail: `${c.codeDepartement}${c.population ? ` · ${c.population.toLocaleString("fr-FR")} hab.` : ""}` })),
  ];
}

export default function ChampZone({ zone, onChange, placeholder = "Ville ou département" }) {
  const [texte, setTexte] = useState(zone?.nom || "");
  const [liste, setListe] = useState([]);
  const minuteur = useRef(null);
  const saisir = v => {
    setTexte(v);
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => setListe(await suggerer(v)), 250);
  };
  const choisir = z => { onChange(z); setTexte(z.nom); setListe([]); };
  return (
    <div style={{ position: "relative" }}>
      <input value={texte} onChange={e => saisir(e.target.value)} placeholder={placeholder} style={champ}
        onKeyDown={e => { if (e.key === "Enter" && liste[0]) { e.preventDefault(); choisir(liste[0]); } }} />
      {liste.length > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 5, marginTop: 4, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,86,83,.12)", overflow: "hidden" }}>
          {liste.map(z => (
            <button key={`${z.type}-${z.code}`} type="button" onClick={() => choisir(z)}
              style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%", padding: "10px 12px", background: "#fff", border: "none", borderBottom: `1px solid ${C.bg}`, cursor: "pointer", fontFamily: POLICE, textAlign: "left" }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: C.text }}>{z.nom}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.mid }}>{z.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
