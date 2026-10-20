import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { normaliserTelephone } from "@/lib/setter-import";
import { ajouterDepuisStock } from "@/lib/setter-numeros";

// Un lead du stock sorti sans numéro (migration 042) : le setter a trouvé le numéro, le lead
// entre dans sa file d'appels ; ou il ne l'a pas trouvé, le lead est écarté (jamais reproposé).
export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;

  const { id, telephone: brut, ecarter } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Lead invalide" }, { status: 400 });

  const { data: s, error: e1 } = await admin.from("setter_stock").select("*")
    .eq("id", id).eq("setter_id", setterId).eq("statut", "sorti").is("telephone", null).maybeSingle();
  if (e1) return NextResponse.json({ error: "Stock de leads indisponible" }, { status: 500 });
  if (!s) return NextResponse.json({ error: "Ce lead n'attend plus de numéro." }, { status: 404 });

  if (ecarter === true) {
    const { error } = await admin.from("setter_stock").update({ statut: "sans_numero" }).eq("id", id);
    if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const telephone = normaliserTelephone(brut);
  if (!telephone) return NextResponse.json({ error: "Numéro français invalide." }, { status: 400 });
  try {
    // Numéro ou entreprise déjà dans l'outil (un collègue l'a importée entre-temps) : le lead est retiré.
    if (await ajouterDepuisStock(admin, setterId, s, telephone) === "doublon") {
      return NextResponse.json({ error: "Déjà dans l'outil : ce lead est retiré de votre liste." }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "Ajout impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
