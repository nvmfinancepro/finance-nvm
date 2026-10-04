import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyWhatsApp } from "@/lib/whatsapp";

// Bouton « Demander à mon conseiller » sur les fonctions floutées du tableau de
// bord gratuit : prévient Nathan sur WhatsApp avec l'entreprise et le sujet.

// Anti-spam best-effort par instance : 5 demandes / heure / utilisateur,
// et une seule par sujet toutes les 10 minutes.
const hits = new Map<string, { t: number; topic: string }[]>();

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
  const { data: { user: caller } } = await supabaseAuth.auth.getUser(token);
  if (!caller) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic || "").replace(/[\r\n]+/g, " ").trim().slice(0, 80) || "Non précisé";

  const now = Date.now();
  const recent = (hits.get(caller.id) || []).filter(h => now - h.t < 3600_000);
  if (recent.some(h => h.topic === topic && now - h.t < 600_000)) {
    return NextResponse.json({ ok: true, alreadySent: true });
  }
  if (recent.length >= 5) {
    return NextResponse.json({ error: "Vous avez déjà envoyé plusieurs demandes, votre conseiller revient vers vous rapidement." }, { status: 429 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
  const { data: profile } = await supabaseAdmin.from("profiles").select("role, client_id").eq("id", caller.id).maybeSingle();
  if (profile?.role !== "CLIENT" || !profile.client_id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { data: client } = await supabaseAdmin.from("clients").select("name, email").eq("id", profile.client_id).maybeSingle();
  const phone = typeof caller.user_metadata?.phone === "string" ? caller.user_metadata.phone : "non renseigné";

  recent.push({ t: now, topic });
  hits.set(caller.id, recent);

  const sent = await notifyWhatsApp(
    `Demande conseiller\nEntreprise : ${client?.name || "?"}\nSujet : ${topic}\nTél : ${phone}\nEmail : ${client?.email || caller.email}`
  );
  if (!sent) return NextResponse.json({ error: "La demande n'a pas pu être envoyée, réessayez." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
