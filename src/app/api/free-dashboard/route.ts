import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyWhatsApp } from "@/lib/whatsapp";
import { checkEmail, cleanPhone } from "@/lib/contact-validation";

// Inscription en libre-service au tableau de bord gratuit : crée le dossier
// client et le compte (mot de passe choisi dans le formulaire, email considéré
// comme confirmé pour un accès immédiat), puis prévient Nathan sur WhatsApp.
// Le navigateur se connecte ensuite lui-même avec ce mot de passe.
// Route publique (pas de Bearer) : protégée par un honeypot et une limite par IP.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Limite best-effort par instance serverless : 5 tentatives / heure / IP.
// Désactivée en local, où tous les essais viennent de la même IP.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  if (process.env.NODE_ENV === "development") return false;
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  // Honeypot : champ caché que seuls les robots remplissent.
  if (body.website) return NextResponse.json({ ok: true });

  const company = String(body.company || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const phone = cleanPhone(String(body.phone || "").slice(0, 25));
  const password = String(body.password || "");

  if (!company) return NextResponse.json({ error: "Le nom de l'entreprise est requis." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Numéro de téléphone invalide. Indiquez un numéro où votre conseiller peut vous joindre." }, { status: 400 });
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
  }

  const emailCheck = await checkEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.error, suggestion: emailCheck.suggestion }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  // Le compte est créé avec un email non vérifié (accès immédiat) : on refuse donc
  // toute adresse déjà connue de la plateforme. admin_users / client_users servent
  // encore à reconnaître un admin ou un client par son email (NVMFinance.jsx,
  // /api/invite, /api/delete-user…) : les laisser revendiquer serait une élévation de droits.
  const emailPattern = email.replace(/[%_\\]/g, (m) => "\\" + m); // ilike sans jokers
  const [{ data: reservedAdmin }, { data: reservedClientUser }, { data: reservedCabinet }] = await Promise.all([
    supabaseAdmin.from("admin_users").select("email").ilike("email", emailPattern).maybeSingle(),
    supabaseAdmin.from("client_users").select("email").ilike("email", emailPattern).maybeSingle(),
    supabaseAdmin.from("cabinets").select("id").ilike("email", emailPattern).maybeSingle(),
  ]);
  if (reservedAdmin || reservedClientUser || reservedCabinet) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email. Connectez-vous depuis l'espace client." }, { status: 409 });
  }

  // Déjà client : on ne recrée rien, on le renvoie vers la connexion.
  const { data: existingClient } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingClient) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email. Connectez-vous depuis l'espace client." }, { status: 409 });
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
      // Les outils de gestion sont un levier du pilotage mensuel : désactivés sur
      // le gratuit, l'admin peut les activer client par client.
      planning_enabled: false,
      conges_enabled: false,
      pointage_enabled: false,
      notes_frais_enabled: false,
      taches_enabled: false,
      equipe_taches_enabled: false,
      stock_enabled: false,
    })
    .select("id")
    .single();

  if (clientError || !newClient) {
    console.error("free-dashboard: création client échouée", clientError);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez." }, { status: 500 });
  }

  // Le téléphone n'a pas de colonne dans clients : il est gardé dans les
  // métadonnées du compte (visible dans Supabase > Authentication > Users).
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { clientId: newClient.id, name: company, role: "CLIENT", phone },
  });

  if (createError) {
    console.error("free-dashboard: création du compte échouée", createError);
    await supabaseAdmin.from("clients").delete().eq("id", newClient.id);
    const already = /already|registered|exists/i.test(createError.message || "");
    return NextResponse.json(
      { error: already ? "Un compte existe déjà avec cet email. Connectez-vous depuis l'espace client." : "Une erreur est survenue, réessayez." },
      { status: already ? 409 : 500 }
    );
  }

  // Écriture séparée et non bloquante : l'inscription doit continuer de marcher
  // même si la migration 032 (colonne phone) n'est pas encore appliquée.
  const { error: phoneError } = await supabaseAdmin.from("clients").update({ phone }).eq("id", newClient.id);
  if (phoneError) console.error("free-dashboard: téléphone non enregistré (migration 032 ?)", phoneError.message);

  // Même raisonnement que /api/invite : le trigger handle_new_user ne fait pas
  // confiance aux métadonnées, c'est ici qu'on attribue rôle et rattachement.
  if (created.user?.id) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "CLIENT", client_id: newClient.id, name: company })
      .eq("id", created.user.id);
    if (profileError) {
      console.error("free-dashboard: rattachement du profil échoué", profileError);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      await supabaseAdmin.from("clients").delete().eq("id", newClient.id);
      return NextResponse.json({ error: "Une erreur est survenue, réessayez." }, { status: 500 });
    }
  }

  // Seule la page d'atterrissage des pubs Meta envoie source="meta" : valeur fixe,
  // jamais recopiée telle quelle dans le message.
  const via = body.source === "meta" ? " (pub Meta)" : "";
  await notifyWhatsApp(`Nouveau tableau de bord gratuit${via}\nEntreprise : ${company}\nTél : ${phone}\nEmail : ${email}\nÀ appeler pour l'aider à démarrer.`);

  return NextResponse.json({ ok: true });
}
