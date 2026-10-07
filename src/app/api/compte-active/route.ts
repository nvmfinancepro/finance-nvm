import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyWhatsApp } from "@/lib/whatsapp";

// Appelée juste après qu'un client (ou un cabinet) invité a défini son mot de
// passe : prévient Nathan sur WhatsApp que le compte est activé. Une seule fois
// par compte (drapeau activationNotifiee dans les métadonnées), et seulement si
// l'email vient d'être confirmé par le lien d'invitation : un simple changement
// de mot de passe plus tard ne déclenche rien.

const FENETRE_MS = 24 * 3600_000;

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const meta = user.user_metadata || {};
  const confirme = user.email_confirmed_at ? Date.parse(user.email_confirmed_at) : 0;
  if (meta.activationNotifiee || !confirme || Date.now() - confirme > FENETRE_MS) {
    return NextResponse.json({ ok: true, notified: false });
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("role, client_id, cabinet_id, name").eq("id", user.id).maybeSingle();
  let nom = profile?.name || meta.name || "";
  if (profile?.client_id) {
    const { data: client } = await supabaseAdmin.from("clients").select("name").eq("id", profile.client_id).maybeSingle();
    if (client?.name) nom = client.name;
  } else if (profile?.cabinet_id) {
    const { data: cabinet } = await supabaseAdmin.from("cabinets").select("name").eq("id", profile.cabinet_id).maybeSingle();
    if (cabinet?.name) nom = `Cabinet ${cabinet.name}`;
  }
  const clean = (s: string) => String(s || "").replace(/[\r\n]+/g, " ").slice(0, 120);

  await notifyWhatsApp(`Compte activé : ${clean(nom) || "client"}\nEmail : ${clean(user.email || "")}\nLe client vient de créer son mot de passe et peut se connecter à son espace.`);
  await supabaseAdmin.auth.admin.updateUserById(user.id, { user_metadata: { ...meta, activationNotifiee: true } });

  return NextResponse.json({ ok: true, notified: true });
}
