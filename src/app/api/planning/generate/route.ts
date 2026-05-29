import { NextRequest, NextResponse } from "next/server";
type Employe = { prenom?: string; nom: string; poste?: string; heures_semaine: number };
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquante" }, { status: 500 });
  }
  const { employes, notes, mois, annee } = await req.json();
  if (!employes || !mois || !annee) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  const moStr = String(mois).padStart(2, "0");
  const empList = employes.map((e: Employe) => `${(e.prenom||"").trim()} ${e.nom.trim()} (${e.heures_semaine}h/sem)`).join(", ");
  const userPrompt = `Planning ${annee}-${moStr} pour ${employes.length} employe(s): ${empList}. Instructions: ${(notes||"").slice(0,200)}. Genere un planning JSON complet pour tous les jours du mois. Format: {"propositions":[{"resume":"...","planning":{"PRENOM NOM":{"${annee}-${moStr}-01":{"type":"travail","debut":"08:00","fin":"16:00"}}}}]}`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 4096,
      messages: [
        { role: "system", content: "Tu es un assistant RH. Tu dois retourner UNIQUEMENT du JSON valide, rien d'autre. Pas de texte, pas de backticks, juste le JSON." },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    return NextResponse.json({ error: err }, { status: resp.status });
  }
  const data = await resp.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = text.replace(/```json/g,"").replace(/```/g,"").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return NextResponse.json({ error: "Pas de JSON", raw: text }, { status: 500 });
    const parsed = JSON.parse(cleaned.slice(start, end+1));
    if (parsed.propositions) return NextResponse.json(parsed);
    return NextResponse.json({ propositions: [{ resume: "Planning généré", planning: parsed }] });
  } catch {
    return NextResponse.json({ error: "Format JSON invalide", raw: text }, { status: 500 });
  }
}
