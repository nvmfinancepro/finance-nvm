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
    const { description } = await req.json();
    if (!description) return NextResponse.json({ error: "Description requise" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Aujourd'hui nous sommes le ${today}. Voici la description libre d'une tâche donnée par un utilisateur : "${description}". Retourne UNIQUEMENT ce JSON sans texte autour ni backticks : {"titre":"titre court de la tâche","description":"description détaillée reformulée","echeance":"YYYY-MM-DD ou null si aucune date n'est mentionnée ou déductible"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          { role: "system", content: "Tu es un assistant qui structure des tâches à partir d'une description libre. Reponds UNIQUEMENT avec du JSON valide, sans texte avant ni après, sans backticks." },
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
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("PARSE ERROR:", e, "TEXT:", text.slice(0, 300));
      return NextResponse.json({ error: "Format JSON invalide", raw: text }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ROUTE ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur : " + message }, { status: 500 });
  }
}
