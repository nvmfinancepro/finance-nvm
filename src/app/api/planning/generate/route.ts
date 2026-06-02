import { NextRequest, NextResponse } from "next/server";
type Employe = { prenom?: string; nom: string; poste?: string; heures_semaine: number };
export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });
    }
    const { employes, notes, mois, annee, regles } = await req.json();
    console.log("ROUTE HIT", { employes: employes?.length, mois, annee });
    if (!employes || !mois || !annee) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    const nDays = new Date(annee, mois, 0).getDate();
    const moStr = String(mois).padStart(2, "0");
    const empList = employes.map((e: Employe) => `${(e.prenom||"").trim()} ${e.nom.trim()} (${e.heures_semaine}h/sem)`).join(", ");
    const pauseInstruction = regles?.pauses
      ? `Pour chaque créneau de travail, inclure une pause dejeuner ou de milieu de journee via les champs "pause_debut" et "pause_fin" (format HH:MM, ex: "12:00" et "13:00"). Les heures de pause ne comptent pas comme heures travaillees.`
      : `Les champs pause_debut et pause_fin sont optionnels, ne les inclure que si l'employe en a une.`;
    const prompt = `Tu es un assistant RH. Genere 1 planning mensuel pour ${annee}-${moStr} (${nDays} jours) pour : ${empList}. Instructions: ${(notes||"").slice(0,800)}. ${pauseInstruction} Retourne UNIQUEMENT ce JSON sans texte autour : {"propositions":[{"resume":"description courte","planning":{"PRENOM NOM":{"${annee}-${moStr}-01":{"type":"travail","debut":"08:00","fin":"16:00","pause_debut":"12:00","pause_fin":"13:00"},"${annee}-${moStr}-02":{"type":"repos"}}}}]}`;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 8192,
        temperature: 0.1,
        messages: [
          { role: "system", content: "RÈGLE ABSOLUE : il doit toujours y avoir au minimum le nombre de personnes requis simultanément. Ne jamais mettre tous les employés en repos le même jour. Vérifier chaque jour que la couverture minimum est respectée avant de valider le planning. Tu es un assistant RH. Reponds UNIQUEMENT avec du JSON valide, sans texte avant ni apres, sans backticks." },
          { role: "user", content: prompt }
        ],
      }),
    });
    console.log("GROQ RESPONSE STATUS:", response.status);
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    console.log("GROQ RAW TEXT:", text.slice(0, 500));
    try {
      const cleaned = text.replace(/```json/g,"").replace(/```/g,"").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) return NextResponse.json({ error: "Pas de JSON", raw: text }, { status: 500 });
      const parsed = JSON.parse(cleaned.slice(start, end+1));
      if (parsed.propositions) return NextResponse.json(parsed);
      return NextResponse.json({ propositions: [{ resume: "Planning généré", planning: parsed }] });
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
