import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Route dédiée à l'agent programmé (cloud routine) qui génère un brouillon
// d'article chaque semaine. Protégée par CRON_SECRET (pas par un token
// utilisateur) pour ne pas avoir à stocker de mot de passe admin ni exposer
// la clé service_role au routine programmé. N'écrit JAMAIS status='published'
// — uniquement 'draft', la publication reste une action humaine dans l'admin.
const BLOG_THEMES = [
  "Gestion de trésorerie PME",
  "Comptabilité & facturation",
  "Pilotage financier PME",
  "Automatisation & outils de gestion",
];

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function slugify(str: string) {
  return (
    (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "article"
  );
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret") || "";
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const theme = BLOG_THEMES[isoWeek(new Date()) % BLOG_THEMES.length];

    const prompt = `Rédige un article de blog SEO en français pour NVM Finance, un logiciel de tableau de bord financier et d'outils de gestion pour PME (trésorerie, résultat, planning d'équipe, stock, notes de frais...).
Thème : ${theme}
Public : dirigeants de TPE/PME (restauration, commerce, artisanat, services), pas d'experts-comptables.
Longueur : 500 à 800 mots.
Structure imposée dans le champ "body" : un paragraphe d'introduction, puis 3 à 5 sections. Chaque titre de section commence par "**" et finit par "**" sur sa propre ligne (ex: "**Pourquoi c'est important**"). Les listes utilisent des lignes commençant par "- ". Ton professionnel, concret, orienté action, pas de jargon inutile, pas de promesse chiffrée non vérifiable. Ne mentionne pas de prix. Tu peux mentionner NVM Finance une fois maximum, sans excès promotionnel.
Retourne UNIQUEMENT ce JSON, sans texte autour ni backticks : {"title":"titre accrocheur, max 70 caractères","excerpt":"résumé de 140 à 160 caractères pour la meta description","body":"le corps de l'article avec la structure demandée"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 2000,
        temperature: 0.5,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: "Tu es rédacteur SEO spécialisé en gestion financière et opérationnelle pour PME françaises. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après, sans backticks." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return NextResponse.json({ error: "Pas de JSON", raw: text }, { status: 500 });
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!parsed.title || !parsed.body) return NextResponse.json({ error: "JSON incomplet", raw: text }, { status: 500 });

    const base = slugify(parsed.title);
    let slug = base;
    let n = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing } = await supabaseAdmin.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${base}-${n}`;
      n++;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("blog_posts")
      .insert({ title: parsed.title, slug, excerpt: parsed.excerpt || "", body: parsed.body, theme, status: "draft" })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, post: inserted?.[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("BLOG CRON ROUTE ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur : " + message }, { status: 500 });
  }
}
