"use client";
// Espace admin des setters (/setter avec un compte ADMIN) : les setters et leurs statistiques,
// la création de leurs comptes, les RDV à marquer signés ou perdus, les commissions du mois
// (exportables), et tous les prospects avec un filtre par setter.
import { useState } from "react";
import { LogoSVG } from "@/components/ui/Logo";
import { formaterTelephone } from "@/lib/setter-import";
import { STATUTS_APPEL, correspond, formaterQuand, nomDirigeant } from "@/lib/setter-appels";
import {
  FORMULES, ISSUES, detailLigne, euros, historique, libelleMois, moisCourant, periodes, pourcent, repartition, statsSetter,
} from "@/lib/setter-commissions";
import { PastilleStatut } from "./Fiche";
import { C, Fond, POLICE, Pastille, bouton, carte, champ, etiquette, lien, titre } from "./ui";

const CSS_IMPRESSION = "@media print{.no-print{display:none!important}body{background:#fff!important}}";
const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function AdminSetters({ donnees, setDonnees, recharger, supabase, jeton, profil, onDeconnexion, onVoir }) {
  const [vue, setVue] = useState("setters");
  const [erreur, setErreur] = useState("");
  const { setters, prospects, appels, rdvs } = donnees;
  const nomSetter = id => { const s = setters.find(x => x.id === id); return s ? s.name || s.email : "Setter supprimé"; };
  const prospectDe = id => prospects.find(p => p.id === id);

  // Seul l'admin modifie un RDV (signé, perdu, client parti) ; en cas d'échec on revient en arrière.
  const majRdv = async (rdv, champs) => {
    const avant = rdvs;
    setDonnees(d => ({ ...d, rdvs: d.rdvs.map(x => (x.id === rdv.id ? { ...x, ...champs } : x)) }));
    const { error } = await supabase.from("setter_rdv").update(champs).eq("id", rdv.id);
    if (error) { setDonnees(d => ({ ...d, rdvs: avant })); setErreur("La modification n'a pas été enregistrée. Réessayez."); return false; }
    return true;
  };

  const aTraiter = rdvs.filter(r => r.issue === "en_attente" && new Date(r.rdv_le) < new Date()).length;
  const onglet = (id, label) => (
    <button key={id} onClick={() => { setVue(id); window.scrollTo(0, 0); }} style={{
      flex: "0 0 auto", background: "none", border: "none", borderBottom: `3px solid ${vue === id ? C.green : "transparent"}`,
      color: vue === id ? C.primary : C.mid, fontWeight: 900, fontSize: 14.5, fontFamily: POLICE, padding: "12px 2px", cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <Fond>
      <style>{CSS_IMPRESSION}</style>
      <header className="no-print" style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <LogoSVG width={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, lineHeight: 1.1 }}>Setters · espace admin</div>
                <div style={{ fontSize: 12, color: C.mid, fontWeight: 600 }}>{profil?.nom || profil?.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/dashboard" style={{ ...bouton("#fff", C.primary, C.border), padding: "8px 12px", fontSize: 13, textDecoration: "none" }}>Mon tableau de bord</a>
              <button onClick={onDeconnexion} style={{ ...bouton("#fff", C.mid, C.border), padding: "8px 12px", fontSize: 13 }}>Déconnexion</button>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 20, marginTop: 6, overflowX: "auto" }}>
            {onglet("setters", `Setters (${setters.length})`)}
            {onglet("rdv", `RDV${aTraiter ? ` (${aTraiter} à traiter)` : ""}`)}
            {onglet("commissions", "Commissions")}
            {onglet("prospects", `Prospects (${prospects.length})`)}
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 80px" }}>
        {erreur && <div role="alert" onClick={() => setErreur("")} style={{ ...carte, background: C.redBg, borderColor: "#fecaca", color: C.red, fontWeight: 700, marginBottom: 16, cursor: "pointer" }}>{erreur}</div>}
        {vue === "setters" && <VueSetters setters={setters} prospects={prospects} appels={appels} rdvs={rdvs} jeton={jeton} recharger={recharger} onVoir={onVoir} />}
        {vue === "rdv" && <VueRdv rdvs={rdvs} nomSetter={nomSetter} prospectDe={prospectDe} majRdv={majRdv} />}
        {vue === "commissions" && <VueCommissions setters={setters} rdvs={rdvs} prospectDe={prospectDe} />}
        {vue === "prospects" && <VueTousProspects setters={setters} prospects={prospects} appels={appels} nomSetter={nomSetter} />}
      </main>
    </Fond>
  );
}

// ─── Setters et statistiques ─────────────────────────────────────────────────

// Leads qui restent à appeler (jamais appelés, rappels et relances prévus) et à vérifier.
const STATUTS_A_APPELER = ["a_appeler", "rappel", "pas_de_reponse"];

function VueSetters({ setters, prospects, appels, rdvs, jeton, recharger, onVoir }) {
  const [periode, setPeriode] = useState("mois");
  const [ouverture, setOuverture] = useState(null); // setter dont l'espace est en train de s'ouvrir
  const [info, setInfo] = useState(""); // résultat de la dernière désactivation / suppression
  const p = periodes()[periode];
  const mois = moisCourant();
  const lignes = setters.map(s => {
    const leursRdv = rdvs.filter(r => r.setter_id === s.id);
    const gains = historique(leursRdv).find(h => h.mois === mois)?.total || 0;
    const leurs = prospects.filter(x => x.setter_id === s.id);
    const stock = {
      aAppeler: leurs.filter(x => x.verification === "qualifie" && STATUTS_A_APPELER.includes(x.statut)).length,
      aVerifier: leurs.filter(x => x.verification === "a_verifier").length,
    };
    const aHistorique = leursRdv.length > 0 || appels.some(a => a.setter_id === s.id);
    return { s, stock, aHistorique, stats: statsSetter(appels.filter(a => a.setter_id === s.id), leursRdv, p.depuis, p.avant), gains };
  });
  const cellule = { padding: "9px 10px", borderBottom: `1px solid ${C.bg}`, fontSize: 14, fontWeight: 700, color: C.text, textAlign: "right", whiteSpace: "nowrap" };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ ...carte, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ ...titre, margin: 0 }}>Statistiques par setter</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(periodes()).map(([id, x]) => (
              <button key={id} onClick={() => setPeriode(id)} style={{ ...bouton(periode === id ? C.primary : "#fff", periode === id ? "#fff" : C.primary, periode === id ? C.primary : C.border), padding: "6px 11px", fontSize: 13, borderRadius: 100 }}>{x.label}</button>
            ))}
          </div>
        </div>
        {!setters.length ? (
          <div style={{ fontSize: 14, color: C.mid, fontWeight: 600 }}>Aucun setter pour l&apos;instant : créez le premier compte ci-dessous.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: POLICE }}>
              <thead>
                <tr>{["Setter", "Leads à appeler", "Appels", "Décrochés", "RDV posés", "Signés", "RDV / décrochés", "Signés / RDV", "Gains du mois"].map((t, i) => (
                  <th key={t} style={{ ...cellule, fontSize: 12.5, fontWeight: 900, color: C.mid, textAlign: i ? "right" : "left" }}>{t}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lignes.map(({ s, stock, aHistorique, stats, gains }) => (
                  <tr key={s.id}>
                    <td style={{ ...cellule, textAlign: "left" }}>
                      {s.name || "—"}<div style={{ fontSize: 12, color: C.mid, fontWeight: 600 }}>{s.email}</div>
                      <button onClick={() => { setOuverture(s.id); onVoir(s); }} disabled={!!ouverture}
                        style={{ ...lien, background: "none", border: "none", padding: 0, marginTop: 4, fontFamily: POLICE, fontSize: 13, cursor: "pointer" }}>
                        {ouverture === s.id ? "Ouverture…" : "Voir son espace →"}
                      </button>
                      <AccesSetter s={s} aHistorique={aHistorique} jeton={jeton} recharger={recharger} annoncer={setInfo} />
                    </td>
                    <td style={cellule}>{stock.aAppeler}{stock.aVerifier > 0 && <div style={{ fontSize: 12, color: C.mid, fontWeight: 600 }}>+ {stock.aVerifier} à vérifier</div>}</td>
                    <td style={cellule}>{stats.appels}</td>
                    <td style={cellule}>{stats.decroches}</td>
                    <td style={cellule}>{stats.rdv}</td>
                    <td style={cellule}>{stats.signes}</td>
                    <td style={cellule}>{pourcent(stats.tauxRdv)}</td>
                    <td style={cellule}>{pourcent(stats.tauxSignature)}</td>
                    <td style={{ ...cellule, color: "#047857", fontWeight: 900 }}>{euros(gains)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {info && <div role="status" style={{ fontSize: 13.5, fontWeight: 700, color: "#047857" }}>{info}</div>}
        <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>Leads à appeler : qualifiés jamais appelés ou à rappeler, aujourd&apos;hui (quelle que soit la période). Décroché : tout résultat sauf « pas de réponse » et « faux numéro ». Gains du mois : commissions du mois en cours.</div>
      </section>
      <CreerSetter jeton={jeton} recharger={recharger} />
    </div>
  );
}

// Désactiver, réactiver ou supprimer un setter (/api/setter-access). Supprimer n'est proposé qu'à un
// compte qui n'a jamais appelé (faute de frappe dans l'e-mail) : sinon on désactive, l'historique reste.
const CONFIRMATIONS = {
  desactiver: { texte: "Il ne pourra plus se connecter. Ses leads jamais appelés repartent pour les autres setters ; son historique et ses commissions restent ici.", oui: "Oui, désactiver", envoi: "Désactivation…" },
  supprimer: { texte: "Le compte est supprimé définitivement (par exemple, faute de frappe dans l'e-mail). Ses leads jamais appelés repartent pour les autres setters.", oui: "Oui, supprimer", envoi: "Suppression…" },
};

function AccesSetter({ s, aHistorique, jeton, recharger, annoncer }) {
  const [confirmer, setConfirmer] = useState(null); // desactiver | supprimer
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const actif = s.role === "SETTER";
  const nom = s.name || s.email;
  const agir = async action => {
    setEnvoi(true); setErreur("");
    const rep = await fetch("/api/setter-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify({ id: s.id, action }),
    }).catch(() => null);
    const json = rep ? await rep.json().catch(() => ({})) : {};
    setEnvoi(false);
    if (!rep?.ok) return setErreur(json.error || "La modification n'a pas abouti.");
    const n = json.liberes || 0;
    const repartis = n ? ` ${n} lead${n > 1 ? "s" : ""} jamais appelé${n > 1 ? "s" : ""} ${n > 1 ? "repartent" : "repart"} pour les autres setters.` : "";
    annoncer(action === "reactiver" ? `${nom} a de nouveau accès à l'outil.`
      : action === "supprimer" ? `Compte ${s.email} supprimé.${repartis}` : `${nom} n'a plus accès à l'outil.${repartis}`);
    setConfirmer(null);
    recharger();
  };
  const petitBouton = couleur => ({ ...lien, color: couleur, background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, cursor: "pointer" });
  const c = CONFIRMATIONS[confirmer];
  return (
    <div style={{ marginTop: 4, display: "grid", gap: 4, justifyItems: "start", whiteSpace: "normal" }}>
      {!actif && <Pastille couleur={C.mid} fond="#f1f5f4">Désactivé{s.desactive_le ? ` le ${new Date(s.desactive_le).toLocaleDateString("fr-FR")}` : ""}</Pastille>}
      {c ? (
        <>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.mid, maxWidth: 260 }}>{c.texte}</span>
          <span style={{ display: "flex", gap: 12 }}>
            <button disabled={envoi} onClick={() => agir(confirmer)} style={petitBouton(C.red)}>{envoi ? c.envoi : c.oui}</button>
            <button disabled={envoi} onClick={() => setConfirmer(null)} style={petitBouton(C.mid)}>Annuler</button>
          </span>
        </>
      ) : (
        <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {actif
            ? <button onClick={() => setConfirmer("desactiver")} style={petitBouton(C.red)}>Désactiver l&apos;accès</button>
            : <button disabled={envoi} onClick={() => agir("reactiver")} style={petitBouton(C.primary)}>{envoi ? "Réactivation…" : "Réactiver l'accès"}</button>}
          {!aHistorique && <button onClick={() => setConfirmer("supprimer")} style={petitBouton(C.red)}>Supprimer</button>}
        </span>
      )}
      {erreur && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.red, maxWidth: 260 }}>{erreur}</span>}
    </div>
  );
}

function CreerSetter({ jeton, recharger }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null);
  const creer = async e => {
    e.preventDefault();
    setEnvoi(true); setMessage(null);
    const rep = await fetch("/api/create-setter", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify({ name: nom, email }),
    }).catch(() => null);
    const json = rep ? await rep.json().catch(() => ({})) : {};
    setEnvoi(false);
    if (!rep?.ok) return setMessage({ erreur: true, texte: json.error || "La création n'a pas abouti." });
    setMessage({ texte: `Invitation envoyée à ${email}. Le setter choisit son mot de passe avec le lien reçu, puis se connecte sur /setter.` });
    setNom(""); setEmail("");
    recharger();
  };
  return (
    <form onSubmit={creer} style={{ ...carte, display: "grid", gap: 12 }}>
      <h2 style={{ ...titre, margin: 0 }}>Créer un compte setter</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        <div><label style={etiquette}>Prénom et nom</label><input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex. : Léa Martin" style={champ} /></div>
        <div><label style={etiquette}>E-mail</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={champ} /></div>
      </div>
      <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>Le prénom apparaît dans l&apos;accroche de son script (« Bonjour Kamil, Léa, de la société NVM Finance »).</div>
      {message && <div role="status" style={{ fontSize: 13.5, fontWeight: 700, color: message.erreur ? C.red : "#047857" }}>{message.texte}</div>}
      <button type="submit" disabled={envoi} style={{ ...bouton(C.primary), justifySelf: "start", opacity: envoi ? 0.6 : 1 }}>{envoi ? "Envoi…" : "Envoyer l'invitation"}</button>
    </form>
  );
}

// ─── RDV : signé / perdu / client parti ──────────────────────────────────────

const FILTRES_RDV = {
  a_traiter: { label: "À traiter", test: r => r.issue === "en_attente" && new Date(r.rdv_le) < new Date() },
  a_venir: { label: "À venir", test: r => r.issue === "en_attente" && new Date(r.rdv_le) >= new Date() },
  signe: { label: "Signés", test: r => r.issue === "signe" },
  perdu: { label: "Perdus", test: r => r.issue === "perdu" },
  tous: { label: "Tous", test: () => true },
};

function VueRdv({ rdvs, nomSetter, prospectDe, majRdv }) {
  const [filtre, setFiltre] = useState("a_traiter");
  const liste = rdvs.filter(FILTRES_RDV[filtre].test).sort((a, b) => (filtre === "a_venir" ? new Date(a.rdv_le) - new Date(b.rdv_le) : new Date(b.rdv_le) - new Date(a.rdv_le)));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(FILTRES_RDV).map(([id, f]) => (
          <button key={id} onClick={() => setFiltre(id)} style={{ ...bouton(filtre === id ? C.primary : "#fff", filtre === id ? "#fff" : C.primary, filtre === id ? C.primary : C.border), borderRadius: 100, padding: "7px 13px", fontSize: 13.5 }}>
            {f.label} ({rdvs.filter(f.test).length})
          </button>
        ))}
      </div>
      {!liste.length ? (
        <div style={{ ...carte, textAlign: "center", color: C.mid, fontWeight: 600, padding: 32 }}>Aucun RDV ici.</div>
      ) : liste.map(r => <CarteRdv key={r.id} r={r} p={prospectDe(r.prospect_id)} setter={nomSetter(r.setter_id)} majRdv={majRdv} />)}
    </div>
  );
}

function CarteRdv({ r, p, setter, majRdv }) {
  const [mode, setMode] = useState(null); // signer | partir | deplacer
  const jourRdv = new Date(r.rdv_le).toLocaleDateString("sv-SE"); // AAAA-MM-JJ, heure locale
  const [nouveauRdv, setNouveauRdv] = useState("");
  const [formule, setFormule] = useState("mensuel");
  const [date, setDate] = useState(aujourdhui());
  const [envoi, setEnvoi] = useState(false);
  const faire = async champs => { setEnvoi(true); if (await majRdv(r, champs)) setMode(null); setEnvoi(false); };
  const passe = new Date(r.rdv_le) < new Date();
  const couleurIssue = { en_attente: [C.amber, C.amberBg], signe: ["#047857", "#d1fae5"], perdu: [C.mid, "#f1f5f4"] }[r.issue];
  return (
    <article style={{ ...carte, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 900, color: C.text }}>{p?.nom || "Prospect supprimé"}</div>
          <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 600 }}>
            RDV {formaterQuand(r.rdv_le)}{passe ? "" : " (à venir)"} · posé par <b style={{ color: C.text }}>{setter}</b>
          </div>
        </div>
        <Pastille couleur={couleurIssue[0]} fond={couleurIssue[1]}>
          {ISSUES[r.issue]}{r.issue === "signe" ? ` · ${FORMULES[r.formule]?.court}` : ""}{r.parti_le ? " · client parti" : ""}
        </Pastille>
      </div>
      <div style={{ fontSize: 13.5, color: C.mid, fontWeight: 600, lineHeight: 1.6 }}>
        {p && <div>Dirigeant : <b style={{ color: C.text }}>{nomDirigeant(p) || "non connu"}</b> · {formaterTelephone(p.telephone)}{p.categorie ? ` · ${p.categorie}` : ""}</div>}
        {(r.email_dirigeant || r.ca_approximatif) && <div>{[r.email_dirigeant, r.ca_approximatif && `CA ≈ ${r.ca_approximatif}`].filter(Boolean).join(" · ")}</div>}
        {r.enjeux && <div style={{ fontStyle: "italic" }}>« {r.enjeux} »</div>}
        {r.issue === "signe" && <div>Signé le {new Date(r.signe_le).toLocaleDateString("fr-FR")}{r.parti_le ? ` · parti le ${new Date(r.parti_le).toLocaleDateString("fr-FR")}` : ""}</div>}
      </div>

      {mode === "signer" && (
        <div style={{ display: "grid", gap: 10, background: C.bg, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(FORMULES).map(([id, f]) => (
              <button key={id} onClick={() => setFormule(id)} style={{ ...bouton(formule === id ? C.primary : "#fff", formule === id ? "#fff" : C.primary, formule === id ? C.primary : C.border), padding: "7px 11px", fontSize: 13, borderRadius: 100 }}>{f.label} · {f.prix}</button>
            ))}
          </div>
          <div style={{ maxWidth: 220 }}><label style={etiquette}>Date de signature</label><input type="date" value={date} min={jourRdv} onChange={e => setDate(e.target.value)} style={champ} /></div>
          {date && date < jourRdv && <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>La signature ne peut pas être avant le RDV ({new Date(r.rdv_le).toLocaleDateString("fr-FR")}). Si le RDV a été avancé, corrigez d&apos;abord sa date.</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={envoi || !date || date < jourRdv} onClick={() => faire({ issue: "signe", formule, signe_le: date, parti_le: null, issue_le: new Date().toISOString() })} style={{ ...bouton(C.green), opacity: envoi || !date || date < jourRdv ? 0.45 : 1 }}>Valider la signature</button>
            <button onClick={() => setMode(null)} style={bouton("#fff", C.mid, C.border)}>Annuler</button>
          </div>
        </div>
      )}
      {mode === "deplacer" && (
        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", background: C.bg, borderRadius: 12, padding: 12 }}>
          <div style={{ maxWidth: 260 }}><label style={etiquette}>Nouvelle date et heure du RDV</label><input type="datetime-local" value={nouveauRdv} onChange={e => setNouveauRdv(e.target.value)} style={champ} /></div>
          <button disabled={envoi || !nouveauRdv} onClick={() => faire({ rdv_le: new Date(nouveauRdv).toISOString() })} style={{ ...bouton(C.primary), opacity: envoi || !nouveauRdv ? 0.45 : 1 }}>Enregistrer</button>
          <button onClick={() => setMode(null)} style={bouton("#fff", C.mid, C.border)}>Annuler</button>
        </div>
      )}
      {mode === "partir" && (
        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", background: C.bg, borderRadius: 12, padding: 12 }}>
          <div style={{ maxWidth: 220 }}><label style={etiquette}>Date de départ du client</label><input type="date" value={date} min={r.signe_le} onChange={e => setDate(e.target.value)} style={champ} /></div>
          <button disabled={envoi || !date} onClick={() => faire({ parti_le: date })} style={bouton(C.red)}>Valider le départ</button>
          <button onClick={() => setMode(null)} style={bouton("#fff", C.mid, C.border)}>Annuler</button>
        </div>
      )}

      {!mode && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.issue === "en_attente" && (
            <>
              <button onClick={() => { setDate(aujourdhui() < jourRdv ? jourRdv : aujourdhui()); setMode("signer"); }} style={bouton(C.green)}>Signé</button>
              <button disabled={envoi} onClick={() => faire({ issue: "perdu", formule: null, signe_le: null, parti_le: null, issue_le: new Date().toISOString() })} style={bouton("#fff", C.red, "#fecaca")}>Perdu</button>
              <button onClick={() => { setNouveauRdv(""); setMode("deplacer"); }} style={bouton("#fff", C.primary, C.border)}>RDV déplacé</button>
            </>
          )}
          {r.issue === "signe" && r.formule === "mensuel" && !r.parti_le && (
            <button onClick={() => { setDate(aujourdhui()); setMode("partir"); }} style={bouton("#fff", C.red, "#fecaca")}>Client parti</button>
          )}
          {r.issue !== "en_attente" && (
            <button disabled={envoi} onClick={() => faire({ issue: "en_attente", formule: null, signe_le: null, parti_le: null, issue_le: null })}
              style={{ background: "none", border: "none", padding: 0, fontFamily: POLICE, fontSize: 13, fontWeight: 700, color: C.mid, cursor: "pointer", textDecoration: "underline" }}>
              Remettre en attente
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Commissions : relevé mensuel par setter, exportable ─────────────────────

function VueCommissions({ setters, rdvs, prospectDe }) {
  const tous = historique(rdvs);
  const moisDispo = [...new Set([moisCourant(), ...tous.map(h => h.mois)])].sort().reverse();
  const [mois, setMois] = useState(moisDispo[0]);
  const parSetter = setters.map(s => {
    const h = historique(rdvs.filter(r => r.setter_id === s.id)).find(x => x.mois === mois);
    return { s, total: h?.total || 0, lignes: h?.lignes || [] };
  }).filter(x => x.lignes.length);
  const total = parSetter.reduce((t, x) => t + x.total, 0);
  const parts = repartition(parSetter.flatMap(x => x.lignes));

  const exporter = () => {
    const lignes = [["Mois", "Setter", "Email du setter", "Client", "Formule", "Détail", "Commission (€)"]];
    for (const x of parSetter) for (const l of x.lignes) {
      lignes.push([mois, x.s.name || "", x.s.email || "", prospectDe(l.rdv.prospect_id)?.nom || "", FORMULES[l.rdv.formule]?.label || "", detailLigne(l), l.montant]);
    }
    const csv = lignes.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const lienCsv = document.createElement("a");
    lienCsv.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    lienCsv.download = `commissions-setters-${mois}.csv`;
    lienCsv.click();
    URL.revokeObjectURL(lienCsv.href);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ ...carte, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ ...titre, margin: 0 }}>Relevé des commissions · {libelleMois(mois)}</h2>
          <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={mois} onChange={e => setMois(e.target.value)} style={{ ...champ, width: "auto", padding: "8px 10px" }}>
              {moisDispo.map(m => <option key={m} value={m}>{libelleMois(m)}</option>)}
            </select>
            <button onClick={exporter} disabled={!parSetter.length} style={bouton("#fff", C.primary, C.primary)}>Exporter (CSV)</button>
            <button onClick={() => window.print()} style={bouton("#fff", C.primary, C.border)}>Imprimer / PDF</button>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>
          20 % : pilotage mensuel 98 € par mois tant que le client est actif (mois du départ compris), audit 600 € le mois de signature, tableau de bord gratuit 0 €.
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#047857" }}>Total à verser : {euros(total)}</div>
        {total > 0 && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.mid }}>
            {`dont ${euros(parts.mensuel)} de pilotage mensuel (revient chaque mois tant que le client reste) et ${euros(parts.unique)} d'audits (versés une seule fois)`}
          </div>
        )}
      </section>
      {!parSetter.length ? (
        <div style={{ ...carte, textAlign: "center", color: C.mid, fontWeight: 600, padding: 32 }}>Aucune commission ce mois-ci.</div>
      ) : parSetter.map(({ s, total: t, lignes }) => (
        <section key={s.id} style={{ ...carte, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{s.name || s.email}<span style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}> · {s.email}</span></div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#047857" }}>{euros(t)}</div>
          </div>
          {lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, fontWeight: 600, color: C.mid, borderTop: `1px solid ${C.bg}`, paddingTop: 6 }}>
              <span>{prospectDe(l.rdv.prospect_id)?.nom || "Client"} · {FORMULES[l.rdv.formule]?.court} <span style={{ fontWeight: 500 }}>· {detailLigne(l)}</span></span>
              <span style={{ color: C.text, fontWeight: 800 }}>{euros(l.montant)}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ─── Tous les prospects, filtre par setter ───────────────────────────────────

function VueTousProspects({ setters, prospects, appels, nomSetter }) {
  const [setter, setSetter] = useState("tous");
  const [statut, setStatut] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const nbAppels = new Map();
  for (const a of appels) nbAppels.set(a.prospect_id, (nbAppels.get(a.prospect_id) || 0) + 1);
  const liste = prospects
    .filter(p => setter === "tous" || p.setter_id === setter)
    .filter(p => statut === "tous" || (statut === "a_verifier" || statut === "rejete" ? p.verification === statut : p.verification === "qualifie" && p.statut === statut))
    .filter(p => correspond(p, recherche))
    .sort((a, b) => (b.dernier_appel || b.created_at || "").localeCompare(a.dernier_appel || a.created_at || ""))
    .slice(0, 300);
  const cellule = { padding: "8px 10px", borderBottom: `1px solid ${C.bg}`, fontSize: 13.5, fontWeight: 600, color: C.mid, textAlign: "left", verticalAlign: "top" };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
        <select value={setter} onChange={e => setSetter(e.target.value)} style={champ}>
          <option value="tous">Tous les setters</option>
          {setters.map(s => <option key={s.id} value={s.id}>{s.name || s.email}{s.role === "SETTER_INACTIF" ? " (désactivé)" : ""}</option>)}
        </select>
        <select value={statut} onChange={e => setStatut(e.target.value)} style={champ}>
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUTS_APPEL).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          <option value="a_verifier">À vérifier</option>
          <option value="rejete">Rejetés à l&apos;import</option>
        </select>
        <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Nom, dirigeant ou numéro…" style={champ} />
      </div>
      <section style={{ ...carte, padding: 0, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: POLICE }}>
          <thead>
            <tr>{["Prospect", "Setter", "Statut", "Appels", "Dernier appel"].map(t => <th key={t} style={{ ...cellule, fontWeight: 900, color: C.text }}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {liste.map(p => (
              <tr key={p.id}>
                <td style={cellule}><b style={{ color: C.text }}>{p.nom}</b><div style={{ fontSize: 12.5 }}>{[nomDirigeant(p), formaterTelephone(p.telephone)].filter(Boolean).join(" · ")}</div></td>
                <td style={cellule}>{nomSetter(p.setter_id)}</td>
                <td style={cellule}><PastilleStatut p={p} /></td>
                <td style={cellule}>{nbAppels.get(p.id) || 0}</td>
                <td style={cellule}>{p.dernier_appel ? formaterQuand(p.dernier_appel) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div style={{ fontSize: 12.5, color: C.mid, fontWeight: 600 }}>{liste.length === 300 ? "300 premiers résultats : affinez avec les filtres." : `${liste.length} prospect${liste.length > 1 ? "s" : ""}`}</div>
    </div>
  );
}
