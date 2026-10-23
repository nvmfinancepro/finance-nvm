"use client";
// Écran « Agenda » : rappels datés, relances automatiques et RDV à venir, jour par jour.
import { useState } from "react";
import { agenda, formaterJour, mailEnvoyeLe, nomDirigeant } from "@/lib/setter-appels";
import { PastilleMail } from "./Fiche";
import { C, POLICE, Pastille, bouton, carte, titre } from "./ui";

// Notification du navigateur à l'heure de chaque rappel (tant que l'outil est ouvert).
function AlertesRappels() {
  const [etat, setEtat] = useState(() => (typeof Notification === "undefined" ? "indisponible" : Notification.permission));
  if (etat === "indisponible" || etat === "denied") return null;
  if (etat === "granted") {
    return <div style={{ fontSize: 13, fontWeight: 700, color: C.mid }}>Alertes activées : vous êtes prévenu à l&apos;heure de chaque rappel, tant que l&apos;outil est ouvert.</div>;
  }
  return (
    <button onClick={async () => setEtat(await Notification.requestPermission())} style={{ ...bouton("#fff", C.primary, C.border), justifySelf: "start" }}>
      Me prévenir à l&apos;heure des rappels
    </button>
  );
}

const TYPES = {
  rappel: { label: "Rappel", couleur: "#1d4ed8", fond: "#eff6ff" },
  pas_de_reponse: { label: "Relance", couleur: C.amber, fond: C.amberBg },
  rdv: { label: "RDV visio", couleur: "#047857", fond: "#d1fae5" },
};

export default function VueAgenda({ prospects, rdvs, appelsDe, maintenant, ouvrirFiche }) {
  const groupes = agenda(prospects, rdvs, maintenant);
  if (!groupes.length) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <AlertesRappels />
        <section style={{ ...carte, textAlign: "center", padding: 32, color: C.mid, fontWeight: 600 }}>
          Rien de prévu. Les rappels, relances et RDV que vous programmez apparaîtront ici.
        </section>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <AlertesRappels />
      {groupes.map(g => (
        <section key={g.cle} style={carte}>
          <h2 style={{ ...titre, color: g.jour ? C.text : C.red }}>{g.jour ? formaterJour(g.jour) : "En retard (déjà dans la file d'appels)"}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {g.items.map((it, i) => {
              const t = TYPES[it.type];
              const p = it.prospect;
              const dernier = it.type === "rappel" ? appelsDe(p.id).find(a => a.resultat === "rappel") : null;
              const detail = it.type === "rdv"
                ? [it.rdv.email_dirigeant, it.rdv.enjeux].filter(Boolean).join(" · ")
                : it.type === "pas_de_reponse" ? `appel ${p.nb_sans_reponse + 1}/3` : dernier?.note;
              return (
                <button key={i} onClick={() => ouvrirFiche(p.id)}
                  style={{ display: "grid", gridTemplateColumns: "54px 1fr", gap: 10, alignItems: "start", textAlign: "left", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontFamily: POLICE }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{it.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Pastille couleur={t.couleur} fond={t.fond}>{t.label}</Pastille>
                      {it.type !== "rdv" && <PastilleMail le={mailEnvoyeLe(appelsDe(p.id))} />}
                      <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{p.nom}</span>
                    </span>
                    <span style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>
                      {nomDirigeant(p) || "Dirigeant non trouvé"}{detail ? ` · ${detail}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
