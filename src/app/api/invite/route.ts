import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, clientId, name } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
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
  let authorized = !!isAdmin;

  if (!authorized) {
    // Un cabinet peut inviter un client, mais uniquement pour l'un de ses propres clients
    const { data: profile } = await supabaseAdmin.from("profiles").select("role, cabinet_id").eq("id", caller.id).single();
    if (profile?.role === "CABINET" && clientId) {
      const { data: targetClient } = await supabaseAdmin.from("clients").select("cabinet_id").eq("id", clientId).single();
      if (targetClient && targetClient.cabinet_id === profile.cabinet_id) authorized = true;
    }
  }

  if (!authorized) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { clientId, name, role: "CLIENT" },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nvm-finance.fr") + "/set-password",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Le trigger handle_new_user ne fait plus confiance aux métadonnées d'inscription
  // (faille d'escalade de privilèges) — c'est cette route, déjà authentifiée et
  // autorisée ci-dessus, qui attribue explicitement le rôle et le rattachement.
  if (data.user?.id) {
    await supabaseAdmin.from("profiles").update({ role: "CLIENT", client_id: clientId, name }).eq("id", data.user.id);
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
