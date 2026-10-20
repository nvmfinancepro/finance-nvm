import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Désactiver ou réactiver l'accès d'un setter, réservé à l'admin de la plateforme (même schéma
// que /api/create-setter). Désactivé : rôle SETTER_INACTIF (migration 044), ce qui coupe tout
// accès aux données tout de suite, et connexion bloquée côté Supabase Auth. Son historique
// (prospects, appels, RDV, commissions) reste visible pour l'admin.
export async function POST(req: NextRequest) {
  const { id, actif } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof actif !== "boolean") {
    return NextResponse.json({ error: "Setter et action requis" }, { status: 400 });
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

  // Seul un compte setter (actif ou non) peut passer par ici, jamais un client ou un admin.
  const { data: profil, error: e1 } = await supabaseAdmin.from("profiles")
    .update(actif ? { role: "SETTER", desactive_le: null } : { role: "SETTER_INACTIF", desactive_le: new Date().toISOString() })
    .eq("id", id).in("role", ["SETTER", "SETTER_INACTIF"])
    .select("id, role, desactive_le").maybeSingle();
  if (e1) return NextResponse.json({ error: "Modification impossible" }, { status: 500 });
  if (!profil) return NextResponse.json({ error: "Setter introuvable" }, { status: 404 });

  // Connexion bloquée (environ 100 ans) ou rétablie. Le rôle suffit déjà à couper l'accès aux données.
  const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: actif ? "none" : "876000h" });
  if (e2) return NextResponse.json({ error: actif ? "Accès rétabli, mais la connexion reste bloquée : réessayez" : "Accès aux données coupé, mais la connexion n'est pas bloquée : réessayez" }, { status: 500 });

  return NextResponse.json({ success: true, profil });
}
