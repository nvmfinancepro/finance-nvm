import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Création d'un compte setter, réservée à l'admin de la plateforme (même schéma que
// /api/create-cabinet) : invitation par email, puis rôle SETTER attribué ici, côté serveur.
export async function POST(req: NextRequest) {
  const { email, name } = await req.json().catch(() => ({}));
  const adresse = typeof email === "string" ? email.trim().toLowerCase() : "";
  const nom = typeof name === "string" ? name.trim().slice(0, 120) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse) || !nom) {
    return NextResponse.json({ error: "Prénom, nom et email valides requis" }, { status: 400 });
  }

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
  const { data: { user: caller } } = await supabaseAuth.auth.getUser(token);
  if (!caller) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data: isAdmin } = await supabaseAdmin.from("admin_users").select("email").eq("email", caller.email).single();
  if (!isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  // Une adresse déjà utilisée (client, cabinet…) n'est jamais transformée en setter en silence.
  const { data: existant } = await supabaseAdmin.from("profiles").select("id").eq("email", adresse).maybeSingle();
  if (existant) return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(adresse, {
    data: { role: "SETTER", name: nom },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://nvm-finance.fr") + "/set-password",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Le trigger handle_new_user ne fait pas confiance aux métadonnées d'inscription (migration 016) :
  // c'est cette route, déjà vérifiée ADMIN, qui attribue le rôle SETTER.
  if (data.user?.id) {
    const { error: e2 } = await supabaseAdmin.from("profiles")
      .update({ role: "SETTER", name: nom, client_id: null, cabinet_id: null })
      .eq("id", data.user.id);
    if (e2) return NextResponse.json({ error: "Invitation envoyée mais rôle non attribué : réessayez" }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
