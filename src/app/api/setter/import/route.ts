import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { normaliserTelephone, raisonHorsCible } from "@/lib/setter-import";

// Enregistre les prospects d'un import (par paquets de 200 au plus). La page a déjà lu le
// fichier et interrogé la base officielle ; ici on refait le calcul de la cible, on écarte les
// doublons sur toute la base (téléphone puis SIREN, tous setters confondus — sans dire à qui
// ils appartiennent) et on enregistre le reste au nom du setter.

type Brut = Record<string, unknown>;
type Resultat = { telephone: string | null; statut: string; raison: string | null; aInserer?: boolean };

const texte = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const nombre = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
const siren = (v: unknown) => (typeof v === "string" && /^\d{9}$/.test(v) ? v : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const url = (v: unknown) => { const t = texte(v, 2000); return t && /^https?:\/\//i.test(t) ? t : null; };
const email = (v: unknown) => { const t = texte(v, 200); return t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null; };

function faits(e: Brut) {
  return {
    siren: siren(e.siren),
    raison_sociale: texte(e.raison_sociale),
    nature_juridique: texte(e.nature_juridique, 10),
    date_creation: date(e.date_creation),
    etat_administratif: texte(e.etat_administratif, 2),
    ca: nombre(e.ca) != null ? Math.round(nombre(e.ca) as number) : null,
    ca_annee: nombre(e.ca_annee),
    dirigeant_prenom: texte(e.dirigeant_prenom, 80),
    dirigeant_nom: texte(e.dirigeant_nom, 120),
    effectif: texte(e.effectif, 4),
    categorie_entreprise: texte(e.categorie_entreprise, 4),
    activite: texte(e.activite, 10),
  };
}

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const { prospects } = await req.json().catch(() => ({}));
  if (!Array.isArray(prospects) || !prospects.length || prospects.length > 200) {
    return NextResponse.json({ error: "Envoyez entre 1 et 200 prospects" }, { status: 400 });
  }

  // 1. Mise en forme + cible, recalculée ici (on ne se fie pas au navigateur pour le verdict).
  const lignes = (prospects as Brut[]).map(p => {
    const telephone = normaliserTelephone(p.telephone);
    const e = p.certain && p.entreprise && typeof p.entreprise === "object" ? faits(p.entreprise as Brut) : null;
    const certain = !!e?.siren;
    const raison = certain ? raisonHorsCible(e) : null;
    const prop = !certain && p.proposition && typeof p.proposition === "object" ? p.proposition as Brut : null;
    // Ajout à la main : le setter connaît l'entreprise, il la qualifie lui-même s'il ne l'a pas
    // retrouvée dans la base officielle (comme « Valider » un « à vérifier »). Ce qu'il a saisi
    // sur le dirigeant passe avant la base officielle.
    const manuel = p.manuel === true;
    const source = manuel ? "manuel" : p.source === "base" ? "base" : "maps";
    return {
      telephone,
      ligne: {
        setter_id: setterId,
        nom: texte(p.nom, 200) || texte(p.nom_maps, 200) || "Sans nom",
        nom_maps: texte(p.nom_maps, 300),
        categorie: texte(p.categorie, 120),
        telephone,
        site_web: url(p.site_web),
        maps_url: url(p.maps_url),
        latitude: nombre(p.latitude),
        longitude: nombre(p.longitude),
        siren: certain ? e!.siren : null,
        raison_sociale: certain ? e!.raison_sociale : null,
        nature_juridique: certain ? e!.nature_juridique : null,
        date_creation: certain ? e!.date_creation : null,
        ca: certain ? e!.ca : null,
        ca_annee: certain ? e!.ca_annee : null,
        effectif: certain ? e!.effectif : null,
        dirigeant_prenom: (manuel && texte(p.dirigeant_prenom, 80)) || (certain ? e!.dirigeant_prenom : null),
        dirigeant_nom: (manuel && texte(p.dirigeant_nom, 120)) || (certain ? e!.dirigeant_nom : null),
        email_dirigeant: manuel ? email(p.email_dirigeant) : null,
        note: manuel ? texte(p.note, 2000) : null,
        verification: !certain ? (manuel ? "qualifie" : "a_verifier") : raison ? "rejete" : "qualifie",
        source,
        recherche: texte(p.recherche, 160),
        raison_rejet: raison,
        proposition: prop ? { ...faits(prop), commune: texte(prop.commune, 80), distance_km: nombre(prop.distance_km) } : null,
      },
    };
  });

  // 2. Doublons déjà dans l'outil, par téléphone puis par SIREN.
  const telephones = lignes.map(l => l.telephone).filter(Boolean) as string[];
  const sirens = lignes.map(l => l.ligne.siren).filter(Boolean) as string[];
  const [{ data: telsPris, error: e1 }, { data: sirensPris, error: e2 }] = await Promise.all([
    telephones.length ? admin.from("setter_prospects").select("telephone").in("telephone", telephones) : Promise.resolve({ data: [], error: null }),
    sirens.length ? admin.from("setter_prospects").select("siren").in("siren", sirens) : Promise.resolve({ data: [], error: null }),
  ]);
  if (e1 || e2) return NextResponse.json({ error: "Vérification des doublons impossible" }, { status: 500 });
  const telsVus = new Set((telsPris || []).map(r => r.telephone));
  const sirensVus = new Set((sirensPris || []).map(r => r.siren));

  const resultats: Resultat[] = lignes.map(l => {
    if (!l.telephone) return { telephone: null, statut: "rejete", raison: "Pas de téléphone" };
    if (telsVus.has(l.telephone) || (l.ligne.siren && sirensVus.has(l.ligne.siren))) {
      return { telephone: l.telephone, statut: "doublon", raison: "Déjà dans l'outil" };
    }
    telsVus.add(l.telephone);
    if (l.ligne.siren) sirensVus.add(l.ligne.siren);
    return { telephone: l.telephone, statut: l.ligne.verification, raison: l.ligne.raison_rejet, aInserer: true };
  });

  // 3. Enregistrement. Si un autre setter a importé le même prospect entre-temps (contrainte
  // d'unicité), on repasse ligne par ligne pour ne marquer en doublon que celles-là.
  const aInserer = lignes.filter((_, i) => resultats[i].aInserer);
  const { error } = aInserer.length ? await admin.from("setter_prospects").insert(aInserer.map(l => l.ligne)) : { error: null };
  if (error) {
    if (error.code !== "23505") return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
    for (let i = 0; i < lignes.length; i++) {
      if (!resultats[i].aInserer) continue;
      const { error: e } = await admin.from("setter_prospects").insert(lignes[i].ligne);
      if (e?.code === "23505") resultats[i] = { telephone: lignes[i].telephone, statut: "doublon", raison: "Déjà dans l'outil" };
      else if (e) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
    }
  }

  return NextResponse.json({ resultats: resultats.map(r => ({ telephone: r.telephone, statut: r.statut, raison: r.raison })) });
}
