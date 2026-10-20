import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { LigneStock, ajouterDepuisStock, chercherNumero, quotasRestants } from "@/lib/setter-numeros";

// Recherche automatique des numéros (migration 043) pour quelques leads sortis sans numéro à
// l'appelant (la page envoie ses leads par petits paquets et affiche l'avancement). Chaque lead
// n'est cherché qu'une fois ; trouvé et cohérent, il entre dans la file d'appels, sinon il reste
// dans « Numéros à trouver ».
const PAR_PAQUET = 6;

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > PAR_PAQUET || !ids.every(Number.isInteger)) {
    return NextResponse.json({ error: `Envoyez entre 1 et ${PAR_PAQUET} leads` }, { status: 400 });
  }
  const { data: lignes, error } = await admin.from("setter_stock").select("*")
    .in("id", ids).eq("setter_id", setterId).eq("statut", "sorti").is("telephone", null).is("numero_cherche_le", null);
  if (error) return NextResponse.json({ error: "Stock de leads indisponible" }, { status: 500 });

  let quotas;
  try { quotas = await quotasRestants(admin); } catch { return NextResponse.json({ error: "Stock de leads indisponible" }, { status: 500 }); }

  // Trois à la fois : TomTom accepte 5 requêtes par seconde.
  const resultats: { id: number; trouve: boolean }[] = [];
  const file = [...(lignes || [])] as LigneStock[];
  await Promise.all([0, 1, 2].map(async () => {
    for (let l = file.shift(); l; l = file.shift()) {
      const r = await chercherNumero(l, quotas);
      await admin.from("setter_stock").update({
        numero_cherche_le: new Date().toISOString(),
        numero_source: r.source,
        ...(r.google ? { google_le: new Date().toISOString() } : {}),
      }).eq("id", l.id);
      const ajoute = r.telephone ? await ajouterDepuisStock(admin, setterId, l, r.telephone).catch(() => null) : null;
      resultats.push({ id: l.id, trouve: ajoute === "ajoute" });
    }
  }));
  return NextResponse.json({ trouves: resultats.filter(r => r.trouve).length, cherches: resultats.length });
}
