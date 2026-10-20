import { SupabaseClient } from "@supabase/supabase-js";
import { ficheCorrespond, normaliserTelephone } from "@/lib/setter-import";

// Recherche automatique du numéro d'un lead du stock sorti sans numéro (serveur seulement : les
// clés TomTom et Google ne quittent pas le serveur). TomTom d'abord, Google Maps si TomTom n'a
// rien ; un numéro n'est gardé que si la fiche est bien l'entreprise (ficheCorrespond : même nom,
// même adresse). Mesuré sur 99 vrais leads sans numéro : Google 40, TomTom 26, les deux 46 ;
// même numéro dans 17 cas sur 20 quand les deux répondent.

// Plafonds pour rester gratuit : TomTom 2 500 recherches par jour, Google 1 000 par mois.
export const TOMTOM_MAX_PAR_JOUR = 2000;
export const GOOGLE_MAX_PAR_MOIS = 700;

type Fiche = { nom: string; latitude: number; longitude: number; tel: string | null; ferme?: boolean };
export type LigneStock = {
  id: number; nom: string; raison_sociale: string | null; commune: string | null; latitude: number | null; longitude: number | null;
  metier: string | null; telephone: string | null; site_web: string | null; siren: string; nature_juridique: string | null;
  date_creation: string | null; ca: number | null; ca_annee: number | null; effectif: string | null;
  dirigeant_prenom: string | null; dirigeant_nom: string | null; email: string | null; recherche: string | null;
};

async function fichesTomtom(l: LigneStock): Promise<Fiche[]> {
  const p = new URLSearchParams({ key: process.env.TOMTOM_API_KEY as string, countrySet: "FR", language: "fr-FR", limit: "5", idxSet: "POI" });
  p.set("lat", String(l.latitude)); p.set("lon", String(l.longitude)); p.set("radius", "3000");
  const rep = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(`${l.nom} ${l.commune || ""}`.trim())}.json?${p}`);
  if (!rep.ok) return [];
  const json = await rep.json();
  return (json.results || []).map((x: { poi?: { name?: string; phone?: string }; position?: { lat: number; lon: number } }) =>
    ({ nom: x.poi?.name || "", latitude: x.position?.lat, longitude: x.position?.lon, tel: x.poi?.phone || null }));
}

async function fichesGoogle(l: LigneStock): Promise<Fiche[]> {
  const rep = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY as string,
      "X-Goog-FieldMask": "places.displayName,places.location,places.nationalPhoneNumber,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: `${l.nom} ${l.commune || ""}`.trim(), languageCode: "fr", regionCode: "FR", pageSize: 5,
      locationBias: { circle: { center: { latitude: l.latitude, longitude: l.longitude }, radius: 2000 } },
    }),
  });
  if (!rep.ok) return [];
  const json = await rep.json();
  return (json.places || []).map((x: { displayName?: { text?: string }; location?: { latitude: number; longitude: number }; nationalPhoneNumber?: string; businessStatus?: string }) =>
    ({ nom: x.displayName?.text || "", latitude: x.location?.latitude, longitude: x.location?.longitude, tel: x.nationalPhoneNumber || null, ferme: x.businessStatus === "CLOSED_PERMANENTLY" }));
}

// Le numéro de la fiche la plus ressemblante parmi celles qui sont bien l'entreprise.
function numeroCoherent(l: LigneStock, fiches: Fiche[]) {
  const lead = { nom: l.nom, raison_sociale: l.raison_sociale, commune: l.commune, latitude: l.latitude, longitude: l.longitude };
  const bonnes = fiches.filter(f => f.tel && !f.ferme)
    .map(f => ({ f, c: ficheCorrespond(lead, f) as { ok: boolean; sim: number; distance: number } }))
    .filter(x => x.c.ok)
    .sort((a, b) => b.c.sim - a.c.sim || a.c.distance - b.c.distance);
  return bonnes.length ? normaliserTelephone(bonnes[0].f.tel) : null;
}

// Combien d'appels TomTom aujourd'hui et Google ce mois-ci (tous setters confondus).
export async function quotasRestants(admin: SupabaseClient) {
  const jour = new Date(); jour.setHours(0, 0, 0, 0);
  const mois = new Date(jour); mois.setDate(1);
  const [t, g] = await Promise.all([
    admin.from("setter_stock").select("id", { count: "exact", head: true }).gte("numero_cherche_le", jour.toISOString()),
    admin.from("setter_stock").select("id", { count: "exact", head: true }).gte("google_le", mois.toISOString()),
  ]);
  if (t.error || g.error) throw new Error("Quotas illisibles");
  return { tomtom: TOMTOM_MAX_PAR_JOUR - (t.count || 0), google: GOOGLE_MAX_PAR_MOIS - (g.count || 0) };
}

// Cherche le numéro d'un lead. quotas est décrémenté à chaque appel. Renvoie le numéro trouvé
// (format +33…) et sa source, ou null ; google : Google a été interrogé.
export async function chercherNumero(l: LigneStock, quotas: { tomtom: number; google: number }) {
  if (l.latitude == null || l.longitude == null) return { telephone: null, source: null, google: false };
  if (process.env.TOMTOM_API_KEY && quotas.tomtom > 0) {
    quotas.tomtom--;
    const tel = numeroCoherent(l, await fichesTomtom(l).catch(() => []));
    if (tel) return { telephone: tel, source: "tomtom" as const, google: false };
  }
  if (process.env.GOOGLE_PLACES_API_KEY && quotas.google > 0) {
    quotas.google--;
    const tel = numeroCoherent(l, await fichesGoogle(l).catch(() => []));
    return { telephone: tel, source: tel ? "google" as const : null, google: true };
  }
  return { telephone: null, source: null, google: false };
}

// Le lead (sorti au setter, sans numéro) entre dans sa file d'appels avec ce numéro. Renvoie
// « doublon » si le numéro ou l'entreprise est déjà dans l'outil (le lead est alors retiré).
export async function ajouterDepuisStock(admin: SupabaseClient, setterId: string, s: LigneStock, telephone: string) {
  const { error } = await admin.from("setter_prospects").insert({
    setter_id: setterId,
    nom: s.nom,
    categorie: s.metier,
    telephone,
    site_web: s.site_web,
    latitude: s.latitude,
    longitude: s.longitude,
    siren: s.siren,
    raison_sociale: s.raison_sociale,
    nature_juridique: s.nature_juridique,
    date_creation: s.date_creation,
    ca: s.ca,
    ca_annee: s.ca_annee,
    effectif: s.effectif,
    dirigeant_prenom: s.dirigeant_prenom,
    dirigeant_nom: s.dirigeant_nom,
    email_dirigeant: s.email,
    verification: "qualifie",
    source: "stock",
    recherche: s.recherche,
  });
  if (error?.code === "23505") {
    await admin.from("setter_stock").update({ statut: "deja_pris" }).eq("id", s.id);
    return "doublon";
  }
  if (error) throw error;
  await admin.from("setter_stock").update({ telephone }).eq("id", s.id);
  return "ajoute";
}
