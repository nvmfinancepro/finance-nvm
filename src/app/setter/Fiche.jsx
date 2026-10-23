"use client";
// La fiche d'un prospect pendant l'appel : infos et numéro cliquable, résultat de l'appel
// en 1 clic, script personnalisé (accroche, objections, FAQ) et historique des appels.
// Utilisée par la file d'appels et quand on ouvre un contact depuis « Prospects » ou « Agenda ».
import { useState } from "react";
import { formaterTelephone, montantCourt, normaliserTelephone } from "@/lib/setter-import";
import { accroche, confirmation, faq, objections } from "@/lib/setter-script";
import { EFFECTIFS } from "@/lib/setter-secteurs";
import {
  MAIL_ENVOYE, MAX_SANS_REPONSE, RAISONS_PAS_INTERESSE, RAISONS_PAS_LA_CIBLE, RESULTATS, SITE, STATUTS_APPEL,
  estMailEnvoye, formaterQuand, lienCalendly, mailEnvoyeLe, nomDirigeant, personnaliser, prochainEssai, raccourcisRappel, versChampDate,
} from "@/lib/setter-appels";
import {
  Accordeon, C, COULEURS_STATUT, POLICE, Pastille, Sep, VERIFICATIONS, ancienneteTexte, bouton, carte, champ,
  etiquette, ficheOfficielle, lien, normaliser, rechercheOfficielle, titre,
} from "./ui";

const CSS = `
.fiche-grille{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);grid-template-areas:"infos" "resultat" "script" "historique"}
@media (min-width:900px){
  .fiche-grille{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-areas:"infos script" "resultat script" "historique script";align-items:start}
  .fiche-script{position:sticky;top:120px;max-height:calc(100vh - 140px);overflow:auto}
}`;

export default function Fiche({ p, appels, rdvs, prenomSetter, onNoter, onTrancher, onModifier, onReverifier, onPasser, enTete }) {
  const bloque = p.statut === "ne_plus_appeler";
  return (
    <div>
      <style>{CSS}</style>
      {enTete}
      <div className="fiche-grille">
        <div style={{ gridArea: "infos" }}><Infos key={p.id} p={p} mailLe={mailEnvoyeLe(appels)} onModifier={onModifier} /></div>
        <div style={{ gridArea: "script" }} className="fiche-script"><ScriptAppel p={p} prenomSetter={prenomSetter} /></div>
        <div style={{ gridArea: "resultat" }}>
          {p.verification !== "qualifie" ? <PasEncoreQualifie p={p} onTrancher={onTrancher} onReverifier={onReverifier} />
            : bloque ? <ContactBloque />
              : onNoter ? <ResultatAppel key={p.id} p={p} onNoter={onNoter} onPasser={onPasser} />
                : <LectureSeule onPasser={onPasser} />}
        </div>
        <div style={{ gridArea: "historique" }}><Historique appels={appels} rdvs={rdvs} /></div>
      </div>
    </div>
  );
}

// ─── Infos et numéro ─────────────────────────────────────────────────────────

export function PastilleStatut({ p }) {
  if (p.verification !== "qualifie") {
    const v = VERIFICATIONS[p.verification];
    return <Pastille couleur={v.couleur} fond={v.fond}>{v.label}</Pastille>;
  }
  const c = COULEURS_STATUT[p.statut] || COULEURS_STATUT.a_appeler;
  let texte = STATUTS_APPEL[p.statut]?.label || "À appeler";
  if ((p.statut === "rappel" || p.statut === "pas_de_reponse") && p.prochain_appel) texte += ` · ${formaterQuand(p.prochain_appel)}`;
  return <Pastille couleur={c.couleur} fond={c.fond}>{texte}</Pastille>;
}

// Le contact a reçu un mail (rappel « Mail envoyé ») : l'étiquette reste, même sans réponse.
export function PastilleMail({ le }) {
  if (!le) return null;
  return <Pastille couleur="#fff" fond={C.primary}>{MAIL_ENVOYE} · {new Date(le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</Pastille>;
}

const IconeTel = ({ taille = 22 }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

function Infos({ p, mailLe, onModifier }) {
  const [edition, setEdition] = useState(false);
  const bloque = p.statut === "ne_plus_appeler";
  const dirigeant = nomDirigeant(p);
  const infos = [
    p.date_creation && ancienneteTexte(p.date_creation),
    p.ca != null ? `CA ${p.ca_annee} : ${montantCourt(p.ca)}` : p.siren && "CA non publié",
    EFFECTIFS[p.effectif],
  ].filter(Boolean);
  return (
    <section style={{ ...carte, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: C.text, overflowWrap: "anywhere" }}>{p.nom}</h2>
          {p.categorie && <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 700, marginTop: 2 }}>{p.categorie}</div>}
        </div>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <PastilleMail le={mailLe} />
          <PastilleStatut p={p} />
        </span>
      </div>

      <div style={{ fontSize: 15, color: C.mid, fontWeight: 600, lineHeight: 1.6 }}>
        Dirigeant : <b style={{ color: C.text }}>{dirigeant || "non trouvé"}</b>
        {infos.length > 0 && <div style={{ fontSize: 13.5 }}>{infos.map((x, i) => <span key={i}>{i > 0 && <Sep />}{x}</span>)}</div>}
        {p.raison_sociale && normaliser(p.raison_sociale) !== normaliser(p.nom) && <div style={{ fontSize: 13 }}>Raison sociale : {p.raison_sociale}</div>}
      </div>

      {p.note && (
        <div style={{ background: C.amberBg, borderRadius: 12, padding: "10px 12px", fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "pre-wrap" }}>{p.note}</div>
      )}

      {bloque ? (
        <div style={{ background: C.red, color: "#fff", borderRadius: 14, padding: "14px 16px", fontSize: 15, fontWeight: 900, textAlign: "center" }}>
          A demandé à ne plus être appelé : ne pas le rappeler.
        </div>
      ) : (
        <>
          <a href={`tel:${p.telephone}`} style={{ ...bouton(C.primary), display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 20, padding: "14px 16px", textDecoration: "none", borderRadius: 14 }}>
            <IconeTel />
            {formaterTelephone(p.telephone)}
          </a>
          {p.ligne_directe && (
            <a href={`tel:${p.ligne_directe}`} style={{ ...bouton("#fff", C.primary, C.primary), display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, textDecoration: "none", borderRadius: 14 }}>
              <IconeTel taille={18} />
              Ligne directe : {formaterTelephone(p.ligne_directe)}
            </a>
          )}
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 14 }}>
        {p.site_web && <a href={p.site_web} target="_blank" rel="noopener noreferrer" style={lien}>Site web</a>}
        {p.maps_url && <a href={p.maps_url} target="_blank" rel="noopener noreferrer" style={lien}>Google Maps</a>}
        {p.siren && <a href={ficheOfficielle(p.siren)} target="_blank" rel="noopener noreferrer" style={lien}>Fiche officielle</a>}
        {p.email_dirigeant && <a href={`mailto:${p.email_dirigeant}`} style={lien}>{p.email_dirigeant}</a>}
        {onModifier && !edition && (
          <button onClick={() => setEdition(true)} style={{ ...lien, background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 14, cursor: "pointer" }}>Modifier la fiche</button>
        )}
      </div>

      {edition && <EditionFiche p={p} onModifier={onModifier} onFermer={() => setEdition(false)} />}
    </section>
  );
}

// Le setter complète ce qu'il apprend pendant l'appel : prénom du dirigeant (le script se met à
// jour), email, ligne directe, et une note qui reste en tête de la fiche.
function EditionFiche({ p, onModifier, onFermer }) {
  const [f, setF] = useState({
    dirigeant_prenom: p.dirigeant_prenom || "", dirigeant_nom: p.dirigeant_nom || "",
    email_dirigeant: p.email_dirigeant || "", ligne_directe: p.ligne_directe ? formaterTelephone(p.ligne_directe) : "",
    note: p.note || "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const maj = cle => e => setF(x => ({ ...x, [cle]: e.target.value }));
  const enregistrer = async e => {
    e.preventDefault();
    const ligne = f.ligne_directe.trim() ? normaliserTelephone(f.ligne_directe) : null;
    if (f.ligne_directe.trim() && !ligne) return setErreur("Ligne directe : numéro français invalide.");
    const email = f.email_dirigeant.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErreur("Adresse e-mail invalide.");
    setEnvoi(true); setErreur("");
    const r = await onModifier(p, {
      dirigeant_prenom: f.dirigeant_prenom.trim() || null, dirigeant_nom: f.dirigeant_nom.trim() || null,
      email_dirigeant: email || null, ligne_directe: ligne, note: f.note.trim() || null,
    });
    setEnvoi(false);
    if (r?.erreur) setErreur(r.erreur);
    else onFermer();
  };
  return (
    <form onSubmit={enregistrer} style={{ ...cadreForm, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
      <div><label style={etiquette}>Prénom du dirigeant</label><input value={f.dirigeant_prenom} onChange={maj("dirigeant_prenom")} style={champ} /></div>
      <div><label style={etiquette}>Nom du dirigeant</label><input value={f.dirigeant_nom} onChange={maj("dirigeant_nom")} style={champ} /></div>
      <div><label style={etiquette}>E-mail du dirigeant</label><input type="email" value={f.email_dirigeant} onChange={maj("email_dirigeant")} style={champ} /></div>
      <div><label style={etiquette}>Ligne directe</label><input type="tel" value={f.ligne_directe} onChange={maj("ligne_directe")} placeholder="06 12 34 56 78" style={champ} /></div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={etiquette}>Note sur ce contact</label>
        <textarea value={f.note} onChange={maj("note")} rows={2} placeholder="Ex. : joignable plutôt le matin, demander Paul" style={{ ...champ, resize: "vertical" }} />
      </div>
      {erreur && <div role="alert" style={{ gridColumn: "1 / -1", color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
      <div style={{ gridColumn: "1 / -1" }}><Actions envoi={envoi} libelle="Enregistrer la fiche" onAnnuler={onFermer} /></div>
    </form>
  );
}

function ContactBloque() {
  return (
    <section style={{ ...carte, fontSize: 14, fontWeight: 700, color: C.mid }}>
      Ce contact a demandé à ne plus être appelé. Il reste dans l&apos;outil pour que personne ne le ré-importe ni ne le rappelle.
    </section>
  );
}

// L'admin qui regarde l'espace d'un setter : le résultat de l'appel reste au setter.
function LectureSeule({ onPasser }) {
  return (
    <section style={{ ...carte, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 14, fontWeight: 700, color: C.mid }}>
      <span>Lecture seule : c&apos;est le setter qui note le résultat de ses appels.</span>
      {onPasser && <button onClick={onPasser} style={{ ...lien, background: "none", border: "none", fontFamily: POLICE, fontSize: 13.5, cursor: "pointer", padding: 0 }}>Suivant →</button>}
    </section>
  );
}

function PasEncoreQualifie({ p, onTrancher, onReverifier }) {
  return (
    <section style={{ ...carte, display: "grid", gap: 10 }}>
      {p.verification === "a_verifier" ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.mid }}>Ce prospect est « à vérifier » : validez-le pour pouvoir l&apos;appeler.</div>
          <Proposition p={p} />
          {onTrancher && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => onTrancher(p, "qualifie")} style={bouton(C.green)}>Valider</button>
            <button onClick={() => onTrancher(p, "rejete")} style={bouton("#fff", C.red, "#fecaca")}>Rejeter</button>
            {onReverifier && p.maps_url && <button onClick={() => onReverifier(p)} style={bouton("#fff", C.primary, C.border)}>Revérifier</button>}
          </div>}
        </>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>Rejeté à l&apos;import{p.raison_rejet ? ` : ${p.raison_rejet}` : ""}.</div>
      )}
    </section>
  );
}

// Ce que la base officielle propose pour un prospect « à vérifier » : une aide pour trancher.
export function Proposition({ p }) {
  const e = p.proposition;
  if (!e?.siren) {
    return (
      <div style={{ background: C.amberBg, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, color: C.mid, fontWeight: 600 }}>
        Aucune entreprise correspondante trouvée près de cette adresse dans la base officielle.{" "}
        <a href={rechercheOfficielle(p.nom)} target="_blank" rel="noopener noreferrer" style={lien}>Chercher à la main</a>
      </div>
    );
  }
  const dirigeant = [e.dirigeant_prenom, e.dirigeant_nom].filter(Boolean).join(" ");
  const details = [
    e.commune && (e.distance_km != null ? `${e.commune}, à ${String(e.distance_km).replace(".", ",")} km` : e.commune),
    String(e.nature_juridique || "").startsWith("1") && "entrepreneur individuel",
    e.etat_administratif === "C" && "fermée",
    e.date_creation && ancienneteTexte(e.date_creation),
    e.ca != null && `CA ${e.ca_annee} : ${montantCourt(e.ca)}`,
    EFFECTIFS[e.effectif],
    dirigeant && `dirigeant : ${dirigeant}`,
  ].filter(Boolean);
  return (
    <div style={{ background: C.amberBg, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, color: C.mid, fontWeight: 600, lineHeight: 1.55 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: C.amber, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>Entreprise la plus probable</div>
      <a href={ficheOfficielle(e.siren)} target="_blank" rel="noopener noreferrer" style={lien}>{e.raison_sociale || e.siren}</a>
      {details.length > 0 && <div>{details.join(" · ")}</div>}
    </div>
  );
}

// ─── Résultat de l'appel ─────────────────────────────────────────────────────

const BOUTONS = [
  { id: "pas_de_reponse", couleur: C.amber, fond: C.amberBg },
  { id: "rappel", couleur: "#1d4ed8", fond: "#eff6ff" },
  { id: "rdv", couleur: "#fff", fond: C.green },
  { id: "pas_interesse", couleur: C.mid, fond: "#f1f5f4" },
  { id: "pas_la_cible", couleur: C.mid, fond: "#f1f5f4" },
  { id: "faux_numero", couleur: C.red, fond: C.redBg },
];

function ResultatAppel({ p, onNoter, onPasser }) {
  const [choix, setChoix] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const noter = async (resultat, champs = {}) => {
    if (envoi) return;
    setEnvoi(true); setErreur("");
    const r = await onNoter(p, resultat, champs);
    setEnvoi(false);
    if (r?.erreur) setErreur(r.erreur);
    else setChoix(null);
  };

  const cliquer = id => {
    if (id === "pas_de_reponse") return noter(id, { prochain: prochainEssai(new Date()) });
    if (id === "faux_numero") return noter(id);
    setErreur("");
    setChoix(c => (c === id ? null : id));
  };

  const essai = p.nb_sans_reponse + 1;
  return (
    <section style={{ ...carte, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <h3 style={{ ...titre, margin: 0 }}>Résultat de l&apos;appel</h3>
        {onPasser && <button onClick={onPasser} disabled={envoi} style={{ ...lien, background: "none", border: "none", fontFamily: POLICE, fontSize: 13.5, cursor: "pointer", padding: 0 }}>Passer →</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {BOUTONS.map(b => (
          <button key={b.id} onClick={() => cliquer(b.id)} disabled={envoi}
            style={{ ...bouton(b.fond, b.couleur, choix === b.id ? b.couleur : b.fond), padding: "13px 10px", fontSize: 14.5, whiteSpace: "normal", opacity: envoi ? 0.6 : 1 }}>
            {RESULTATS[b.id]}
            {b.id === "pas_de_reponse" && <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, opacity: 0.8 }}>appel {Math.min(essai, MAX_SANS_REPONSE)}/{MAX_SANS_REPONSE}</span>}
          </button>
        ))}
      </div>
      {choix === "rappel" && <FormRappel p={p} envoi={envoi} onValider={champs => noter("rappel", champs)} onAnnuler={() => setChoix(null)} />}
      {choix === "rdv" && <FormRdv p={p} envoi={envoi} onValider={champs => noter("rdv", champs)} onAnnuler={() => setChoix(null)} />}
      {choix === "pas_interesse" && <FormRaison raisons={RAISONS_PAS_INTERESSE} avecNote envoi={envoi} onValider={champs => noter("pas_interesse", champs)} onAnnuler={() => setChoix(null)} />}
      {choix === "pas_la_cible" && <FormRaison raisons={RAISONS_PAS_LA_CIBLE} envoi={envoi} onValider={champs => noter("pas_la_cible", champs)} onAnnuler={() => setChoix(null)} />}
      {choix === "ne_plus_appeler" ? (
        <form onSubmit={e => { e.preventDefault(); noter("ne_plus_appeler", { note: e.target.note.value }); }} style={{ ...cadreForm, background: C.redBg }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>Ce contact ne sera plus jamais appelé, ni par vous ni par un autre setter.</div>
          <textarea name="note" rows={2} placeholder="Note (facultatif)" style={{ ...champ, resize: "vertical" }} />
          <Actions envoi={envoi} libelle="Confirmer : ne plus l'appeler" onAnnuler={() => setChoix(null)} />
        </form>
      ) : (
        <button onClick={() => cliquer("ne_plus_appeler")} disabled={envoi}
          style={{ justifySelf: "start", background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, fontWeight: 700, color: C.red, cursor: "pointer", textDecoration: "underline" }}>
          Il demande à ne plus être appelé
        </button>
      )}
      {erreur && <div role="alert" style={{ color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
    </section>
  );
}

const Actions = ({ envoi, libelle, onAnnuler, desactive }) => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <button type="submit" disabled={envoi || desactive} style={{ ...bouton(C.primary), opacity: envoi || desactive ? 0.5 : 1 }}>{envoi ? "Enregistrement…" : libelle}</button>
    <button type="button" onClick={onAnnuler} style={bouton("#fff", C.mid, C.border)}>Annuler</button>
  </div>
);

const cadreForm = { display: "grid", gap: 12, background: C.bg, borderRadius: 12, padding: 14 };

// Rappel daté. « Il demande un mail » : la case garde la trace du mail (étiquette « Mail envoyé »)
// et enregistre son adresse sur la fiche ; le rappel le remet dans la file s'il ne répond pas.
function FormRappel({ p, envoi, onValider, onAnnuler }) {
  const [quand, setQuand] = useState("");
  const [note, setNote] = useState("");
  const [mail, setMail] = useState(false);
  const [email, setEmail] = useState(p.email_dirigeant || "");
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try { await navigator.clipboard.writeText(SITE); setCopie(true); } catch { setCopie(false); }
  };
  const valider = e => {
    e.preventDefault();
    if (!quand) return;
    const adresse = mail ? email.trim() : "";
    if (adresse && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return setErreur("Adresse e-mail invalide.");
    onValider({ prochain: new Date(quand), note, raison: mail ? MAIL_ENVOYE : null, email: adresse });
  };
  return (
    <form onSubmit={valider} style={cadreForm}>
      <div>
        <span style={etiquette}>Quand le rappeler ?</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {raccourcisRappel(new Date()).map(r => (
            <button key={r.label} type="button" onClick={() => setQuand(versChampDate(r.date))}
              style={{ ...bouton("#fff", C.primary, quand === versChampDate(r.date) ? C.primary : C.border), padding: "6px 10px", fontSize: 13, borderRadius: 100 }}>{r.label}</button>
          ))}
        </div>
        <input type="datetime-local" required value={quand} onChange={e => setQuand(e.target.value)} style={champ} />
      </div>
      <div style={{ display: "grid", gap: 10, background: "#fff", border: `1.5px solid ${mail ? C.primary : C.border}`, borderRadius: 12, padding: "11px 13px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, fontWeight: 800, color: C.text, cursor: "pointer" }}>
          <input type="checkbox" checked={mail} onChange={e => { setMail(e.target.checked); setErreur(""); }} style={{ width: 20, height: 20, accentColor: C.primary, flex: "0 0 auto" }} />
          Il a demandé un mail : mail envoyé
        </label>
        {mail && (
          <>
            <div>
              <label style={etiquette}>E-mail du dirigeant (enregistré sur la fiche)</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErreur(""); }} placeholder="prenom@entreprise.fr" style={champ} />
            </div>
            <div style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>
              Le lien du site à glisser dans le mail :{" "}
              <button type="button" onClick={copier} style={{ ...lien, background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, cursor: "pointer" }}>
                {copie ? "lien copié ✓" : "copier nvm-finance.fr"}
              </button>
            </div>
          </>
        )}
      </div>
      <div>
        <label style={etiquette}>Note (facultatif)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={mail ? "Ex. : veut d'abord regarder le site" : "Ex. : en rendez-vous, rappeler en fin de journée"} style={{ ...champ, resize: "vertical" }} />
      </div>
      {erreur && <div role="alert" style={{ color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
      <Actions envoi={envoi} libelle={mail ? "Enregistrer le mail et le rappel" : "Enregistrer le rappel"} onAnnuler={onAnnuler} desactive={!quand} />
    </form>
  );
}

function FormRdv({ p, envoi, onValider, onAnnuler }) {
  const [email, setEmail] = useState(p.email_dirigeant || "");
  const [quand, setQuand] = useState("");
  const [ca, setCa] = useState(p.ca != null ? montantCourt(p.ca) : "");
  const [enjeux, setEnjeux] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); if (quand) onValider({ rdvLe: new Date(quand), email, ca, enjeux }); }} style={cadreForm}>
      <div>
        <label style={etiquette}>1. Email du dirigeant</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@entreprise.fr" style={champ} />
      </div>
      <div>
        <span style={etiquette}>2. Réservez le créneau pendant l&apos;appel</span>
        <a href={lienCalendly(p, email)} target="_blank" rel="noopener noreferrer" style={{ ...bouton(C.green), display: "inline-block", textDecoration: "none" }}>Ouvrir Calendly ↗</a>
        <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600, marginTop: 6 }}>Le nom et l&apos;email sont pré-remplis. Le dirigeant reçoit l&apos;invitation tout de suite.</div>
      </div>
      <div>
        <label style={etiquette}>3. Date et heure du RDV réservé</label>
        <input type="datetime-local" required value={quand} onChange={e => setQuand(e.target.value)} style={champ} />
      </div>
      <div>
        <label style={etiquette}>CA approximatif</label>
        <input value={ca} onChange={e => setCa(e.target.value)} placeholder="Ex. : 400 k€" style={champ} />
      </div>
      <div>
        <label style={etiquette}>Enjeux mentionnés</label>
        <textarea value={enjeux} onChange={e => setEnjeux(e.target.value)} rows={3} placeholder="Ce que le dirigeant a partagé : ses enjeux, ses questions…" style={{ ...champ, resize: "vertical" }} />
      </div>
      <Actions envoi={envoi} libelle="Enregistrer le RDV" onAnnuler={onAnnuler} desactive={!quand} />
    </form>
  );
}

function FormRaison({ raisons, avecNote, envoi, onValider, onAnnuler }) {
  const [raison, setRaison] = useState("");
  const [autre, setAutre] = useState("");
  const [note, setNote] = useState("");
  const finale = raison === "Autre" ? autre.trim() : raison;
  return (
    <form onSubmit={e => { e.preventDefault(); if (finale) onValider({ raison: finale, note }); }} style={cadreForm}>
      <div>
        <span style={etiquette}>Raison</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[...raisons, "Autre"].map(r => (
            <button key={r} type="button" onClick={() => setRaison(r)}
              style={{ ...bouton(raison === r ? C.primary : "#fff", raison === r ? "#fff" : C.primary, raison === r ? C.primary : C.border), padding: "7px 11px", fontSize: 13, borderRadius: 100, whiteSpace: "normal", textAlign: "left" }}>{r}</button>
          ))}
        </div>
        {raison === "Autre" && <input value={autre} onChange={e => setAutre(e.target.value)} placeholder="Précisez la raison" style={{ ...champ, marginTop: 8 }} autoFocus />}
      </div>
      {avecNote && (
        <div>
          <label style={etiquette}>Note (facultatif)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...champ, resize: "vertical" }} />
        </div>
      )}
      <Actions envoi={envoi} libelle="Enregistrer" onAnnuler={onAnnuler} desactive={!finale} />
    </form>
  );
}

// ─── Script ──────────────────────────────────────────────────────────────────

const insecables = t => String(t).replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");

function ScriptAppel({ p, prenomSetter }) {
  const valeurs = { prenomDirigeant: p.dirigeant_prenom, prenomSetter };
  const bloc = { borderLeft: `4px solid ${C.primary}`, background: C.bg, borderRadius: "0 12px 12px 0", padding: "12px 14px", fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.6 };
  return (
    <section style={{ ...carte, display: "grid", gap: 14 }}>
      <div>
        <h3 style={titre}>L&apos;accroche</h3>
        <div style={bloc}>{accroche.map((l, i) => <span key={i}>{i > 0 && <br />}{insecables(personnaliser(l, valeurs))}</span>)}</div>
        {!p.dirigeant_prenom && <div style={{ fontSize: 12.5, color: C.amber, fontWeight: 700, marginTop: 6 }}>Prénom du dirigeant inconnu : demandez à parler au dirigeant ou au gérant.</div>}
      </div>
      <div>
        <h3 style={titre}>La confirmation</h3>
        <div style={bloc}>{insecables(confirmation)}</div>
      </div>
      <div>
        <h3 style={titre}>Les objections</h3>
        <Accordeon items={objections} />
      </div>
      <div>
        <h3 style={titre}>Les questions fréquentes</h3>
        <Accordeon items={faq} />
      </div>
    </section>
  );
}

// ─── Historique ──────────────────────────────────────────────────────────────

function Historique({ appels, rdvs }) {
  const rdvParAppel = new Map(rdvs.map(r => [r.appel_id, r]));
  return (
    <section style={carte}>
      <h3 style={titre}>Historique des appels</h3>
      {!appels.length ? (
        <div style={{ fontSize: 14, color: C.mid, fontWeight: 600 }}>Aucun appel pour l&apos;instant.</div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {appels.map(a => {
            const rdv = rdvParAppel.get(a.id);
            return (
              <li key={a.id} style={{ borderLeft: `3px solid ${C.border}`, paddingLeft: 10, fontSize: 13.5, color: C.mid, fontWeight: 600, lineHeight: 1.5 }}>
                <div><b style={{ color: C.text }}>{RESULTATS[a.resultat]}</b><Sep />{formaterQuand(a.created_at)}</div>
                {a.raison && <div>{estMailEnvoye(a) ? "Mail envoyé au dirigeant" : `Raison : ${a.raison}`}</div>}
                {a.rappel_le && <div>{a.resultat === "rappel" ? "Rappel prévu" : "Nouvel essai prévu"} {formaterQuand(a.rappel_le)}</div>}
                {rdv && <div>RDV le {formaterQuand(rdv.rdv_le)}{rdv.ca_approximatif ? ` · CA ≈ ${rdv.ca_approximatif}` : ""}{rdv.enjeux ? ` · ${rdv.enjeux}` : ""}</div>}
                {a.note && <div style={{ fontStyle: "italic" }}>« {a.note} »</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
