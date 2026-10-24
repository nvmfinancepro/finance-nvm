import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { agendaRappels, echangerCode, revoquer, setterDeLEtat } from "@/lib/setter-google";

// Retour de l'écran d'autorisation de Google : le setter (retrouvé grâce au « state » signé) a
// accepté ou refusé. On garde le jeton de renouvellement, on crée l'agenda « Rappels NVM », puis
// on revient sur /setter?google=ok|refuse|erreur (la page ajoute alors les rappels à venir).
export async function GET(req: NextRequest) {
  const origine = req.nextUrl.origin;
  const vers = (resultat: string) => NextResponse.redirect(`${origine}/setter?google=${resultat}`);
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return vers("refuse");
  const setterId = setterDeLEtat(q.get("state") || "");
  const code = q.get("code");
  if (!setterId || !code) return vers("erreur");

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  try {
    const { data: profil } = await admin.from("profiles").select("role").eq("id", setterId).maybeSingle();
    if (profil?.role !== "SETTER") return vers("erreur");

    const g = await echangerCode(origine, code);
    // Google laisse décocher l'accès à l'agenda sur son écran : sans lui, rien à faire.
    if (!g.accesAgenda) {
      if (g.refreshToken) await revoquer(g.refreshToken);
      return vers("refuse");
    }
    if (!g.refreshToken) return vers("erreur");

    const { data: avant } = await admin.from("setter_google").select("calendrier_id").eq("setter_id", setterId).maybeSingle();
    const calendrier = await agendaRappels(g.accessToken, avant?.calendrier_id || null);
    const { error } = await admin.from("setter_google").upsert({
      setter_id: setterId, email: g.email, refresh_token: g.refreshToken, calendrier_id: calendrier, connecte_le: new Date().toISOString(),
    });
    if (error) return vers("erreur");
    return vers("ok");
  } catch {
    return vers("erreur");
  }
}
