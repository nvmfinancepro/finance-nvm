"use client";
// Ajouter un prospect à la main (recommandation, contact trouvé hors Google Maps). Même
// contrôle que l'import : anti-doublon sur toute la base et cible vérifiée par le serveur
// quand le setter rattache l'entreprise trouvée dans la base officielle.
import { useState } from "react";
import { API_ENTREPRISES, creerLimiteur, extraireTelephone, faitsEntreprise, lireSite, montantCourt } from "@/lib/setter-import";
import { EFFECTIFS } from "@/lib/setter-secteurs";
import { C, POLICE, ancienneteTexte, bouton, carte, champ, etiquette, titre } from "./ui";

const appeler = creerLimiteur(5);
const VIDE = { nom: "", telephone: "", ville: "", categorie: "", siren: "", dirigeant_prenom: "", dirigeant_nom: "", email_dirigeant: "", site_web: "", note: "" };

export default function AjoutProspect({ jeton, onFermer, onAjoute }) {
  const [f, setF] = useState(VIDE);
  const [resultats, setResultats] = useState(null); // null : pas encore cherché
  const [choisi, setChoisi] = useState(null);       // index du résultat retenu, ou null
  const [cherche, setCherche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fini, setFini] = useState(null);
  const maj = cle => e => setF(x => ({ ...x, [cle]: e.target.value }));

  const chercher = async () => {
    const siren = f.siren.replace(/\D/g, "");
    const q = siren.length === 9 ? siren : `${f.nom} ${f.ville}`.trim();
    if (!q) return setErreur("Indiquez au moins le nom de l'entreprise.");
    setCherche(true); setErreur(""); setChoisi(null);
    try {
      const rep = await appeler(`${API_ENTREPRISES}?q=${encodeURIComponent(q)}&per_page=5`);
      setResultats((rep.results || []).map(e => ({ faits: faitsEntreprise(e), commune: e.siege?.libelle_commune || "" })));
    } catch (e) {
      setErreur(e.message || "Base officielle indisponible, réessayez.");
    }
    setCherche(false);
  };

  const ajouter = async e => {
    e.preventDefault();
    const telephone = extraireTelephone(f.telephone);
    if (!f.nom.trim()) return setErreur("Le nom de l'entreprise est obligatoire.");
    if (!telephone) return setErreur("Numéro de téléphone français invalide.");
    const entreprise = choisi != null ? resultats[choisi].faits : null;
    setEnvoi(true); setErreur("");
    try {
      const rep = await fetch("/api/setter/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ prospects: [{
          manuel: true, nom: f.nom.trim(), nom_maps: f.nom.trim(), categorie: f.categorie, telephone,
          site_web: lireSite(f.site_web), certain: !!entreprise, entreprise,
          dirigeant_prenom: f.dirigeant_prenom, dirigeant_nom: f.dirigeant_nom, email_dirigeant: f.email_dirigeant, note: f.note,
        }] }),
      });
      const json = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(json.error || "Ajout impossible.");
      const r = json.resultats[0];
      setFini(r);
      if (r.statut !== "doublon") onAjoute();
    } catch (e2) {
      setErreur(e2.message || "Ajout impossible.");
    }
    setEnvoi(false);
  };

  if (fini) {
    const messages = {
      qualifie: { couleur: "#047857", texte: `${f.nom} est ajouté dans « À appeler ».` },
      rejete: { couleur: C.red, texte: `${f.nom} est hors cible : ${fini.raison}. Il est rangé dans « Rejetés à l'import ».` },
      doublon: { couleur: C.amber, texte: `${f.nom} est déjà dans l'outil : il n'a pas été ajouté.` },
    };
    const m = messages[fini.statut] || messages.qualifie;
    return (
      <section style={{ ...carte, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: m.couleur }}>{m.texte}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setF(VIDE); setResultats(null); setChoisi(null); setFini(null); }} style={bouton(C.primary)}>Ajouter un autre prospect</button>
          <button onClick={onFermer} style={bouton("#fff", C.mid, C.border)}>Fermer</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={ajouter} style={{ ...carte, display: "grid", gap: 14 }}>
      <h2 style={{ ...titre, margin: 0 }}>Ajouter un prospect à la main</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        <div><label style={etiquette}>Entreprise *</label><input required value={f.nom} onChange={maj("nom")} style={champ} /></div>
        <div><label style={etiquette}>Téléphone *</label><input required type="tel" value={f.telephone} onChange={maj("telephone")} placeholder="04 74 00 00 00" style={champ} /></div>
        <div><label style={etiquette}>Ville</label><input value={f.ville} onChange={maj("ville")} style={champ} /></div>
        <div><label style={etiquette}>Activité</label><input value={f.categorie} onChange={maj("categorie")} placeholder="Ex. : Plombier" style={champ} /></div>
        <div><label style={etiquette}>Prénom du dirigeant</label><input value={f.dirigeant_prenom} onChange={maj("dirigeant_prenom")} style={champ} /></div>
        <div><label style={etiquette}>Nom du dirigeant</label><input value={f.dirigeant_nom} onChange={maj("dirigeant_nom")} style={champ} /></div>
        <div><label style={etiquette}>E-mail du dirigeant</label><input type="email" value={f.email_dirigeant} onChange={maj("email_dirigeant")} style={champ} /></div>
        <div><label style={etiquette}>Site web</label><input value={f.site_web} onChange={maj("site_web")} placeholder="https://…" style={champ} /></div>
        <div><label style={etiquette}>SIREN (si vous l&apos;avez)</label><input value={f.siren} onChange={maj("siren")} inputMode="numeric" style={champ} /></div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={etiquette}>Note</label>
          <textarea value={f.note} onChange={maj("note")} rows={2} placeholder="Ex. : recommandé par …" style={{ ...champ, resize: "vertical" }} />
        </div>
      </div>

      <div style={{ background: C.bg, borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Vérifier la cible dans la base officielle</span>
          <button type="button" onClick={chercher} disabled={cherche} style={bouton("#fff", C.primary, C.primary)}>{cherche ? "Recherche…" : "Chercher l'entreprise"}</button>
        </div>
        {resultats && !resultats.length && <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 600 }}>Aucune entreprise trouvée. Vous pouvez l&apos;ajouter quand même.</div>}
        {resultats?.map((r, i) => {
          const x = r.faits;
          const details = [
            r.commune,
            String(x.nature_juridique || "").startsWith("1") && "entrepreneur individuel",
            x.etat_administratif === "C" && "fermée",
            x.date_creation && ancienneteTexte(x.date_creation),
            x.ca != null && `CA ${x.ca_annee} : ${montantCourt(x.ca)}`,
            EFFECTIFS[x.effectif],
            [x.dirigeant_prenom, x.dirigeant_nom].filter(Boolean).join(" "),
          ].filter(Boolean).join(" · ");
          const actif = choisi === i;
          return (
            <button key={x.siren} type="button" onClick={() => setChoisi(actif ? null : i)}
              style={{ textAlign: "left", background: actif ? "#fff" : "transparent", border: `1.5px solid ${actif ? C.primary : C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontFamily: POLICE }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 900, color: C.text }}>{actif ? "✓ " : ""}{x.raison_sociale}</span>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.mid }}>{details}</span>
            </button>
          );
        })}
        {resultats?.length > 0 && (
          <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>
            {choisi == null ? "Cliquez sur la bonne entreprise pour vérifier la cible (ancienneté, CA, forme juridique). Sinon, le prospect est ajouté tel quel." : "La cible sera vérifiée avec cette entreprise."}
          </div>
        )}
      </div>

      {erreur && <div role="alert" style={{ color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" disabled={envoi} style={{ ...bouton(C.primary), opacity: envoi ? 0.6 : 1 }}>{envoi ? "Ajout…" : "Ajouter le prospect"}</button>
        <button type="button" onClick={onFermer} style={bouton("#fff", C.mid, C.border)}>Annuler</button>
      </div>
    </form>
  );
}
