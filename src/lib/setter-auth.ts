import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Vérifie que l'appelant des routes /api/setter/* est un SETTER connecté (Bearer, comme les
// autres routes appelées depuis un client Supabase « simple »). Renvoie l'id du setter et un
// client service role : ces routes regardent toute la base pour les doublons, tous setters
// confondus, sans jamais renvoyer à qui appartient un prospect.
export async function appelantSetter(req: NextRequest): Promise<
  { setterId: string; admin: SupabaseClient; erreur?: undefined } | { erreur: NextResponse }
> {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return { erreur: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return { erreur: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "SETTER") return { erreur: NextResponse.json({ error: "Réservé aux setters" }, { status: 403 }) };

  return { setterId: user.id, admin };
}
