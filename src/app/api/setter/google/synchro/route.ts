import { NextRequest, NextResponse } from "next/server";
import { appelantSetter } from "@/lib/setter-auth";
import { ConnexionGoogle, GoogleDeconnecte, agendaRappels, googleDisponible, jetonAcces, synchroniserRappel } from "@/lib/setter-google";

// Après chaque résultat d'appel (ou son annulation), la page demande de mettre l'agenda Google
// d'accord avec le prospect ({ prospect: id }) ; juste après la connexion, avec tous les rappels
// à venir ({ tout: true }). Renvoie l'événement de chaque prospect traité.
export async function POST(req: NextRequest) {
  const auth = await appelantSetter(req);
  if (auth.erreur) return auth.erreur;
  const { admin, setterId } = auth;
  if (!googleDisponible()) return NextResponse.json({ connecte: false });

  const { prospect, tout } = await req.json().catch(() => ({}));
  if (!tout && !Number.isInteger(prospect)) return NextResponse.json({ error: "Prospect invalide" }, { status: 400 });

  const { data: c } = await admin.from("setter_google").select("setter_id,email,refresh_token,calendrier_id").eq("setter_id", setterId).maybeSingle<ConnexionGoogle>();
  if (!c) return NextResponse.json({ connecte: false });

  try {
    const jeton = await jetonAcces(admin, c);
    // L'agenda « Rappels NVM » a pu être supprimé par le setter : il est alors recréé.
    const calendrier = await agendaRappels(jeton, c.calendrier_id);
    if (calendrier !== c.calendrier_id) await admin.from("setter_google").update({ calendrier_id: calendrier }).eq("setter_id", setterId);

    let ids: number[] = [prospect];
    if (tout) {
      const { data, error } = await admin.from("setter_prospects").select("id").eq("setter_id", setterId)
        .eq("statut", "rappel").gt("prochain_appel", new Date().toISOString()).order("prochain_appel").limit(200);
      if (error) throw error;
      ids = (data || []).map(p => p.id);
    }
    const evenements: { id: number; google_event_id: string | null }[] = [];
    for (let i = 0; i < ids.length; i += 5) {
      const lot = ids.slice(i, i + 5);
      const res = await Promise.all(lot.map(id => synchroniserRappel(admin, c, jeton, calendrier, id)));
      lot.forEach((id, k) => evenements.push({ id, google_event_id: res[k] }));
    }
    return NextResponse.json({ connecte: true, evenements });
  } catch (e) {
    if (e instanceof GoogleDeconnecte) return NextResponse.json({ connecte: false, deconnecte: true });
    return NextResponse.json({ error: "Google Agenda ne répond pas" }, { status: 502 });
  }
}
