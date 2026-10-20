"use client";
// Trouver des prospects dans la base officielle : un métier, une zone, et l'outil liste les
// entreprises déjà dans la cible (société active depuis 3 ans ou plus, CA publié entre 20 k€ et
// 3 M€ ou PME de 1 à 49 salariés), jamais prises par un setter. La base officielle n'a pas les
// numéros : le setter le trouve en 1 clic sur Google, le colle, et le prospect entre dans sa file.
import { useState } from "react";
import { chercherDansLaBase, cleGroupe, creerLimiteur, extraireTelephone, formaterTelephone, montantCourt } from "@/lib/setter-import";
import { EFFECTIFS, EFFECTIFS_CIBLE, SECTEURS, lienMapsEntreprise, lienRechercheNumero } from "@/lib/setter-secteurs";
import ChampZone from "./ChampZone";
import { C, POLICE, ancienneteTexte, bouton, carte, champ, etiquette, ficheOfficielle, lien, titre } from "./ui";

const appeler = creerLimiteur(5);
const CLE_IGNORES = "setter-base-ignores";
const CLE_CHOIX = "setter-base-choix";
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* navigation privée */ } };

export default function VueBase({ jeton, onAjoute }) {
  const [choix, setChoix] = useState(() => lire(CLE_CHOIX, { secteur: "btp", zone: null }));
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(0);
  const [encore, setEncore] = useState(false);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState("");
  const secteur = SECTEURS.find(s => s.id === choix.secteur) || SECTEURS[0];

  const changer = c => { const n = { ...choix, ...c }; setChoix(n); ecrire(CLE_CHOIX, n); };

  // Charge des pages jusqu'à avoir de nouveaux leads (ceux déjà pris ou écartés sont retirés).
  const charger = async (depuis, liste) => {
    if (!choix.zone) return setErreur("Choisissez une ville ou un département.");
    setCharge(true); setErreur("");
    try {
      const ignores = new Set(lire(CLE_IGNORES, []));
      let p = depuis, suite = true, nouveaux = [];
      while (suite && nouveaux.length < 10 && p < depuis + 4) {
        p++;
        const { resultats, encore: reste } = await chercherDansLaBase(secteur, choix.zone, p, appeler, EFFECTIFS_CIBLE);
        suite = reste;
        const deja = new Set(liste.map(l => l.faits.siren).concat(nouveaux.map(l => l.faits.siren)));
        const groupes = new Set(liste.concat(nouveaux).map(cleGroupe));
        const candidats = resultats.filter(r => {
          if (ignores.has(r.faits.siren) || deja.has(r.faits.siren) || groupes.has(cleGroupe(r))) return false;
          groupes.add(cleGroupe(r));
          return true;
        });
        if (!candidats.length) continue;
        const rep = await fetch("/api/setter/doublons", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
          body: JSON.stringify({ sirens: candidats.map(r => r.faits.siren) }),
        });
        if (!rep.ok) throw new Error("Vérification des doublons impossible.");
        const pris = new Set((await rep.json()).sirensExistants || []);
        nouveaux = nouveaux.concat(candidats.filter(r => !pris.has(r.faits.siren)));
      }
      setLeads([...liste, ...nouveaux]);
      setPage(p);
      setEncore(suite);
      if (!liste.length && !nouveaux.length) setErreur(suite ? "Rien de nouveau sur ces pages : cliquez sur « Voir plus »." : "Aucune entreprise dans la cible pour ce métier ici. Essayez une zone plus large (le département).");
    } catch (e) {
      setErreur(e.message || "Base officielle indisponible, réessayez dans une minute.");
    }
    setCharge(false);
  };

  const retirer = siren => setLeads(ls => ls.filter(l => l.faits.siren !== siren));
  // Après un ajout ou un écart, le curseur va directement dans le champ numéro du lead suivant.
  const auSuivant = () => setTimeout(() => document.querySelector("input[data-numero]")?.focus(), 60);
  const ecarter = siren => { ecrire(CLE_IGNORES, [...lire(CLE_IGNORES, []), siren].slice(-5000)); retirer(siren); };
  // Le numéro collé : le lead entre dans la file d'appels. Renvoie null, ou ce qui a empêché l'ajout.
  const envoyer = async (lead, telephone) => {
    const rep = await fetch("/api/setter/import", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify({ prospects: [{
        source: "base", recherche: `${secteur.label} · ${choix.zone?.nom || ""}`, nom: lead.nom, nom_maps: lead.nom, categorie: secteur.label,
        telephone, latitude: lead.latitude, longitude: lead.longitude, certain: true, entreprise: lead.faits,
      }] }),
    });
    const json = await rep.json().catch(() => ({}));
    if (!rep.ok) return json.error || "Ajout impossible.";
    const r = json.resultats[0];
    if (r.statut === "qualifie") return null;
    return r.statut === "doublon" ? "Ce numéro est déjà dans l'outil." : r.raison || "Non ajouté.";
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ ...carte, display: "grid", gap: 14 }}>
        <h2 style={{ ...titre, margin: 0 }}>Trouver des entreprises dans la cible</h2>
        <div>
          <span style={etiquette}>Métier</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SECTEURS.map(s => (
              <button key={s.id} type="button" onClick={() => changer({ secteur: s.id })}
                style={{ ...bouton(choix.secteur === s.id ? C.primary : "#fff", choix.secteur === s.id ? "#fff" : C.primary, choix.secteur === s.id ? C.primary : C.border), padding: "7px 12px", fontSize: 13.5, borderRadius: 100 }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end" }}>
          <div>
            <span style={etiquette}>Zone</span>
            <ChampZone zone={choix.zone} onChange={zone => changer({ zone })} />
          </div>
          <button onClick={() => { setLeads([]); charger(0, []); }} disabled={charge} style={{ ...bouton(C.primary), opacity: charge ? 0.6 : 1 }}>{charge && !leads.length ? "Recherche…" : "Chercher"}</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>
          Seulement des sociétés actives depuis 3 ans ou plus, avec un CA publié entre 20 k€ et 3 M€ ou 1 à 49 salariés, et jamais prises par un setter.
        </div>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 700, background: C.bg, borderRadius: 10, padding: "8px 10px" }}>
          Astuce : faites d&apos;abord la recherche sur Google Maps (onglet voisin), les numéros arrivent tout seuls. Ici, il ne restera que les entreprises absentes de Maps.
        </div>
        {erreur && <div role="alert" style={{ color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
      </section>

      {leads.map(l => (
        <Lead key={l.faits.siren} lead={l} envoyer={telephone => envoyer(l, telephone)}
          onAjoute={() => { retirer(l.faits.siren); onAjoute(); auSuivant(); }} onEcarter={() => { ecarter(l.faits.siren); auSuivant(); }} />
      ))}

      {encore && leads.length > 0 && (
        <button onClick={() => charger(page, leads)} disabled={charge} style={{ ...bouton("#fff", C.primary, C.primary), justifySelf: "center", opacity: charge ? 0.6 : 1 }}>
          {charge ? "Chargement…" : "Voir plus d'entreprises"}
        </button>
      )}
    </div>
  );
}

// Un lead sans numéro : liens pour le trouver, champ pour le coller. envoyer(téléphone) renvoie
// null quand le lead est ajouté, sinon le message à afficher.
export function Lead({ lead, envoyer, onAjoute, onEcarter }) {
  const [numero, setNumero] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null);
  const f = lead.faits;
  const dirigeant = [f.dirigeant_prenom, f.dirigeant_nom].filter(Boolean).join(" ");
  const raison = f.raison_sociale && f.raison_sociale.toLowerCase() !== lead.nom.toLowerCase() ? f.raison_sociale : null;

  const ajouter = async e => {
    e.preventDefault();
    const telephone = extraireTelephone(numero);
    if (!telephone) return setMessage({ erreur: true, texte: "Numéro français invalide." });
    setEnvoi(true); setMessage(null);
    try {
      const refus = await envoyer(telephone);
      if (!refus) { onAjoute(); return; }
      setMessage({ erreur: true, texte: refus });
    } catch (e2) {
      setMessage({ erreur: true, texte: e2.message || "Ajout impossible." });
    }
    setEnvoi(false);
  };

  return (
    <article style={{ ...carte, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 900, color: C.text, overflowWrap: "anywhere" }}>{lead.nom}</div>
          <div style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>{[raison, lead.adresse || lead.commune].filter(Boolean).join(" · ")}</div>
        </div>
        <a href={ficheOfficielle(f.siren)} target="_blank" rel="noopener noreferrer" style={{ ...lien, fontSize: 13 }}>Fiche officielle</a>
      </div>
      <div style={{ fontSize: 14, color: C.mid, fontWeight: 600, lineHeight: 1.6 }}>
        Dirigeant : <b style={{ color: C.text }}>{dirigeant || "non publié"}</b>
        <div style={{ fontSize: 13.5 }}>
          {[f.date_creation && ancienneteTexte(f.date_creation), f.ca != null ? `CA ${f.ca_annee} : ${montantCourt(f.ca)}` : "CA non publié", EFFECTIFS[lead.effectif]].filter(Boolean).join(" · ")}
        </div>
      </div>
      <form onSubmit={ajouter} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <a href={lienMapsEntreprise(lead.nom, lead.adresse || lead.commune)} target="_blank" rel="noopener noreferrer" style={{ ...bouton("#fff", C.primary, C.primary), textDecoration: "none", padding: "10px 12px" }}>Trouver le numéro ↗</a>
        <input data-numero type="tel" value={numero} placeholder="Collez le numéro puis Entrée"
          onChange={e => setNumero(e.target.value)}
          onPaste={e => { const t = extraireTelephone(e.clipboardData.getData("text")); if (t) { e.preventDefault(); setNumero(formaterTelephone(t)); } }}
          style={{ ...champ, padding: "10px 12px", flex: "1 1 150px", width: "auto", minWidth: 0 }} />
        <button type="submit" disabled={envoi || !numero.trim()} style={{ ...bouton(C.green), opacity: envoi || !numero.trim() ? 0.5 : 1 }}>{envoi ? "…" : "Ajouter"}</button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {message ? <span style={{ fontSize: 13, fontWeight: 700, color: message.erreur ? C.red : C.primary }}>{message.texte}</span>
          : <a href={lienRechercheNumero(lead.nom, lead.commune)} target="_blank" rel="noopener noreferrer" style={{ ...lien, fontSize: 13 }}>Pas sur Maps ? Chercher sur Google ↗</a>}
        <button onClick={onEcarter} style={{ background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, fontWeight: 700, color: C.mid, cursor: "pointer", textDecoration: "underline" }}>
          Pas de numéro trouvé : écarter
        </button>
      </div>
    </article>
  );
}
