"use client";
// Écran « Appeler » : la file « prochain à appeler », un contact à la fois.
import { useEffect, useState } from "react";
import { fileDAppels, formaterQuand } from "@/lib/setter-appels";
import Fiche from "./Fiche";
import { C, bouton, carte } from "./ui";

export default function VueAppels({ prospects, appelsDe, rdvsDe, maintenant, prenomSetter, onNoter, onTrancher, onModifier, onReverifier, allerA }) {
  // « Passer » : le contact repart en fin de file, pour cette session seulement.
  const [passes, setPasses] = useState([]);
  const file = fileDAppels(prospects, maintenant);
  const ordre = [
    ...file.filter(p => !passes.includes(p.id)),
    ...passes.map(id => file.find(p => p.id === id)).filter(Boolean),
  ];
  const courant = ordre[0];

  // Contact suivant : on remonte en haut de sa fiche.
  const idCourant = courant?.id;
  useEffect(() => { window.scrollTo(0, 0); }, [idCourant]);

  if (!courant) {
    const prochain = prospects
      .filter(p => p.verification === "qualifie" && p.prochain_appel && new Date(p.prochain_appel) > maintenant)
      .sort((a, b) => new Date(a.prochain_appel) - new Date(b.prochain_appel))[0];
    const aVerifier = prospects.filter(p => p.verification === "a_verifier").length;
    return (
      <section style={{ ...carte, textAlign: "center", padding: "36px 20px", display: "grid", gap: 12, justifyItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Personne à appeler pour l&apos;instant</div>
        <div style={{ fontSize: 14, color: C.mid, fontWeight: 600, maxWidth: 440 }}>
          {prochain ? <>Prochain appel prévu : <b>{prochain.nom}</b>, {formaterQuand(prochain.prochain_appel)}.</> : "Aucun rappel prévu."}
          {aVerifier > 0 && <> {aVerifier} prospect{aVerifier > 1 ? "s" : ""} « à vérifier » attend{aVerifier > 1 ? "ent" : ""} votre tri.</>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {aVerifier > 0 && <button onClick={() => allerA("prospects", "a_verifier")} style={bouton(C.amber)}>Trier les « à vérifier »</button>}
          <button onClick={() => allerA("agenda")} style={bouton("#fff", C.primary, C.border)}>Voir l&apos;agenda</button>
          {onNoter && <button onClick={() => allerA("trouver")} style={bouton(C.primary)}>Trouver des prospects</button>}
        </div>
      </section>
    );
  }

  const nb = {
    rappels: file.filter(p => p.statut === "rappel").length,
    nouveaux: file.filter(p => p.statut === "a_appeler").length,
    relances: file.filter(p => p.statut === "pas_de_reponse").length,
  };
  const detail = [
    nb.rappels && `${nb.rappels} rappel${nb.rappels > 1 ? "s" : ""}`,
    nb.nouveaux && `${nb.nouveaux} nouveau${nb.nouveaux > 1 ? "x" : ""}`,
    nb.relances && `${nb.relances} relance${nb.relances > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");
  const enTete = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.mid }}>
        <span style={{ color: C.text, fontSize: 16, fontWeight: 900 }}>{file.length} à appeler maintenant</span> · {detail}
      </div>
      {courant.statut === "rappel" && <div style={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>Rappel prévu {formaterQuand(courant.prochain_appel)}</div>}
    </div>
  );
  return (
    <Fiche
      key={courant.id}
      p={courant}
      appels={appelsDe(courant.id)}
      rdvs={rdvsDe(courant.id)}
      prenomSetter={prenomSetter}
      onNoter={onNoter}
      onTrancher={onTrancher}
      onModifier={onModifier}
      onReverifier={onReverifier}
      onPasser={ordre.length > 1 ? () => setPasses(ps => [...ps.filter(id => id !== courant.id), courant.id]) : null}
      enTete={enTete}
    />
  );
}
