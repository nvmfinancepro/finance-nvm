import { NextRequest, NextResponse } from "next/server";

// Cette route est côté serveur — la clé API Anthropic ne jamais exposée au client
export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt) return NextResponse.json({ error: "Prompt requis" }, { status: 400 });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const text = data.content?.map((b: { type: string; text?: string }) => b.text ?? "").join("") ?? "";
  return NextResponse.json({ text });
}
