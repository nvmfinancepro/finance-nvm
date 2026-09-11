import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
    const { data: { user: caller } } = await supabaseAuth.auth.getUser(token);
    if (!caller) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });
    }
    const { theme, angle } = await req.json();
    if (!theme) return NextResponse.json({ error: "Thème requis" }, { status: 400 });

    const prompt = `Rédige un article de blog SEO en français pour NVM Finance, un logiciel de tableau de bord financier et d'outils de gestion pour PME (trésorerie, résultat, planning d'équipe, stock, notes de frais...).
Thème : ${theme}${angle ? `\nAngle demandé : ${angle}` : ""}
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
    try {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) return NextResponse.json({ error: "Pas de JSON", raw: text }, { status: 500 });
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (!parsed.title || !parsed.body) return NextResponse.json({ error: "JSON incomplet", raw: text }, { status: 500 });
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("BLOG GENERATE PARSE ERROR:", e, "TEXT:", text.slice(0, 300));
      return NextResponse.json({ error: "Format JSON invalide", raw: text }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("BLOG GENERATE ROUTE ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur : " + message }, { status: 500 });
  }
}
