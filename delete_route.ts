import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  // Trouver l'utilisateur dans Supabase Auth
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });

  const user = users.users.find(u => u.email === email);
  if (!user) return NextResponse.json({ success: true, message: "Utilisateur non trouvé dans Auth" });

  // Supprimer de Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
