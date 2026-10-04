import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inscription en libre-service au tableau de bord gratuit : crée le dossier
// client, invite l'utilisateur (lien pour choisir son mot de passe), puis
// prévient Nathan sur WhatsApp pour qu'il rappelle et fasse le premier import.
// Route publique (pas de Bearer) : protégée par un honeypot et une limite par IP.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ().-]{8,20}$/;

// Limite best-effort par instance serverless : 3 inscriptions / heure / IP.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 3;
}

async function notifyWhatsApp(text: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    console.error("free-dashboard: CALLMEBOT_PHONE / CALLMEBOT_APIKEY manquants, notification non envoyée");
    return;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    if (!res.ok) console.error("free-dashboard: notification WhatsApp échouée", res.status);
  } catch (err) {
    console.error("free-dashboard: notification WhatsApp échouée", err);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  // Honeypot : champ caché que seuls les robots remplissent.
  if (body.website) return NextResponse.json({ ok: true });

  const company = String(body.company || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 20);

  if (!company) return NextResponse.json({ error: "Le nom de l'entreprise est requis." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!PHONE_RE.test(phone)) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  // Déjà client : on ne recrée rien, mais Nathan est prévenu qu'il a redemandé.
  const { data: existingClient } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingClient) {
    await notifyWhatsApp(`Demande de tableau de bord (déjà client)\nEntreprise : ${company}\nTél : ${phone}\nEmail : ${email}`);
    return NextResponse.json({ ok: true });
  }

  const { data: newClient, error: clientError } = await supabaseAdmin
    .from("clients")
    .insert({
      name: company,
      sector: "Non renseigné",
      manager: "A définir",
      since: String(new Date().getFullYear()),
      email,
      plan: "dashboard",
    })
    .select("id")
    .single();

  if (clientError || !newClient) {
    console.error("free-dashboard: création client échouée", clientError);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez." }, { status: 500 });
  }

  // Le téléphone n'a pas de colonne dans clients : il est gardé dans les
  // métadonnées du compte (visible dans Supabase > Authentication > Users).
  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { clientId: newClient.id, name: company, role: "CLIENT", phone },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nvm-finance.fr") + "/set-password",
  });

  if (inviteError) {
    console.error("free-dashboard: invitation échouée", inviteError);
    await supabaseAdmin.from("clients").delete().eq("id", newClient.id);
    const already = /already|registered|exists/i.test(inviteError.message || "");
    return NextResponse.json(
      { error: already ? "Un compte existe déjà avec cet email. Connectez-vous depuis l'espace client." : "Une erreur est survenue, réessayez." },
      { status: already ? 409 : 500 }
    );
  }

  // Même raisonnement que /api/invite : le trigger handle_new_user ne fait pas
  // confiance aux métadonnées, c'est ici qu'on attribue rôle et rattachement.
  if (invited.user?.id) {
    await supabaseAdmin
      .from("profiles")
      .update({ role: "CLIENT", client_id: newClient.id, name: company })
      .eq("id", invited.user.id);
  }

  await notifyWhatsApp(`Nouveau tableau de bord gratuit\nEntreprise : ${company}\nTél : ${phone}\nEmail : ${email}\nÀ appeler pour le premier import.`);

  return NextResponse.json({ ok: true });
}
