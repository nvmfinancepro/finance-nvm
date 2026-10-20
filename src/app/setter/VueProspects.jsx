"use client";
// Écran « Prospects » : recherche par nom ou numéro, filtres par étape du suivi, tri des
// « à vérifier ». Un clic sur un contact ouvre sa fiche (pour noter un appel à tout moment).
import { formaterTelephone, montantCourt } from "@/lib/setter-import";
import { STATUTS_APPEL, correspond, formaterQuand, nomDirigeant } from "@/lib/setter-appels";
import { EFFECTIFS } from "@/lib/setter-secteurs";
import { PastilleStatut, Proposition } from "./Fiche";
import { C, POLICE, Sep, VERIFICATIONS, ancienneteTexte, bouton, carte, champ, normaliser } from "./ui";

export default function VueProspects({ prospects, filtre, setFiltre, recherche, setRecherche, ouvrirFiche, onTrancher, onReverifier, onAjouter }) {
  const qualifies = prospects.filter(p => p.verification === "qualifie");
  const nbStatut = s => qualifies.filter(p => p.statut === s).length;
  const filtres = [
    { id: "tous", label: "Tous les qualifiés", n: qualifies.length },
    ...Object.entries(STATUTS_APPEL).map(([id, s]) => ({ id, label: s.court, n: nbStatut(id) })).filter(f => f.n || f.id === "a_appeler"),
    { ...VERIFICATIONS.a_verifier, id: "a_verifier", label: "À vérifier", n: prospects.filter(p => p.verification === "a_verifier").length },
    { ...VERIFICATIONS.rejete, id: "rejete", label: "Rejetés à l'import", n: prospects.filter(p => p.verification === "rejete").length },
  ];

  const enRecherche = recherche.trim().length > 0;
  const liste = enRecherche
    ? prospects.filter(p => correspond(p, recherche))
    : prospects.filter(p =>
      filtre === "tous" ? p.verification === "qualifie"
        : filtre === "a_verifier" || filtre === "rejete" ? p.verification === filtre
          : p.verification === "qualifie" && p.statut === filtre);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Nom, dirigeant ou numéro…" style={{ ...champ, fontSize: 16, padding: "13px 15px", flex: 1, minWidth: 0 }} />
        {onAjouter && <button onClick={onAjouter} style={{ ...bouton(C.primary), flex: "0 0 auto" }}>+ Ajouter</button>}
      </div>
      {!enRecherche && (
        <div className="setter-filtres">
          <style>{".setter-filtres{display:flex;gap:8px;flex-wrap:wrap}@media (max-width:640px){.setter-filtres{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;margin:0 -16px;padding-left:16px;padding-right:16px}}"}</style>
          {filtres.map(f => {
            const actif = filtre === f.id;
            const couleur = f.couleur || C.primary;
            return (
              <button key={f.id} onClick={() => setFiltre(f.id)} style={{
                ...bouton(actif ? couleur : "#fff", actif ? "#fff" : couleur, actif ? couleur : C.border),
                borderRadius: 100, padding: "7px 13px", fontSize: 13.5,
              }}>{f.label} ({f.n})</button>
            );
          })}
        </div>
      )}
      {enRecherche && <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 700 }}>{liste.length} résultat{liste.length > 1 ? "s" : ""}</div>}
      {!liste.length ? (
        <div style={{ ...carte, textAlign: "center", color: C.mid, fontWeight: 600, padding: 32 }}>
          {prospects.length ? "Aucun prospect ici." : "Aucun prospect pour l'instant : importez votre premier fichier Google Maps."}
        </div>
      ) : liste.map(p => (p.verification === "qualifie"
        ? <LigneProspect key={p.id} p={p} onOuvrir={() => ouvrirFiche(p.id)} />
        : <CarteATrier key={p.id} p={p} onOuvrir={() => ouvrirFiche(p.id)} onTrancher={onTrancher} onReverifier={onReverifier} />))}
    </div>
  );
}

// Un prospect qualifié : une ligne cliquable qui ouvre sa fiche.
function LigneProspect({ p, onOuvrir }) {
  const dirigeant = nomDirigeant(p);
  return (
    <button onClick={onOuvrir} style={{ ...carte, padding: "14px 16px", display: "grid", gap: 6, textAlign: "left", cursor: "pointer", fontFamily: POLICE, width: "100%" }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 900, color: C.text, overflowWrap: "anywhere" }}>{p.nom}</span>
          <span style={{ display: "block", fontSize: 13, color: C.mid, fontWeight: 600 }}>{[p.categorie, dirigeant].filter(Boolean).join(" · ")}</span>
        </span>
        <PastilleStatut p={p} />
      </span>
      <span style={{ fontSize: 13.5, color: C.mid, fontWeight: 600 }}>
        <b style={{ color: C.text }}>{formaterTelephone(p.telephone)}</b>
        {p.dernier_appel && <><Sep />dernier appel {formaterQuand(p.dernier_appel)}</>}
      </span>
    </button>
  );
}

// Un prospect « à vérifier » (à trier) ou rejeté à l'import.
function CarteATrier({ p, onOuvrir, onTrancher, onReverifier }) {
  const v = VERIFICATIONS[p.verification];
  const infos = [
    nomDirigeant(p) && `Dirigeant : ${nomDirigeant(p)}`,
    p.date_creation && ancienneteTexte(p.date_creation),
    p.ca != null && `CA ${p.ca_annee} : ${montantCourt(p.ca)}`,
    EFFECTIFS[p.effectif],
  ].filter(Boolean);
  return (
    <article style={{ ...carte, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <button onClick={onOuvrir} style={{ minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: POLICE }}>
          <span style={{ display: "block", fontSize: 16.5, fontWeight: 900, color: C.text, overflowWrap: "anywhere" }}>{p.nom}</span>
          {p.categorie && <span style={{ display: "block", fontSize: 13, color: C.mid, fontWeight: 600, marginTop: 2 }}>{p.categorie}</span>}
        </button>
        <span style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 900, color: v.couleur, background: v.fond, padding: "4px 10px", borderRadius: 100 }}>{v.label}</span>
      </div>
      {(infos.length > 0 || p.raison_sociale) && (
        <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 600, lineHeight: 1.6 }}>
          {infos.map((x, i) => <span key={i}>{i > 0 && <Sep />}{x}</span>)}
          {p.raison_sociale && normaliser(p.raison_sociale) !== normaliser(p.nom) && <div style={{ fontSize: 12.5 }}>Raison sociale : {p.raison_sociale}</div>}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{formaterTelephone(p.telephone)}</div>
      {p.verification === "rejete" && p.raison_rejet && <div style={{ fontSize: 13.5, fontWeight: 700, color: C.red }}>{p.raison_rejet}</div>}
      {p.verification === "a_verifier" && (
        <>
          <Proposition p={p} />
          {onTrancher && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => onTrancher(p, "qualifie")} style={bouton(C.green)}>Valider</button>
            <button onClick={() => onTrancher(p, "rejete")} style={bouton("#fff", C.red, "#fecaca")}>Rejeter</button>
            {onReverifier && p.maps_url && <button onClick={() => onReverifier(p)} style={bouton("#fff", C.primary, C.border)}>Revérifier</button>}
          </div>}
        </>
      )}
    </article>
  );
}
