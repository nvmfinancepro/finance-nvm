import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { raisonHorsCible } from "@/lib/setter-import";

// « Revérifier » un prospect « à vérifier » (par exemple si la base officielle était en panne
// pendant l'import) : la page refait la recherche, le serveur applique la cible et l'anti-doublon
// par SIREN sur toute la base, comme à l'import.

type Brut = Record<string, unknown>;
const texte = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const nombre = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
const faits = (e: Brut) => ({
  siren: typeof e.siren === "string" && /^\d{9}$/.test(e.siren) ? e.siren : null,
  raison_sociale: texte(e.raison_sociale),
  nature_juridique: texte(e.nature_juridique, 10),
  date_creation: typeof e.date_creation === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date_creation) ? e.date_creation : null,
  etat_administratif: texte(e.etat_administratif, 2),
  ca: nombre(e.ca) != null ? Math.round(nombre(e.ca) as number) : null,
  ca_annee: nombre(e.ca_annee),
  dirigeant_prenom: texte(e.dirigeant_prenom, 80),
  dirigeant_nom: texte(e.dirigeant_nom, 120),
  effectif: texte(e.effectif, 4),
  categorie_entreprise: texte(e.categorie_entreprise, 4),
  activite: texte(e.activite, 10),
});

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const corps = await req.json().catch(() => ({}));
  const id = Number(corps.id);
  const { data: p } = await admin.from("setter_prospects").select("*").eq("id", id).eq("setter_id", setterId).maybeSingle();
  if (!p) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  if (p.verification !== "a_verifier") return NextResponse.json({ prospect: p });

  const e = corps.certain && corps.entreprise && typeof corps.entreprise === "object" ? faits(corps.entreprise as Brut) : null;
  let maj: Record<string, unknown>;
  if (!e?.siren) {
    // Toujours pas retrouvée avec certitude : on garde seulement la nouvelle proposition.
    const prop = corps.proposition && typeof corps.proposition === "object" ? corps.proposition as Brut : null;
    maj = { proposition: prop ? { ...faits(prop), commune: texte(prop.commune, 80), distance_km: nombre(prop.distance_km) } : p.proposition };
  } else {
    const { data: pris } = await admin.from("setter_prospects").select("id").eq("siren", e.siren).neq("id", id).limit(1);
    if (pris?.length) {
      maj = { verification: "rejete", raison_rejet: "Déjà dans l'outil" };
    } else {
      const raison = raisonHorsCible(e);
      maj = {
        siren: e.siren, raison_sociale: e.raison_sociale, nature_juridique: e.nature_juridique,
        date_creation: e.date_creation, ca: e.ca, ca_annee: e.ca_annee, effectif: e.effectif,
        // Ce que le setter a déjà saisi sur le dirigeant passe avant la base officielle.
        dirigeant_prenom: p.dirigeant_prenom || e.dirigeant_prenom,
        dirigeant_nom: p.dirigeant_nom || e.dirigeant_nom,
        verification: raison ? "rejete" : "qualifie",
        raison_rejet: raison,
        proposition: null,
      };
    }
  }
  let { data, error } = await admin.from("setter_prospects").update(maj).eq("id", id).select("*").single();
  if (error?.code === "23505") {
    // Un autre setter vient d'enregistrer la même entreprise.
    ({ data, error } = await admin.from("setter_prospects").update({ verification: "rejete", raison_rejet: "Déjà dans l'outil" }).eq("id", id).select("*").single());
  }
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ prospect: data });
}
