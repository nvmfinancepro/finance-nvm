import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { cleRecherche } from "@/lib/setter-secteurs";

// Historique des recherches Google Maps (migration 040), partagé entre setters.
// GET : chaque recherche déjà faite, tous setters confondus (dernière date, nombre de fois,
// qualifiés trouvés) et si l'appelant l'a faite lui-même — jamais le nom d'un autre setter.
// POST : note l'import qui vient de se terminer, même s'il n'a rien apporté de nouveau.
export async function GET(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;

  const lignes: { setter_id: string | null; recherche: string; cle: string; faite_le: string; qualifies: number; nouveaux: number }[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await auth.admin.from("setter_recherches")
      .select("setter_id, recherche, cle, faite_le, qualifies, nouveaux")
      .order("id").range(debut, debut + 999);
    if (error) return NextResponse.json({ error: "Historique des recherches indisponible" }, { status: 500 });
    lignes.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const parCle = new Map<string, { cle: string; recherche: string; derniere: string; fois: number; qualifies: number; nouveaux: number; parMoi: boolean }>();
  for (const l of lignes) {
    const r = parCle.get(l.cle) || { cle: l.cle, recherche: l.recherche, derniere: l.faite_le, fois: 0, qualifies: 0, nouveaux: 0, parMoi: false };
    r.fois++;
    r.qualifies += l.qualifies;
    r.nouveaux += l.nouveaux;
    if (l.setter_id === auth.setterId) r.parMoi = true;
    if (l.faite_le > r.derniere) { r.derniere = l.faite_le; r.recherche = l.recherche; }
    parCle.set(l.cle, r);
  }
  return NextResponse.json({ recherches: [...parCle.values()] });
}

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;

  const corps = await req.json().catch(() => ({}));
  const recherche = typeof corps.recherche === "string" ? corps.recherche.trim().slice(0, 200) : "";
  if (!recherche) return NextResponse.json({ error: "Recherche manquante" }, { status: 400 });
  const nombre = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100000 ? (v as number) : 0);

  const { error } = await auth.admin.from("setter_recherches").insert({
    setter_id: auth.setterId,
    recherche,
    cle: cleRecherche(recherche),
    lignes: nombre(corps.lignes),
    nouveaux: nombre(corps.nouveaux),
    qualifies: nombre(corps.qualifies),
    a_verifier: nombre(corps.a_verifier),
    doublons: nombre(corps.doublons),
  });
  if (error) return NextResponse.json({ error: "Recherche non enregistrée" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
