import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, name, cabinetId } = await req.json();
  if (!email || !cabinetId) return NextResponse.json({ error: "Email et cabinetId requis" }, { status: 400 });

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

  // Créer un compte cabinet est réservé à l'admin de la plateforme
  const { data: isAdmin } = await supabaseAdmin.from("admin_users").select("email").eq("email", caller.email).single();
  if (!isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { role: "CABINET", cabinetId, name },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nvm-finance.fr") + "/set-password",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Le trigger handle_new_user ne fait plus confiance aux métadonnées d'inscription
  // (faille d'escalade de privilèges) — c'est cette route, déjà vérifiée ADMIN
  // ci-dessus, qui attribue explicitement le rôle CABINET et le cabinet_id.
  if (data.user?.id) {
    await supabaseAdmin.from("profiles").update({ role: "CABINET", cabinet_id: cabinetId, name }).eq("id", data.user.id);
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
