import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { normaliserTelephone, raisonHorsCible } from "@/lib/setter-import";
import { EFFECTIFS_CIBLE } from "@/lib/setter-secteurs";
import { IDS_SECTEURS_STOCK, RE_DEPARTEMENT, REMPLIR_APRES_JOURS } from "@/lib/setter-stock";

// Stock de leads, par département et par métier (migrations 041-042).
// GET ?departement=17 : pour chaque métier, combien de leads libres (dont avec numéro), la page
// atteinte dans la base officielle, si la liste est complète ou à reprendre ; combien sont déjà
// sortis, dont combien pour l'appelant (jamais pour quel autre setter) ; et les leads sans numéro
// réservés à l'appelant, qui attendent qu'il trouve leur numéro.
// POST : un lot que le navigateur vient de charger. On refait ici le calcul de la cible et on
// ajoute les entreprises pas encore dans le stock (une entreprise déjà présente ne bouge pas).

type Brut = Record<string, unknown>;

const texte = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const nombre = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
const siren = (v: unknown) => (typeof v === "string" && /^\d{9}$/.test(v) ? v : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const url = (v: unknown) => { const t = texte(v, 2000); return t && /^https?:\/\//i.test(t) ? t : null; };
const email = (v: unknown) => { const t = texte(v, 200); return t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null; };
const entier = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10000 ? (v as number) : null);

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

export async function GET(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const departement = req.nextUrl.searchParams.get("departement") || "";
  if (!RE_DEPARTEMENT.test(departement)) return NextResponse.json({ error: "Département invalide" }, { status: 400 });

  const [etat, zones, aTrouver] = await Promise.all([
    admin.rpc("setter_stock_etat", { p_departement: departement, p_setter: setterId }),
    admin.from("setter_stock_zones").select("secteur, rempli_le, page, fin").eq("departement", departement),
    admin.from("setter_stock")
      .select("id, secteur, nom, metier, commune, adresse, latitude, longitude, siren, raison_sociale, date_creation, ca, ca_annee, effectif, dirigeant_prenom, dirigeant_nom, sorti_le, numero_cherche_le")
      .eq("setter_id", setterId).eq("statut", "sorti").is("telephone", null).order("sorti_le").limit(200),
  ]);
  if (etat.error || zones.error || aTrouver.error) return NextResponse.json({ error: "Stock de leads indisponible" }, { status: 500 });

  const secteurs: Record<string, { libres: number; avecNumero: number; page: number; fin: boolean; aRefaire: boolean }> = {};
  for (const id of IDS_SECTEURS_STOCK) {
    const c = etat.data?.secteurs?.[id] || {};
    const z = (zones.data || []).find(x => x.secteur === id);
    secteurs[id] = {
      libres: c.libres || 0,
      avecNumero: c.avecNumero || 0,
      page: z?.page || 0,
      fin: !!z?.fin,
      aRefaire: !!z?.fin && Date.now() - new Date(z.rempli_le).getTime() >= REMPLIR_APRES_JOURS * 86400_000,
    };
  }
  return NextResponse.json({ secteurs, sortis: etat.data?.sortis || 0, mesSortis: etat.data?.mesSortis || 0, aTrouver: aTrouver.data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin } = auth;

  const { departement, secteur, depuis, page, fin, recherche, leads } = await req.json().catch(() => ({}));
  if (typeof departement !== "string" || !RE_DEPARTEMENT.test(departement) || !IDS_SECTEURS_STOCK.includes(secteur)
    || entier(depuis) == null || entier(page) == null || !Array.isArray(leads) || leads.length > 500) {
    return NextResponse.json({ error: "Lot invalide" }, { status: 400 });
  }
  const origine = secteur === "btp_rge" ? "rge" : secteur === "pharmacies" ? "finess" : "base";

  const sirensVus = new Set<string>(), telsVus = new Set<string>();
  const lignes = [];
  for (const l of leads as Brut[]) {
    const f = faits(l.faits && typeof l.faits === "object" ? l.faits as Brut : {});
    const telephone = normaliserTelephone(l.telephone);
    if (!f.siren || sirensVus.has(f.siren) || (telephone && telsVus.has(telephone))) continue;
    if (raisonHorsCible(f) || (f.ca == null && !EFFECTIFS_CIBLE.includes(f.effectif || ""))) continue;
    sirensVus.add(f.siren);
    if (telephone) telsVus.add(telephone);
    lignes.push({
      origine,
      secteur,
      departement,
      siren: f.siren,
      telephone,
      nom: texte(l.nom, 200) || f.raison_sociale || "Sans nom",
      metier: texte(l.metier, 120),
      email: email(l.email),
      site_web: url(l.site_web),
      commune: texte(l.commune, 80),
      adresse: texte(l.adresse, 300),
      latitude: nombre(l.latitude),
      longitude: nombre(l.longitude),
      raison_sociale: f.raison_sociale,
      nature_juridique: f.nature_juridique,
      date_creation: f.date_creation,
      ca: f.ca,
      ca_annee: f.ca_annee,
      effectif: f.effectif,
      dirigeant_prenom: f.dirigeant_prenom,
      dirigeant_nom: f.dirigeant_nom,
      recherche: texte(recherche, 160),
    });
  }

  if (lignes.length) {
    const { error } = await admin.from("setter_stock").upsert(lignes, { onConflict: "siren", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "Enregistrement du lot impossible" }, { status: 500 });
  }
  // Page atteinte : un lot lu depuis le début ouvre un nouveau tour (date de départ), sinon on
  // avance sans jamais reculer (deux setters peuvent charger le même lot en même temps).
  const { data: zone } = await admin.from("setter_stock_zones").select("page, rempli_le").eq("departement", departement).eq("secteur", secteur).maybeSingle();
  const nouveauTour = depuis === 0;
  const { error } = await admin.from("setter_stock_zones").upsert({
    departement,
    secteur,
    page: nouveauTour ? page : Math.max(page, zone?.page || 0),
    fin: fin === true,
    rempli_le: nouveauTour || !zone ? new Date().toISOString() : zone.rempli_le,
  }, { onConflict: "departement,secteur" });
  if (error) return NextResponse.json({ error: "Enregistrement du lot impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
