import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { googleDisponible, lienConnexion, revoquer } from "@/lib/setter-google";

// Connexion du setter à son Google Agenda (migration 045) : GET = état de la connexion,
// POST = lien vers l'écran d'autorisation de Google, DELETE = déconnexion.

export async function GET(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  if (!googleDisponible()) return NextResponse.json({ disponible: false });
  const { data, error } = await auth.admin.from("setter_google").select("email").eq("setter_id", auth.setterId).maybeSingle();
  if (error) return NextResponse.json({ disponible: false });
  return NextResponse.json({ disponible: true, connecte: !!data, email: data?.email || null });
}

export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  if (!googleDisponible()) return NextResponse.json({ error: "Google Agenda n'est pas encore branché." }, { status: 503 });
  return NextResponse.json({ url: lienConnexion(req.nextUrl.origin, auth.setterId) });
}

// Les événements déjà posés restent dans l'agenda « Rappels NVM » du setter.
export async function DELETE(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { data } = await auth.admin.from("setter_google").select("refresh_token").eq("setter_id", auth.setterId).maybeSingle();
  if (data) await revoquer(data.refresh_token);
  const { error } = await auth.admin.from("setter_google").delete().eq("setter_id", auth.setterId);
  if (error) return NextResponse.json({ error: "Déconnexion impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
