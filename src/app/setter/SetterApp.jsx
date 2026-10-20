"use client";
// Outil de travail des setters (/setter) : importer ses prospects (Google Maps), les appeler un
// par un, noter chaque résultat en 1 clic, suivre ses rappels et ses RDV.
// Volontairement hors de NVMFinance.jsx : un setter ne charge jamais l'espace client.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LogoSVG } from "@/components/ui/Logo";
import { RESULTATS, fileDAppels, formaterQuand, nomDirigeant } from "@/lib/setter-appels";
import { creerLimiteur, faitsEntreprise, rechercherEntreprise, zoneDuPoint } from "@/lib/setter-import";
import AdminSetters from "./AdminSetters";
import AjoutProspect from "./AjoutProspect";
import Fiche from "./Fiche";
import VueAgenda from "./VueAgenda";
import VueAppels from "./VueAppels";
import VueGains from "./VueGains";
import VueProspects from "./VueProspects";
import VueTrouver from "./VueTrouver";
import { C, Fond, POLICE, bouton, carte, champ, lien } from "./ui";

// Client « simple » (session dans le localStorage), comme NVMFinance.jsx : une connexion faite
// sur /dashboard ou /auth/login est donc reprise ici, et inversement.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;

// Erreurs levées exprès par setter_noter_appel() (messages déjà en français).
const ERREURS_METIER = new Set(["22023", "P0002", "42501"]);

// Supabase renvoie au plus 1 000 lignes par requête : on lit par tranches jusqu'au bout.
// requete() refait la requête à chaque tranche (une requête ne s'exécute qu'une fois).
async function toutLire(requete) {
  const data = [];
  for (let de = 0; ; de += 1000) {
    const r = await requete().range(de, de + 999);
    if (r.error) return { error: r.error };
    data.push(...r.data);
    if (r.data.length < 1000) return { data };
  }
}

function texteConfirmation(avant, resultat, apres, rdv) {
  if (resultat === "pas_de_reponse") {
    return apres.statut === "injoignable"
      ? `${avant.nom} : 3 appels sans réponse, il passe en « injoignable ».`
      : `Pas de réponse : nouvel essai ${formaterQuand(apres.prochain_appel)}.`;
  }
  if (resultat === "rappel") return `Rappel prévu ${formaterQuand(apres.prochain_appel)}.`;
  if (resultat === "rdv" && rdv) return `RDV enregistré pour ${formaterQuand(rdv.rdv_le)}. Bravo !`;
  return `Noté : ${RESULTATS[resultat]}.`;
}

// ─── Racine ──────────────────────────────────────────────────────────────────

export default function SetterApp() {
  const [etat, setEtat] = useState("chargement"); // chargement | connexion | interdit | admin | pret
  const [admin, setAdmin] = useState(null); // données de l'espace admin (setters, prospects, appels, RDV)
  const [regard, setRegard] = useState(null); // setter dont l'admin regarde l'espace, en lecture seule
  const [profil, setProfil] = useState(null);
  const [vue, setVue] = useState("appeler");
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [prospects, setProspects] = useState([]);
  const [appels, setAppels] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [ficheId, setFicheId] = useState(null);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState(null); // { texte, appelId? }
  const [ajout, setAjout] = useState(false);
  const [maintenant, setMaintenant] = useState(() => new Date());
  const minuteur = useRef(null);
  const prospectsRef = useRef([]);
  const rappelsAnnonces = useRef(new Set());

  // setterId : l'admin qui regarde l'espace d'un setter (la RLS lui ouvre tous les setters).
  const charger = useCallback(async setterId => {
    const de = q => (setterId ? q.eq("setter_id", setterId) : q);
    const [p, a, r] = await Promise.all([
      toutLire(() => de(supabase.from("setter_prospects").select("*")).order("id")),
      toutLire(() => de(supabase.from("setter_appels").select("*")).order("created_at", { ascending: false }).order("id")),
      toutLire(() => de(supabase.from("setter_rdv").select("*")).order("rdv_le").order("id")),
    ]);
    if (p.error || a.error || r.error) { setErreur("Impossible de charger vos données. Rechargez la page."); return []; }
    setProspects(p.data || []); setAppels(a.data || []); setRdvs(r.data || []);
    return p.data || [];
  }, []);

  // Espace admin : tout ce que l'ADMIN voit (RLS « admin all » sur chaque table).
  const chargerAdmin = useCallback(async () => {
    const [s, p, a, r] = await Promise.all([
      supabase.from("profiles").select("id,name,email,created_at").eq("role", "SETTER").order("created_at"),
      toutLire(() => supabase.from("setter_prospects").select("id,setter_id,nom,categorie,telephone,verification,statut,dernier_appel,prochain_appel,dirigeant_prenom,dirigeant_nom,created_at").order("id")),
      toutLire(() => supabase.from("setter_appels").select("id,prospect_id,setter_id,created_at,resultat").order("id")),
      toutLire(() => supabase.from("setter_rdv").select("*").order("rdv_le", { ascending: false }).order("id")),
    ]);
    if (s.error || p.error || a.error || r.error) { setErreur("Impossible de charger l'espace admin. Rechargez la page."); return; }
    setAdmin({ setters: s.data, prospects: p.data, appels: a.data, rdvs: r.data });
  }, []);

  const ouvrirSession = useCallback(async session => {
    if (!session) return setEtat("connexion");
    const { data } = await supabase.from("profiles").select("name, role").eq("id", session.user.id).maybeSingle();
    setProfil({ nom: data?.name && data.name !== session.user.email ? data.name : "", email: session.user.email });
    if (data?.role === "ADMIN") { await chargerAdmin(); return setEtat("admin"); }
    if (data?.role !== "SETTER") return setEtat("interdit");
    const liste = await charger();
    setVue(liste.some(p => p.verification === "qualifie") ? "appeler" : "trouver");
    setEtat("pret");
  }, [charger, chargerAdmin]);

  // Session existante au chargement, puis déconnexion (y compris depuis un autre onglet).
  // setTimeout : supabase-js déconseille d'appeler ses méthodes dans ce callback.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evenement, session) => {
      if (evenement === "INITIAL_SESSION" || evenement === "SIGNED_OUT") setTimeout(() => ouvrirSession(session), 0);
    });
    return () => subscription.unsubscribe();
  }, [ouvrirSession]);

  // Pas d'alerte de rappel pour l'admin qui regarde l'espace d'un setter.
  useEffect(() => { prospectsRef.current = regard ? [] : prospects; }, [prospects, regard]);

  // Les rappels arrivent à échéance au fil de la journée : la file est recalculée chaque minute,
  // et un rappel qui vient d'arriver à son heure est annoncé (notification du navigateur si le
  // setter l'a autorisée dans l'Agenda).
  useEffect(() => {
    const t = setInterval(() => {
      const maintenant = new Date();
      setMaintenant(maintenant);
      for (const p of prospectsRef.current) {
        if (p.statut !== "rappel" || !p.prochain_appel) continue;
        const heure = new Date(p.prochain_appel), cle = `${p.id}-${p.prochain_appel}`;
        if (heure > maintenant || maintenant - heure > 120000 || rappelsAnnonces.current.has(cle)) continue;
        rappelsAnnonces.current.add(cle);
        const qui = nomDirigeant(p) ? `${nomDirigeant(p)} (${p.nom})` : p.nom;
        setConfirmation({ texte: `C'est l'heure de rappeler ${qui}.` });
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Rappel NVM Finance", { body: `C'est l'heure de rappeler ${qui}.` });
        } catch { /* notifications indisponibles */ }
      }
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const deconnexion = async () => { setEtat("connexion"); setProspects([]); setAppels([]); setRdvs([]); setAdmin(null); setRegard(null); await supabase.auth.signOut(); };

  // L'admin ouvre l'espace d'un setter tel que celui-ci le voit, sans pouvoir rien y modifier.
  const voirSetter = async s => {
    await charger(s.id);
    setRegard(s); setVue("appeler"); setFiltre("tous"); setRecherche(""); setFicheId(null);
    window.scrollTo(0, 0);
  };
  const quitterRegard = () => {
    setRegard(null); setProspects([]); setAppels([]); setRdvs([]); setFicheId(null); setErreur("");
    window.scrollTo(0, 0);
  };

  // Message en bas d'écran ; après un résultat d'appel, il propose « Annuler » pendant 8 secondes.
  const annoncer = (texte, appelId = null) => {
    setConfirmation({ texte, appelId });
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setConfirmation(null), appelId ? 8000 : 5000);
  };

  // « Valider » passe un « à vérifier » en qualifié tel quel (il entre dans la file) ; « Rejeter » l'écarte.
  const trancher = async (p, verification) => {
    const raison_rejet = verification === "rejete" ? "Rejeté à la main" : null;
    const avant = prospects;
    setProspects(ps => ps.map(x => (x.id === p.id ? { ...x, verification, raison_rejet } : x)));
    const { error } = await supabase.from("setter_prospects").update({ verification, raison_rejet }).eq("id", p.id);
    if (error) { setProspects(avant); setErreur("La modification n'a pas été enregistrée. Réessayez."); }
  };

  // Résultat d'un appel : une seule écriture en base (journal + suivi du prospect + RDV).
  const noterAppel = async (p, resultat, champs = {}) => {
    const { data, error } = await supabase.rpc("setter_noter_appel", {
      p_prospect: p.id,
      p_resultat: resultat,
      p_note: champs.note || null,
      p_raison: champs.raison || null,
      p_prochain_appel: champs.prochain ? champs.prochain.toISOString() : null,
      p_rdv_le: champs.rdvLe ? champs.rdvLe.toISOString() : null,
      p_email: champs.email || null,
      p_ca: champs.ca || null,
      p_enjeux: champs.enjeux || null,
    });
    if (error) return { erreur: ERREURS_METIER.has(error.code) ? error.message : "L'appel n'a pas été enregistré. Vérifiez votre connexion et réessayez." };
    setProspects(ps => ps.map(x => (x.id === data.prospect.id ? data.prospect : x)));
    setAppels(as => [data.appel, ...as]);
    if (data.rdv) setRdvs(rs => [...rs, data.rdv]);
    setMaintenant(new Date());
    annoncer(texteConfirmation(p, resultat, data.prospect, data.rdv), data.appel.id);
    return { ok: true };
  };

  // Clic par erreur : la base remet le prospect exactement comme avant cet appel.
  const annulerAppel = async appelId => {
    setConfirmation(null);
    const { data, error } = await supabase.rpc("setter_annuler_appel", { p_appel: appelId });
    if (error) return annoncer(ERREURS_METIER.has(error.code) ? error.message : "L'annulation n'a pas abouti. Réessayez.");
    setProspects(ps => ps.map(x => (x.id === data.prospect.id ? data.prospect : x)));
    setAppels(as => as.filter(a => a.id !== appelId));
    setRdvs(rs => rs.filter(r => r.appel_id !== appelId));
    annoncer(`Annulé : ${data.prospect.nom} est revenu comme avant.`);
  };

  // « Revérifier » un « à vérifier » : nouvelle recherche dans la base officielle, verdict du serveur.
  const reverifier = async p => {
    annoncer(`Nouvelle recherche pour ${p.nom}…`);
    const appeler = creerLimiteur(5);
    let r = { certain: false };
    try {
      r = await rechercherEntreprise(p, appeler, await zoneDuPoint(p, appeler, new Map()));
    } catch {
      return annoncer("La base officielle ne répond pas : réessayez dans quelques minutes.");
    }
    const officiel = r.entreprise ? faitsEntreprise(r.entreprise) : null;
    const rep = await fetch("/api/setter/reverifier", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify({
        id: p.id, certain: !!r.certain, entreprise: r.certain ? officiel : null,
        proposition: !r.certain && officiel ? { ...officiel, commune: r.etablissement?.libelle_commune || null, distance_km: r.distance != null ? Math.round(r.distance * 10) / 10 : null } : null,
      }),
    });
    const json = await rep.json().catch(() => ({}));
    if (!rep.ok) return annoncer(json.error || "La vérification n'a pas abouti.");
    const apres = json.prospect;
    setProspects(ps => ps.map(x => (x.id === apres.id ? apres : x)));
    annoncer(apres.verification === "qualifie" ? `${apres.nom} est retrouvé et qualifié : il entre dans votre file d'appels.`
      : apres.verification === "rejete" ? `${apres.nom} est retrouvé mais hors cible : ${apres.raison_rejet}.`
        : `${apres.nom} n'est toujours pas retrouvé avec certitude.`);
  };

  // Le setter complète la fiche (prénom du dirigeant, email, ligne directe, note).
  const modifierFiche = async (p, champs) => {
    const avant = prospects;
    setProspects(ps => ps.map(x => (x.id === p.id ? { ...x, ...champs } : x)));
    const { error } = await supabase.from("setter_prospects").update(champs).eq("id", p.id);
    if (error) { setProspects(avant); return { erreur: "La fiche n'a pas été enregistrée. Réessayez." }; }
    annoncer("Fiche mise à jour.");
    return { ok: true };
  };

  if (etat === "chargement") return <Fond><div style={{ padding: 60, textAlign: "center", color: C.mid, fontWeight: 700 }}>Chargement…</div></Fond>;
  if (etat === "connexion") return <Connexion onConnecte={ouvrirSession} />;
  if (etat === "interdit") return <Interdit profil={profil} onDeconnexion={deconnexion} />;
  if (etat === "admin" && !regard) {
    return admin
      ? <AdminSetters donnees={admin} setDonnees={setAdmin} recharger={chargerAdmin} supabase={supabase} jeton={jeton} profil={profil} onDeconnexion={deconnexion} onVoir={voirSetter} />
      : <Fond><div style={{ padding: 60, textAlign: "center", color: C.red, fontWeight: 700 }}>{erreur || "Chargement…"}</div></Fond>;
  }

  const appelsDe = id => appels.filter(a => a.prospect_id === id);
  const rdvsDe = id => rdvs.filter(r => r.prospect_id === id);
  const qui = regard ? { nom: regard.name || "", email: regard.email } : profil;
  const prenomSetter = (qui?.nom || "").split(/\s+/)[0] || "";
  const changerVue = v => { setVue(v); window.scrollTo(0, 0); };
  const allerA = (v, f) => { if (f) setFiltre(f); setRecherche(""); changerVue(v); };
  const ficheOuverte = ficheId != null ? prospects.find(p => p.id === ficheId) : null;
  // Lecture seule (admin qui regarde un setter) : aucune action qui écrit.
  const actions = regard ? {} : { onNoter: noterAppel, onTrancher: trancher, onModifier: modifierFiche, onReverifier: reverifier };
  const communs = { appelsDe, rdvsDe, prenomSetter, ...actions };

  return (
    <Fond>
      <EnTete profil={qui} regard={!!regard} onQuitter={quitterRegard} vue={vue} setVue={changerVue} onDeconnexion={deconnexion}
        nbAppeler={fileDAppels(prospects, maintenant).length} nbProspects={prospects.length} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 80px" }}>
        {erreur && (
          <div role="alert" onClick={() => setErreur("")} style={{ ...carte, background: C.redBg, borderColor: "#fecaca", color: C.red, fontWeight: 700, marginBottom: 16, cursor: "pointer" }}>{erreur}</div>
        )}
        {vue === "appeler" && <VueAppels prospects={prospects} maintenant={maintenant} allerA={allerA} {...communs} />}
        {vue === "agenda" && <VueAgenda prospects={prospects} rdvs={rdvs} appelsDe={appelsDe} maintenant={maintenant} ouvrirFiche={setFicheId} />}
        {vue === "prospects" && (
          <VueProspects prospects={prospects} filtre={filtre} setFiltre={setFiltre} recherche={recherche} setRecherche={setRecherche}
            ouvrirFiche={setFicheId} onTrancher={actions.onTrancher} onReverifier={actions.onReverifier} onAjouter={regard ? null : () => setAjout(true)} />
        )}
        {vue === "gains" && <VueGains rdvs={rdvs} prospects={prospects} />}
        {vue === "trouver" && !regard && (
          <VueTrouver prospects={prospects} jeton={jeton} onImporte={charger} ouvrirListe={f => allerA("prospects", f)} allerAppeler={() => allerA("appeler")}
            onAjoute={() => { charger(); annoncer("Ajouté à votre file d'appels."); }} />
        )}
      </main>

      {ficheOuverte && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, background: C.bg, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#fff", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setFicheId(null)} style={{ ...bouton("#fff", C.primary, C.border), padding: "8px 12px", fontSize: 13.5 }}>← Retour</button>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.mid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Fiche contact</span>
            </div>
          </div>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 80px" }}>
            <Fiche p={ficheOuverte} appels={appelsDe(ficheOuverte.id)} rdvs={rdvsDe(ficheOuverte.id)} prenomSetter={prenomSetter} {...actions} />
          </div>
        </div>
      )}

      {ajout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, background: C.bg, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 16px 80px" }}>
            <AjoutProspect jeton={jeton} onFermer={() => setAjout(false)} onAjoute={charger} />
          </div>
        </div>
      )}

      {confirmation && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 40, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 14, background: C.text, color: "#fff", borderRadius: 12, padding: "10px 12px 10px 16px", fontSize: 14, fontWeight: 800, boxShadow: "0 12px 30px rgba(0,0,0,.25)", maxWidth: 560 }}>
            <span>{confirmation.texte}</span>
            {confirmation.appelId && (
              <button onClick={() => annulerAppel(confirmation.appelId)} style={{ ...bouton("#fff", C.text), padding: "7px 12px", fontSize: 13.5 }}>Annuler</button>
            )}
          </div>
        </div>
      )}
    </Fond>
  );
}

function EnTete({ profil, regard, onQuitter, vue, setVue, nbAppeler, nbProspects, onDeconnexion }) {
  const onglet = (id, label) => (
    <button key={id} onClick={() => setVue(id)} style={{
      flex: "0 0 auto", background: "none", border: "none", borderBottom: `3px solid ${vue === id ? C.green : "transparent"}`,
      color: vue === id ? C.primary : C.mid, fontWeight: 900, fontFamily: POLICE, padding: "12px 2px", cursor: "pointer",
    }}>{label}</button>
  );
  return (
    <header style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
      {regard && (
        <div style={{ background: C.amberBg, borderBottom: "1px solid #fde68a", color: C.amber, fontSize: 13.5, fontWeight: 800, padding: "8px 16px", textAlign: "center" }}>
          Vous voyez l&apos;espace de {profil?.nom || profil?.email} comme sur son écran · lecture seule
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <LogoSVG width={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, lineHeight: 1.1 }}>Espace setter</div>
              <div style={{ fontSize: 12, color: C.mid, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profil?.nom || profil?.email}</div>
            </div>
          </div>
          {regard
            ? <button onClick={onQuitter} style={{ ...bouton("#fff", C.primary, C.border), padding: "8px 12px", fontSize: 13 }}>← Retour à l&apos;admin</button>
            : <button onClick={onDeconnexion} style={{ ...bouton("#fff", C.mid, C.border), padding: "8px 12px", fontSize: 13 }}>Déconnexion</button>}
        </div>
        <style>{".setter-nav{display:flex;gap:20px;margin-top:6px;overflow-x:auto}.setter-nav button{font-size:14.5px}@media (max-width:420px){.setter-nav{gap:11px}.setter-nav button{font-size:13.5px}.setter-nb{display:none}}"}</style>
        <nav className="setter-nav">
          {onglet("appeler", `Appeler${nbAppeler ? ` (${nbAppeler})` : ""}`)}
          {onglet("agenda", "Agenda")}
          {onglet("prospects", <>Prospects{nbProspects ? <span className="setter-nb"> ({nbProspects})</span> : null}</>)}
          {!regard && onglet("trouver", "Trouver")}
          {onglet("gains", "Gains")}
        </nav>
      </div>
    </header>
  );
}

// ─── Connexion ───────────────────────────────────────────────────────────────

function Connexion({ onConnecte }) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const connecter = async e => {
    e.preventDefault();
    setEnvoi(true); setErreur("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setEnvoi(false);
    if (error) return setErreur("Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.");
    onConnecte(data.session);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: `linear-gradient(135deg, #003d3a 0%, ${C.primary} 60%)`, fontFamily: POLICE }}>
      <form onSubmit={connecter} style={{ ...carte, width: "100%", maxWidth: 400, padding: "32px 24px", borderRadius: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <LogoSVG width={64} />
          <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>Espace setter</div>
        </div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.mid, marginBottom: 6 }}>E-mail</label>
        <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ ...champ, marginBottom: 14 }} />
        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.mid, marginBottom: 6 }}>Mot de passe</label>
        <input type="password" autoComplete="current-password" required value={motDePasse} onChange={e => setMotDePasse(e.target.value)} style={{ ...champ, marginBottom: 16 }} />
        {erreur && <div style={{ color: C.red, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{erreur}</div>}
        <button type="submit" disabled={envoi} style={{ ...bouton(C.primary), width: "100%", padding: 14, fontSize: 15 }}>{envoi ? "Connexion…" : "Se connecter"}</button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          <a href="/auth/login" style={lien}>Mot de passe oublié ?</a>
        </div>
      </form>
    </div>
  );
}

function Interdit({ profil, onDeconnexion }) {
  return (
    <Fond>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "80px 16px" }}>
        <div style={{ ...carte, textAlign: "center", padding: "32px 24px" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.primary, marginBottom: 8 }}>Espace réservé aux setters</div>
          <div style={{ fontSize: 14, color: C.mid, marginBottom: 20 }}>Le compte {profil?.email} n&apos;est pas un compte setter.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/dashboard" style={{ ...bouton(C.primary), textDecoration: "none" }}>Aller à mon espace</a>
            <button onClick={onDeconnexion} style={bouton("#fff", C.mid, C.border)}>Changer de compte</button>
          </div>
        </div>
      </div>
    </Fond>
  );
}
