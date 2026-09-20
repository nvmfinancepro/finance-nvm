import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PLANS: Record<string, { name: string; amountCents: number }> = {
  dashboard: { name: "Offre Tableau de bord", amountCents: 20000 },
  finance: { name: "Offre Finance", amountCents: 49000 },
  gestion: { name: "Module Gestion", amountCents: 10000 },
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY manquante" }, { status: 500 });
    }
    const { plan } = await req.json();
    const selected = PLANS[plan];
    if (!selected) {
      return NextResponse.json({ error: "Offre inconnue" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: selected.name },
            unit_amount: selected.amountCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      // Lu par /api/webhooks/stripe pour savoir quel client_id/rôle provisionner.
      metadata: { plan },
      custom_fields: [
        {
          key: "company_name",
          label: { type: "custom", custom: "Nom de votre entreprise" },
          type: "text",
          text: { minimum_length: 1, maximum_length: 120 },
        },
      ],
      success_url: `${siteUrl}/services?checkout=success`,
      cancel_url: `${siteUrl}/services?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout:", err);
    return NextResponse.json({ error: "Erreur lors de la création du paiement" }, { status: 500 });
  }
}
