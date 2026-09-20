import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("stripe webhook: signature invalide", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email;
  const plan = session.metadata?.plan;
  const companyName = session.custom_fields?.find(f => f.key === "company_name")?.text?.value;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!email || !plan) {
    console.error("stripe webhook: email ou plan manquant sur la session", session.id);
    return NextResponse.json({ error: "Données de session incomplètes" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  // Un client qui a déjà un compte (ex: ajoute un module en plus) : on met juste
  // à jour son suivi Stripe/plan, sans ré-inviter — il a déjà ses accès.
  const { data: existingClient } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingClient) {
    await supabaseAdmin
      .from("clients")
      .update({ plan, stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubscriptionId })
      .eq("id", existingClient.id);
    return NextResponse.json({ received: true, clientId: existingClient.id, updated: true });
  }

  const { data: newClient, error: clientError } = await supabaseAdmin
    .from("clients")
    .insert({
      name: companyName || "Nouveau client",
      sector: "Non renseigné",
      manager: "A définir",
      since: String(new Date().getFullYear()),
      email,
      plan,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .select("id")
    .single();

  if (clientError || !newClient) {
    console.error("stripe webhook: création client échouée", clientError);
    return NextResponse.json({ error: "Création du client échouée" }, { status: 500 });
  }

  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { clientId: newClient.id, name: companyName, role: "CLIENT" },
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nvm-finance.fr") + "/set-password",
  });

  if (inviteError) {
    console.error("stripe webhook: invitation échouée", inviteError);
    return NextResponse.json({ error: "Invitation échouée" }, { status: 500 });
  }

  // Même raisonnement que /api/invite : le trigger handle_new_user ne fait plus
  // confiance aux métadonnées d'inscription, donc c'est ici (déjà authentifié via
  // la signature Stripe vérifiée ci-dessus) qu'on attribue rôle et rattachement.
  if (invited.user?.id) {
    await supabaseAdmin
      .from("profiles")
      .update({ role: "CLIENT", client_id: newClient.id, name: companyName })
      .eq("id", invited.user.id);
  }

  return NextResponse.json({ received: true, clientId: newClient.id, userId: invited.user?.id });
}
