import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
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
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        { role: "system", content: "Tu es un analyste financier senior." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ text });
}
