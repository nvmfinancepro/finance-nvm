import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { IDS_SECTEURS_STOCK, LEADS_PAR_CLIC, MAX_EN_ATTENTE, RE_DEPARTEMENT } from "@/lib/setter-stock";

// « Sortir des leads » : un paquet de leads libres du stock du département, d'un métier ou de
// tous (« aléatoire »), part chez le setter (fonction SQL setter_sortir_leads, migration 042 :
// chaque lead à un seul setter, même si deux setters cliquent au même moment). Avec numéro, le
// lead entre dans sa file d'appels ; sans numéro, il attend que le setter le trouve. Refusé tant
// que le setter a déjà beaucoup de leads en attente (jamais appelés ou numéro à trouver).
export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const { departement, secteur, zone } = await req.json().catch(() => ({}));
  if (typeof departement !== "string" || !RE_DEPARTEMENT.test(departement) || (secteur !== "aleatoire" && !IDS_SECTEURS_STOCK.includes(secteur))) {
    return NextResponse.json({ error: "Demande invalide" }, { status: 400 });
  }

  const [jamaisAppeles, aTrouver] = await Promise.all([
    admin.from("setter_prospects").select("id", { count: "exact", head: true })
      .eq("setter_id", setterId).eq("verification", "qualifie").eq("statut", "a_appeler"),
    admin.from("setter_stock").select("id", { count: "exact", head: true })
      .eq("setter_id", setterId).eq("statut", "sorti").is("telephone", null),
  ]);
  if (jamaisAppeles.error || aTrouver.error) return NextResponse.json({ error: "Stock de leads indisponible" }, { status: 500 });
  const enAttente = (jamaisAppeles.count || 0) + (aTrouver.count || 0);
  if (enAttente >= MAX_EN_ATTENTE) {
    return NextResponse.json({ error: `Vous avez déjà ${enAttente} leads en attente (jamais appelés ou numéro à trouver) : traitez-les d'abord.` }, { status: 409 });
  }

  const { data, error } = await admin.rpc("setter_sortir_leads", {
    p_setter: setterId,
    p_departement: departement,
    p_secteurs: secteur === "aleatoire" ? IDS_SECTEURS_STOCK : [secteur],
    p_nombre: LEADS_PAR_CLIC,
    p_zone: typeof zone === "string" && zone.trim() ? zone.trim().slice(0, 80) : departement,
  });
  if (error) return NextResponse.json({ error: "Sortie des leads impossible" }, { status: 500 });
  return NextResponse.json(data);
}
