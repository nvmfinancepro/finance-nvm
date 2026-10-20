import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { normaliserTelephone } from "@/lib/setter-import";

// Avant d'interroger la base officielle, la page d'import demande quels téléphones sont déjà
// dans l'outil (tous setters confondus) pour ne pas les chercher pour rien ; la recherche dans
// la base officielle demande quels SIREN y sont déjà, pour ne proposer que des entreprises
// jamais prises. Réponse : les numéros et SIREN déjà présents, rien d'autre (jamais le setter).
export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;

  const { telephones = [], sirens = [] } = await req.json().catch(() => ({}));
  if (!Array.isArray(telephones) || !Array.isArray(sirens) || telephones.length > 2000 || sirens.length > 2000) {
    return NextResponse.json({ error: "Liste invalide" }, { status: 400 });
  }
  const numeros = [...new Set(telephones.map(normaliserTelephone).filter(Boolean))] as string[];
  const lesSirens = [...new Set(sirens.filter(s => typeof s === "string" && /^\d{9}$/.test(s)))] as string[];

  const chercher = async (colonne: "telephone" | "siren", valeurs: string[]) => {
    const trouves: string[] = [];
    for (let i = 0; i < valeurs.length; i += 200) {
      const { data, error } = await auth.admin.from("setter_prospects").select(colonne).in(colonne, valeurs.slice(i, i + 200));
      if (error) throw error;
      trouves.push(...(data || []).map(r => (r as Record<string, string>)[colonne]));
    }
    return trouves;
  };
  try {
    return NextResponse.json({ existants: await chercher("telephone", numeros), sirensExistants: await chercher("siren", lesSirens) });
  } catch {
    return NextResponse.json({ error: "Vérification des doublons impossible" }, { status: 500 });
  }
}
