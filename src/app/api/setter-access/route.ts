import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { libererLeads } from "@/lib/setter-liberer";

// Accès d'un setter, réservé à l'admin de la plateforme (même schéma que /api/create-setter).
// - desactiver : rôle SETTER_INACTIF (migration 044), ce qui coupe tout accès aux données tout de
//   suite, et connexion bloquée côté Supabase Auth. Son historique (prospects appelés, appels, RDV,
//   commissions) reste visible pour l'admin ; ses leads jamais appelés repartent pour les autres.
// - reactiver : l'inverse (les leads déjà repartis ne reviennent pas).
// - supprimer : pour un compte créé par erreur (faute de frappe dans l'e-mail), seulement s'il n'a
//   jamais passé d'appel ; sinon on le désactive, pour garder son historique.
const ACTIONS = ["desactiver", "reactiver", "supprimer"];

export async function POST(req: NextRequest) {
  const { id, action } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !ACTIONS.includes(action)) {
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

  // Seul un compte setter (actif ou non) passe par ici, jamais un client ou un admin.
  const { data: cible } = await supabaseAdmin.from("profiles").select("id, email").eq("id", id).in("role", ["SETTER", "SETTER_INACTIF"]).maybeSingle();
  if (!cible) return NextResponse.json({ error: "Setter introuvable" }, { status: 404 });

  if (action === "supprimer") {
    const [a, r] = await Promise.all([
      supabaseAdmin.from("setter_appels").select("id", { count: "exact", head: true }).eq("setter_id", id),
      supabaseAdmin.from("setter_rdv").select("id", { count: "exact", head: true }).eq("setter_id", id),
    ]);
    if (a.error || r.error) return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
    if (a.count || r.count) {
      return NextResponse.json({ error: "Ce setter a déjà passé des appels : désactivez-le plutôt, pour garder son historique." }, { status: 409 });
    }
    let liberes;
    try { liberes = await libererLeads(supabaseAdmin, id); } catch { return NextResponse.json({ error: "Suppression impossible" }, { status: 500 }); }
    // Ce qui reste à son nom (prospects rejetés à l'import) part avec le compte.
    const { error: e1 } = await supabaseAdmin.from("setter_prospects").delete().eq("setter_id", id);
    if (e1) return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
    const { error: e2 } = await supabaseAdmin.auth.admin.deleteUser(id); // le profil part avec (on delete cascade)
    if (e2) return NextResponse.json({ error: "Suppression impossible : réessayez" }, { status: 500 });
    return NextResponse.json({ success: true, liberes });
  }

  const actif = action === "reactiver";
  const { error: e1 } = await supabaseAdmin.from("profiles")
    .update(actif ? { role: "SETTER", desactive_le: null } : { role: "SETTER_INACTIF", desactive_le: new Date().toISOString() })
    .eq("id", id);
  if (e1) return NextResponse.json({ error: "Modification impossible" }, { status: 500 });

  // Connexion bloquée (environ 100 ans) ou rétablie. Le rôle suffit déjà à couper l'accès aux données.
  const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: actif ? "none" : "876000h" });
  if (e2) return NextResponse.json({ error: actif ? "Accès rétabli, mais la connexion reste bloquée : réessayez" : "Accès aux données coupé, mais la connexion n'est pas bloquée : réessayez" }, { status: 500 });

  if (actif) return NextResponse.json({ success: true });
  try {
    return NextResponse.json({ success: true, liberes: await libererLeads(supabaseAdmin, id) });
  } catch {
    return NextResponse.json({ error: "Accès coupé, mais ses leads jamais appelés n'ont pas pu repartir : réessayez" }, { status: 500 });
  }
}
