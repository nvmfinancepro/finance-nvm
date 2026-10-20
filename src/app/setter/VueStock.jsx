"use client";
// « Sortir des leads » : un clic donne un paquet d'entreprises déjà dans la cible, d'un métier ou
// de tous au hasard, chaque lead à un seul setter (stock commun, migrations 041-042). Bâtiment
// RGE et pharmacies : le numéro est inclus, le lead entre directement dans la file d'appels.
// Autres métiers : l'outil cherche le numéro lui-même (TomTom puis Google Maps, avec vérification
// du nom et de l'adresse) ; s'il ne le trouve pas, le lead attend ici que le setter le trouve.
// La liste de chaque métier
// se charge par lots quand il reste peu de leads libres, et reprend du début tous les 30 jours.
import { useEffect, useState } from "react";
import { creerLimiteur } from "@/lib/setter-import";
import { LEADS_PAR_CLIC, MAX_EN_ATTENTE, SECTEURS_STOCK, departementDeLaZone, preparerLot } from "@/lib/setter-stock";
import ChampZone from "./ChampZone";
import { Lead } from "./VueBase";
import { C, bouton, carte, etiquette, titre } from "./ui";

const appeler = creerLimiteur(5);
const CLE_ZONE = "setter-maps-ville"; // la même zone que l'onglet Google Maps
const CLE_SECTEUR = "setter-stock-secteur";
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* navigation privée */ } };
// Lots chargés au plus par métier et par clic (un lot = 4 pages de la base officielle).
const LOTS_PAR_CLIC = 3;

export default function VueStock({ prospects, jeton, onSortis, allerAppeler }) {
  const [zone, setZone] = useState(() => lire(CLE_ZONE, null));
  const [choix, setChoix] = useState(() => lire(CLE_SECTEUR, "aleatoire"));
  const departement = departementDeLaZone(zone);
  const [nomCommune, setNomCommune] = useState({ code: null, nom: "" }); // nom du département d'une ville choisie
  const [etatLu, setEtatLu] = useState(null); // l'état du stock, avec le département auquel il se rapporte
  const [version, setVersion] = useState(0);
  const [travail, setTravail] = useState(null); // { texte } pendant la préparation et la sortie
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!departement || zone.type === "departement") return;
    let actif = true;
    fetch(`https://geo.api.gouv.fr/departements/${departement}?fields=nom`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (actif) setNomCommune({ code: departement, nom: d?.nom || departement }); })
      .catch(() => { if (actif) setNomCommune({ code: departement, nom: departement }); });
    return () => { actif = false; };
  }, [zone, departement]);
  const nomDepartement = zone?.type === "departement" ? zone.nom : nomCommune.code === departement ? nomCommune.nom : "";

  useEffect(() => {
    if (!departement) return;
    let actif = true;
    (async () => {
      try {
        const rep = await fetch(`/api/setter/stock?departement=${departement}`, { headers: { Authorization: `Bearer ${await jeton()}` } });
        const json = await rep.json().catch(() => ({}));
        if (actif) setEtatLu({ departement, ...(rep.ok ? json : { erreur: json.error || "Stock de leads indisponible." }) });
      } catch {
        if (actif) setEtatLu({ departement, erreur: "Stock de leads indisponible." });
      }
    })();
    return () => { actif = false; };
  }, [departement, jeton, version]);
  const recharger = () => setVersion(v => v + 1);
  // Tant que l'état du département choisi n'est pas arrivé (changement de zone), on n'affiche rien.
  const etat = etatLu?.departement === departement ? etatLu : null;

  const choisis = choix === "aleatoire" ? SECTEURS_STOCK : SECTEURS_STOCK.filter(s => s.id === choix);
  const secteurs = etat?.secteurs || {};
  const libres = choisis.reduce((n, s) => n + (secteurs[s.id]?.libres || 0), 0);
  const avecNumero = choisis.reduce((n, s) => n + (secteurs[s.id]?.avecNumero || 0), 0);
  // Tout a été lu dans la base officielle et il ne reste rien : il n'y a plus rien à sortir.
  const epuise = !!etat?.secteurs && !libres && choisis.every(s => secteurs[s.id]?.fin && !secteurs[s.id]?.aRefaire);
  const aTrouver = etat?.aTrouver || [];
  const enAttente = prospects.filter(p => p.verification === "qualifie" && p.statut === "a_appeler").length + aTrouver.length;
  const plein = enAttente >= MAX_EN_ATTENTE;

  // Recherche automatique des numéros des leads sortis sans numéro, par paquets de 6.
  const chercherNumeros = async (ids, entetes) => {
    let trouves = 0;
    for (let i = 0; i < ids.length; i += 6) {
      setTravail({ texte: `Recherche des numéros (TomTom, Google Maps)… ${i} sur ${ids.length}` });
      const rep = await fetch("/api/setter/chercher-numeros", { method: "POST", headers: entetes, body: JSON.stringify({ ids: ids.slice(i, i + 6) }) });
      if (!rep.ok) throw new Error((await rep.json().catch(() => ({}))).error || "Recherche des numéros impossible.");
      trouves += (await rep.json()).trouves || 0;
    }
    return trouves;
  };
  const sansRecherche = (etat?.aTrouver || []).filter(s => !s.numero_cherche_le).map(s => s.id);
  const chercherRestants = async () => {
    setErreur("");
    try {
      const trouves = await chercherNumeros(sansRecherche, { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` });
      if (trouves) onSortis();
    } catch (e) {
      setErreur(e.message);
    }
    setTravail(null);
    recharger();
  };

  const sortir = async () => {
    setErreur(""); setResultat(null);
    try {
      const entetes = { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` };
      // Charge la suite de la liste des métiers où il reste peu de leads libres.
      const besoin = choix === "aleatoire" ? Math.ceil(LEADS_PAR_CLIC / choisis.length) + 5 : LEADS_PAR_CLIC;
      for (const s of choisis) {
        const z = secteurs[s.id] || { libres: 0, page: 0, fin: false, aRefaire: false };
        let depuis = z.aRefaire ? 0 : z.page, dispo = z.libres, fin = z.fin && !z.aRefaire;
        for (let n = 0; n < LOTS_PAR_CLIC && dispo < besoin && !fin; n++) {
          setTravail({ texte: `Préparation de la liste : ${s.label}…` });
          const lot = await preparerLot(s, departement, depuis, appeler, jeton);
          const rep = await fetch("/api/setter/stock", {
            method: "POST", headers: entetes,
            body: JSON.stringify({ departement, secteur: s.id, depuis, page: lot.page, fin: lot.fin, recherche: `${s.court} · ${nomDepartement || departement}`, leads: lot.leads }),
          });
          if (!rep.ok) throw new Error((await rep.json().catch(() => ({}))).error || "Préparation de la liste impossible.");
          dispo += lot.leads.length; depuis = lot.page; fin = lot.fin;
        }
      }
      setTravail({ texte: "Sortie des leads…" });
      const rep = await fetch("/api/setter/sortir", {
        method: "POST", headers: entetes,
        body: JSON.stringify({ departement, secteur: choix, zone: nomDepartement || departement }),
      });
      const json = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(json.error || "Sortie des leads impossible.");
      // Les leads sortis sans numéro : l'outil cherche d'abord lui-même.
      let trouves = 0;
      if (json.aTrouver) {
        const e = await fetch(`/api/setter/stock?departement=${departement}`, { headers: entetes }).then(r => r.json()).catch(() => ({}));
        trouves = await chercherNumeros((e.aTrouver || []).filter(s => !s.numero_cherche_le).map(s => s.id), entetes);
      }
      setResultat({ ...json, trouves });
      if (json.avecNumero || trouves) onSortis();
    } catch (e) {
      setErreur(e.message || "Sortie des leads impossible, réessayez dans une minute.");
    }
    setTravail(null);
    recharger();
  };

  // Numéro trouvé (ou lead écarté) pour un lead sans numéro. Renvoie null, ou le message à afficher.
  const envoyer = async (lead, corps) => {
    const rep = await fetch("/api/setter/numero", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify({ id: lead.id, ...corps }),
    });
    const json = await rep.json().catch(() => ({}));
    // Déjà dans l'outil, ou plus en attente : le lead quitte la liste, on dit pourquoi en haut.
    if (rep.status === 409 || rep.status === 404) { setErreur(json.error); recharger(); return null; }
    return rep.ok ? null : json.error || "Ajout impossible.";
  };
  const auSuivant = () => setTimeout(() => document.querySelector("input[data-numero]")?.focus(), 60);

  const bloque = !!travail || plein || epuise || !etat || !!etat.erreur;
  const puce = (id, label, numero) => (
    <button key={id} type="button" onClick={() => { setChoix(id); ecrire(CLE_SECTEUR, id); setResultat(null); }}
      style={{ ...bouton(choix === id ? C.primary : "#fff", choix === id ? "#fff" : C.primary, choix === id ? C.primary : C.border), padding: "7px 12px", fontSize: 13.5, borderRadius: 100 }}>
      {label}{numero && <span style={{ fontWeight: 700, opacity: 0.85 }}> · ☎ inclus</span>}
    </button>
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ ...carte, display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ ...titre, margin: 0 }}>Sortir des leads</h2>
          <div style={{ fontSize: 13, color: C.mid, fontWeight: 600, marginTop: 4 }}>
            Entreprises déjà dans la cible (société de 3 ans et plus, CA publié entre 20 k€ et 3 M€ ou 1 à 49 salariés). Chaque lead n&apos;est donné qu&apos;à un seul setter. ☎ inclus : le lead part directement dans votre file d&apos;appels. Sinon, l&apos;outil cherche son numéro sur TomTom et Google Maps (même nom, même adresse) ; s&apos;il ne le trouve pas, le lead attend ici.
          </div>
        </div>
        <div style={{ maxWidth: 360 }}>
          <span style={etiquette}>Votre département (ou votre ville)</span>
          <ChampZone zone={zone} onChange={z => { setZone(z); ecrire(CLE_ZONE, z); setResultat(null); setErreur(""); }} placeholder="Département ou ville" />
        </div>
        <div>
          <span style={etiquette}>Métier</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {puce("aleatoire", "Aléatoire (tous les métiers)")}
            {SECTEURS_STOCK.map(s => puce(s.id, s.label, !!s.numero))}
          </div>
        </div>

        {departement && (
          <div style={{ background: C.bg, borderRadius: 14, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: C.mid }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{nomDepartement || departement}</div>
              {travail ? travail.texte
                : !etat ? "…"
                : etat.erreur ? <span style={{ color: C.red }}>{etat.erreur}</span>
                : <>
                    <b style={{ color: C.text }}>{libres.toLocaleString("fr-FR")}</b> leads prêts{avecNumero ? ` (dont ${avecNumero.toLocaleString("fr-FR")} avec numéro)` : ""}
                    {epuise ? "" : ", la suite se charge au clic"} · {etat.sortis.toLocaleString("fr-FR")} déjà sortis dans le département, dont {etat.mesSortis.toLocaleString("fr-FR")} pour vous
                  </>}
            </div>
            <button onClick={sortir} disabled={bloque}
              style={{ ...bouton(C.green), fontSize: 16, padding: "13px 22px", opacity: bloque ? 0.55 : 1 }}>
              {travail ? "En cours…" : `Sortir ${LEADS_PAR_CLIC} leads`}
            </button>
          </div>
        )}

        {plein && (
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Vous avez déjà {enAttente} leads en attente (jamais appelés ou numéro à trouver) : traitez-les d&apos;abord, le bouton revient en dessous de {MAX_EN_ATTENTE}.
          </div>
        )}
        {epuise && !resultat && (
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Plus aucun lead à sortir pour ce choix dans ce département : prenez un autre métier ou un département voisin.
          </div>
        )}
        {resultat && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 15, fontWeight: 800, color: resultat.sortis ? "#047857" : C.text }}>
            {!resultat.sortis ? "Plus aucun lead à sortir pour ce choix : prenez un autre métier ou un département voisin."
              : [resultat.avecNumero + resultat.trouves > 0 && `${resultat.avecNumero + resultat.trouves} lead${resultat.avecNumero + resultat.trouves > 1 ? "s" : ""} dans votre file d'appels${resultat.trouves ? ` (dont ${resultat.trouves} numéro${resultat.trouves > 1 ? "s" : ""} trouvé${resultat.trouves > 1 ? "s" : ""} automatiquement)` : ""}`,
                resultat.aTrouver - resultat.trouves > 0 && `${resultat.aTrouver - resultat.trouves} sans numéro trouvé, à chercher ci-dessous`].filter(Boolean).join(" · ") + "."}
            {resultat.avecNumero + resultat.trouves > 0 && <button onClick={allerAppeler} style={bouton(C.primary)}>Appeler maintenant →</button>}
          </div>
        )}
        {erreur && <div role="alert" style={{ color: C.red, fontSize: 13.5, fontWeight: 700 }}>{erreur}</div>}
      </section>

      {aTrouver.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <h2 style={{ ...titre, margin: 0 }}>Numéros à trouver ({aTrouver.length})</h2>
            {sansRecherche.length > 0 && !travail && (
              <button onClick={chercherRestants} style={bouton("#fff", C.primary, C.primary)}>Chercher automatiquement ({sansRecherche.length})</button>
            )}
          </div>
          {aTrouver.map(s => {
            const lead = {
              id: s.id, nom: s.nom, adresse: s.adresse, commune: s.commune, effectif: s.effectif,
              faits: { siren: s.siren, raison_sociale: s.raison_sociale, date_creation: s.date_creation, ca: s.ca, ca_annee: s.ca_annee, dirigeant_prenom: s.dirigeant_prenom, dirigeant_nom: s.dirigeant_nom },
            };
            return (
              <Lead key={s.id} lead={lead} envoyer={telephone => envoyer(lead, { telephone })}
                onAjoute={() => { onSortis(); recharger(); auSuivant(); }}
                onEcarter={async () => { const refus = await envoyer(lead, { ecarter: true }); if (refus) setErreur(refus); recharger(); auSuivant(); }} />
            );
          })}
        </>
      )}
    </div>
  );
}
