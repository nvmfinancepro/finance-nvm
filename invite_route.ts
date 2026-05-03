import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, clientId, name } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { clientId, name, role: "CLIENT" },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://nvm-finance.vercel.app") + "/set-password",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, userId: data.user?.id });
}
